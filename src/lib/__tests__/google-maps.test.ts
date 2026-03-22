import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DistanceMatrixResponse } from '../google-maps';

// Mock environment variable BEFORE importing the module
process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

// Mock fetch globally to intercept HTTP calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

import * as googleMapsModule from '../google-maps';

const { getDurationMatrix } = googleMapsModule;

// Mock the getDistanceMatrix function
const mockGetDistanceMatrix = vi.spyOn(googleMapsModule, 'getDistanceMatrix');

// Mock isGoogleMapsConfigured to control API availability
const mockIsGoogleMapsConfigured = vi.spyOn(googleMapsModule, 'isGoogleMapsConfigured');

// ────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────

function generateTestCoords(count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => [
    40.7 + (i * 0.01),  // NYC area, slight variations
    -74.0 + (i * 0.01),
  ] as [number, number]);
}

function mockSuccessResponse(originCount: number, destCount: number): DistanceMatrixResponse {
  return {
    status: 'OK',
    origin_addresses: Array(originCount).fill('Test Address'),
    destination_addresses: Array(destCount).fill('Test Address'),
    rows: Array.from({ length: originCount }, (_, i) => ({
      elements: Array.from({ length: destCount }, (_, j) => {
        // For same-size square matrices, diagonal should be 0
        // For non-square or different positions, return non-zero
        const isDiagonal = originCount === destCount && i === j;
        return {
          status: 'OK',
          duration: { value: isDiagonal ? 0 : (i + 1) * (j + 1) * 100, text: isDiagonal ? '0' : `${(i + 1) * (j + 1)} mins` },
          distance: { value: (i + 1) * (j + 1) * 1000, text: `${(i + 1) * (j + 1)} km` },
        };
      }),
    })),
  };
}

// ────────────────────────────────────────────────────────────────
// Edge Cases
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetDistanceMatrix.mockReset();
    mockIsGoogleMapsConfigured.mockReset();
    mockIsGoogleMapsConfigured.mockReturnValue(true);
  });

  it('returns empty array for empty input', async () => {
    const result = await getDurationMatrix([]);
    expect(result).toEqual([]);
    expect(mockGetDistanceMatrix).not.toHaveBeenCalled();
  });
  
  it('returns [[0]] for single coordinate', async () => {
    const result = await getDurationMatrix([[40.7, -74.0]]);
    expect(result).toEqual([[0]]);
    expect(mockGetDistanceMatrix).not.toHaveBeenCalled();
  });
  
  it('throws on invalid latitude (too high)', async () => {
    // Mock API as configured to force validation before Haversine fallback
    mockIsGoogleMapsConfigured.mockReturnValue(true);
    mockGetDistanceMatrix.mockRejectedValue(new Error('Should not be called'));
    
    await expect(
      getDurationMatrix([[999, -74.0]])
    ).rejects.toThrow('Invalid latitude 999 at index 0. Must be between -90 and 90.');
  });
  
  it('throws on invalid latitude (too low)', async () => {
    mockIsGoogleMapsConfigured.mockReturnValue(true);
    mockGetDistanceMatrix.mockRejectedValue(new Error('Should not be called'));
    
    await expect(
      getDurationMatrix([[-999, -74.0]])
    ).rejects.toThrow('Invalid latitude -999 at index 0. Must be between -90 and 90.');
  });
  
  it('throws on invalid longitude (too high)', async () => {
    mockIsGoogleMapsConfigured.mockReturnValue(true);
    mockGetDistanceMatrix.mockRejectedValue(new Error('Should not be called'));
    
    await expect(
      getDurationMatrix([[40.7, 999]])
    ).rejects.toThrow('Invalid longitude 999 at index 0. Must be between -180 and 180.');
  });
  
  it('throws on invalid longitude (too low)', async () => {
    mockIsGoogleMapsConfigured.mockReturnValue(true);
    mockGetDistanceMatrix.mockRejectedValue(new Error('Should not be called'));
    
    await expect(
      getDurationMatrix([[40.7, -999]])
    ).rejects.toThrow('Invalid longitude -999 at index 0. Must be between -180 and 180.');
  });
  
  it('handles duplicate coordinates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse(3, 3),
    } as Response);
    
    const coords: [number, number][] = [
      [40.7, -74.0],
      [40.7, -74.0],  // duplicate
      [40.8, -74.1],
    ];
    
    const result = await getDurationMatrix(coords);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────
// Fast Path (N ≤ 25)
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - Fast Path', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetDistanceMatrix.mockReset();
    mockIsGoogleMapsConfigured.mockReset();
    mockIsGoogleMapsConfigured.mockReturnValue(true);
  });
  
  it('uses single batch for N=25', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse(25, 25),
    } as Response);
    
    const coords = generateTestCoords(25);
    await getDurationMatrix(coords);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('uses single batch for N=10', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse(10, 10),
    } as Response);
    
    const coords = generateTestCoords(10);
    await getDurationMatrix(coords);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('returns correct matrix dimensions for N=20', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse(20, 20),
    } as Response);
    
    const coords = generateTestCoords(20);
    const result = await getDurationMatrix(coords);
    
    expect(result).toHaveLength(20);
    expect(result[0]).toHaveLength(20);
    expect(result[0][0]).toBe(0); // Diagonal should be 0
  });
});

