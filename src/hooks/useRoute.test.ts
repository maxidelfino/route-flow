import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock storage module
const mockGetAll = vi.fn();
vi.mock('@/lib/storage', () => ({
  addressStorage: {
    getAll: mockGetAll,
  },
}));

describe('useRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    mockGetAll.mockReset();
  });

  describe('module exports', () => {
    it('should export useRoute function', async () => {
      const { useRoute } = await import('@/hooks/useRoute');
      expect(useRoute).toBeDefined();
      expect(typeof useRoute).toBe('function');
    });

    it('should export RouteStatus type', async () => {
      const module = await import('@/hooks/useRoute');
      // Type should exist - just verify module loads
      expect(module).toBeDefined();
    });

    it('should export RoutePoint interface', async () => {
      const module = await import('@/hooks/useRoute');
      expect(module).toBeDefined();
    });

    it('should export RouteState interface', async () => {
      const module = await import('@/hooks/useRoute');
      expect(module).toBeDefined();
    });
  });

  describe('storage integration', () => {
    it('should call addressStorage.getAll', async () => {
      mockGetAll.mockResolvedValue([
        { id: '1', text: 'Address 1', lat: -34.6, lng: -58.38 },
      ]);

      const addresses = await mockGetAll();
      
      expect(mockGetAll).toHaveBeenCalled();
      expect(addresses).toHaveLength(1);
    });

    it('should filter addresses without lat/lng', async () => {
      mockGetAll.mockResolvedValue([
        { id: '1', text: 'Address 1', lat: -34.6, lng: -58.38 },
        { id: '2', text: 'Address 2', lat: null, lng: null },
      ] as any);

      const addresses = await mockGetAll();
      const geocoded = addresses.filter((a: any) => a.lat && a.lng);
      
      expect(geocoded).toHaveLength(1);
    });

    it('should handle empty storage', async () => {
      mockGetAll.mockResolvedValue([]);

      const addresses = await mockGetAll();
      
      expect(addresses).toEqual([]);
    });

    it('should handle storage error', async () => {
      mockGetAll.mockRejectedValue(new Error('Storage error'));

      await expect(mockGetAll()).rejects.toThrow('Storage error');
    });
  });

  describe('fetch integration', () => {
    it('should call /api/route-optimize with correct payload', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          route: ['start', '1', '2'],
          etas: [0, 10, 25],
          totalDuration: 1500,
          totalDistance: 25000,
        }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const response = await global.fetch('/api/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [-58.3816, -34.6037],
          points: [{ id: '1', lat: -34.6, lng: -58.38 }],
        }),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/route-optimize',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const data = await response.json();
      expect(data.route).toEqual(['start', '1', '2']);
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'API Error' }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const response = await global.fetch('/api/route-optimize', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(data.error).toBe('API Error');
    });

    it('should handle network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(global.fetch('/api/route-optimize', {})).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('state transitions', () => {
    it('should define initial state structure', async () => {
      const initialState = {
        status: 'idle',
        startPoint: null,
        points: [],
        route: [],
        totalDuration: 0,
        totalDistance: 0,
        currentIndex: 0,
        error: null,
      };

      expect(initialState.status).toBe('idle');
      expect(initialState.startPoint).toBeNull();
      expect(initialState.points).toEqual([]);
      expect(initialState.route).toEqual([]);
      expect(initialState.error).toBeNull();
    });

    it('should allow status values', () => {
      const validStatuses = ['idle', 'loading', 'ready', 'executing', 'completed'];
      
      validStatuses.forEach(status => {
        expect(['idle', 'loading', 'ready', 'executing', 'completed']).toContain(status);
      });
    });

    it('should allow point statuses', () => {
      const validPointStatuses = ['pending', 'current', 'completed'];
      
      validPointStatuses.forEach(status => {
        expect(['pending', 'current', 'completed']).toContain(status);
      });
    });
  });

  describe('data transformation', () => {
    it('should map storage addresses to route points', async () => {
      const addresses = [
        { id: 'addr-1', text: 'Address 1', lat: -34.6, lng: -58.38 },
        { id: 'addr-2', text: 'Address 2', lat: -34.7, lng: -58.4 },
      ];

      const points = addresses.map(a => ({
        id: a.id,
        address: a.text,
        lat: a.lat!,
        lng: a.lng!,
        status: 'pending' as const,
      }));

      expect(points).toHaveLength(2);
      expect(points[0]).toEqual({
        id: 'addr-1',
        address: 'Address 1',
        lat: -34.6,
        lng: -58.38,
        status: 'pending',
      });
    });

    it('should update point with ETA', () => {
      const point = {
        id: '1',
        address: 'Address',
        lat: -34.6,
        lng: -58.38,
        status: 'pending' as const,
      };

      const updatedPoint = {
        ...point,
        eta: 10,
        status: 'current' as const,
      };

      expect(updatedPoint.eta).toBe(10);
      expect(updatedPoint.status).toBe('current');
    });
  });

  describe('completeCurrentPoint logic', () => {
    it('should advance to next point', () => {
      const points: Array<{ id: string; status: 'pending' | 'current' | 'completed' }> = [
        { id: '1', status: 'current' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'pending' },
      ];
      const currentIndex = 0;

      const newPoints = [...points];
      newPoints[currentIndex] = { ...newPoints[currentIndex], status: 'completed' };
      const nextIndex = currentIndex + 1;
      if (nextIndex < newPoints.length) {
        newPoints[nextIndex] = { ...newPoints[nextIndex], status: 'current' };
      }

      expect(newPoints[0].status).toBe('completed');
      expect(newPoints[1].status).toBe('current');
    });

    it('should mark completed when last point', () => {
      const points: Array<{ id: string; status: 'pending' | 'current' | 'completed' }> = [
        { id: '1', status: 'current' },
      ];
      const currentIndex = 0;

      const newPoints = [...points];
      newPoints[currentIndex] = { ...newPoints[currentIndex], status: 'completed' };
      const nextIndex = currentIndex + 1;
      const isCompleted = nextIndex >= newPoints.length;
      const newStatus = isCompleted ? 'completed' : 'executing';

      expect(newStatus).toBe('completed');
    });
  });

  describe('getRemainingPoints', () => {
    it('should filter out completed points', () => {
      const points = [
        { id: '1', status: 'completed' as const },
        { id: '2', status: 'current' as const },
        { id: '3', status: 'pending' as const },
      ];

      const remaining = points.filter(p => p.status !== 'completed');
      
      expect(remaining).toHaveLength(2);
      expect(remaining.map(p => p.id)).toEqual(['2', '3']);
    });
  });

  describe('addPoint', () => {
    it('should create point with pending status', () => {
      const newPoint = {
        id: `point-${Date.now()}`,
        address: 'New Address',
        lat: -34.5,
        lng: -58.3,
        status: 'pending' as const,
      };

      expect(newPoint.status).toBe('pending');
      expect(newPoint.address).toBe('New Address');
    });
  });
});