// ────────────────────────────────────────────────────────────────
// 2D Batching (N > 25)
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - 2D Batching', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetDistanceMatrix.mockReset();
    mockIsGoogleMapsConfigured.mockReset();
    mockIsGoogleMapsConfigured.mockReturnValue(true);
  });

  it('uses 4 batches for N=26', async () => {
    // Mock fetch to dynamically respond based on the request
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      callCount++;
      // Extract origins and destinations from URL to determine response size
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const coords = generateTestCoords(26);
    await getDurationMatrix(coords);
    
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
  
  it('uses 4 batches for N=50 (perfect 2×2)', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const coords = generateTestCoords(50);
    await getDurationMatrix(coords);
    
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
  
  it('uses 4 batches for N=31 (reported failure case)', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const coords = generateTestCoords(31);
    const result = await getDurationMatrix(coords);
    
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(31);
    expect(result[0]).toHaveLength(31);
  });
  
  it('reconstructs matrix correctly for N=50', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const coords = generateTestCoords(50);
    const matrix = await getDurationMatrix(coords);
    
    expect(matrix).toHaveLength(50);
    expect(matrix[0]).toHaveLength(50);
    expect(matrix[0][0]).toBe(0);
    expect(matrix[49][49]).toBe(0);
    expect(matrix[0][49]).toBeGreaterThan(0); // cross-batch value
  });
  
  it('maps batch-local indices to global indices correctly for N=26', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const coords = generateTestCoords(26);
    const matrix = await getDurationMatrix(coords);
    
    // Batch 4 is origins[25] × destinations[25]
    // Should map to matrix[25][25]
    expect(matrix[25][25]).toBe(0); // Diagonal
    
    // Batch 2 is origins[0-24] × destinations[25]
    // Should map to matrix[0][25], matrix[1][25], etc.
    expect(matrix[0][25]).toBeGreaterThan(0);
    expect(matrix[24][25]).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────
// Haversine Fallback
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - Fallback Behavior', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetDistanceMatrix.mockReset();
    mockIsGoogleMapsConfigured.mockReset();
    mockIsGoogleMapsConfigured.mockReturnValue(true);
  });

  it('uses Haversine for ZERO_RESULTS elements', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        origin_addresses: ['Test 1', 'Test 2'],
        destination_addresses: ['Test 1', 'Test 2'],
        rows: [
          {
            elements: [
              { status: 'OK', duration: { value: 0, text: '0' }, distance: { value: 0, text: '0' } },
              { status: 'ZERO_RESULTS', duration: { value: 0, text: '0' }, distance: { value: 0, text: '0' } },
            ],
          },
          {
            elements: [
              { status: 'OK', duration: { value: 600, text: '10 mins' }, distance: { value: 10000, text: '10 km' } },
              { status: 'OK', duration: { value: 1200, text: '20 mins' }, distance: { value: 20000, text: '20 km' } },
            ],
          },
        ],
      }),
    } as Response);
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const coords: [number, number][] = [[40.7, -74.0], [34.0, -118.2]];
    const matrix = await getDurationMatrix(coords);
    
    expect(matrix[0][0]).toBe(0);
    expect(matrix[0][1]).toBeGreaterThan(0); // Haversine estimate
    expect(matrix[1][0]).toBe(600); // From API
    expect(matrix[1][1]).toBe(1200); // From API
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Element status ZERO_RESULTS')
    );
    
    consoleWarnSpy.mockRestore();
  });
  
  it('continues on partial batch failure', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Network error');
      }
      const urlObj = new URL(url as string);
      const origins = urlObj.searchParams.get('origins')?.split('|') || [];
      const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
      
      return {
        ok: true,
        json: async () => mockSuccessResponse(origins.length, dests.length),
      } as Response;
    });
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const coords = generateTestCoords(50);
    const matrix = await getDurationMatrix(coords);
    
    expect(matrix).toHaveLength(50);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Batch failed'),
      expect.any(Error)
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('batches failed')
    );
    
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  it('throws on complete API failure', async () => {
    mockFetch.mockRejectedValue(new Error('API unavailable'));
    
    const coords = generateTestCoords(50);
    
    await expect(getDurationMatrix(coords)).rejects.toThrow(
      'Distance Matrix API unavailable'
    );
  });
  
  it('falls back to all Haversine on fast path failure', async () => {
    mockFetch.mockRejectedValue(new Error('API unavailable'));
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const coords = generateTestCoords(10);
    const matrix = await getDurationMatrix(coords);
    
    // Should return matrix with Haversine estimates
    expect(matrix).toHaveLength(10);
    expect(matrix[0]).toHaveLength(10);
    expect(matrix[0][0]).toBe(0); // Same point
    expect(matrix[0][1]).toBeGreaterThan(0); // Haversine estimate
    
    consoleErrorSpy.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────────
// API Call Efficiency
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - API Call Efficiency', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetDistanceMatrix.mockReset();
    mockIsGoogleMapsConfigured.mockReset();
    mockIsGoogleMapsConfigured.mockReturnValue(true);
  });

  const testCases = [
    { n: 25, expected: 1 },
    { n: 26, expected: 4 },
    { n: 31, expected: 4 },
    { n: 50, expected: 4 },
    { n: 100, expected: 16 },
    { n: 300, expected: 144 },
  ];
  
  testCases.forEach(({ n, expected }) => {
    it(`uses ${expected} batches for N=${n}`, async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlObj = new URL(url as string);
        const origins = urlObj.searchParams.get('origins')?.split('|') || [];
        const dests = urlObj.searchParams.get('destinations')?.split('|') || [];
        
        return {
          ok: true,
          json: async () => mockSuccessResponse(origins.length, dests.length),
        } as Response;
      });
      
      const coords = generateTestCoords(n);
      await getDurationMatrix(coords);
      
      expect(mockFetch).toHaveBeenCalledTimes(expected);
    });
  });
  
  it('batch count matches formula: ceil(N/25)²', () => {
    testCases.forEach(({ n, expected }) => {
      const actual = Math.ceil(n / 25) ** 2;
      expect(actual).toBe(expected);
    });
  });
});
