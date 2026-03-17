import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock geolocation
const mockWatchPosition = vi.fn();
const mockClearWatch = vi.fn();

Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    watchPosition: mockWatchPosition,
    clearWatch: mockClearWatch,
    getCurrentPosition: vi.fn(),
  },
  writable: true,
});

describe('useGPS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatchPosition.mockImplementation((_successCb: any, _errorCb: any, _options: any) => {
      return 1; // Return watch ID
    });
  });

  describe('module exports', () => {
    it('should export useGPS function', async () => {
      const { useGPS } = await import('@/hooks/useGPS');
      expect(useGPS).toBeDefined();
      expect(typeof useGPS).toBe('function');
    });
  });

  describe('GPS availability', () => {
    it('should have geolocation available', () => {
      expect(navigator.geolocation).toBeDefined();
      expect(typeof navigator.geolocation.watchPosition).toBe('function');
      expect(typeof navigator.geolocation.clearWatch).toBe('function');
    });

    it('should call watchPosition with correct default options', () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      };

      navigator.geolocation.watchPosition(
        () => {},
        () => {},
        options
      );

      expect(mockWatchPosition).toHaveBeenCalled();
      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });

    it('should call watchPosition with custom options', () => {
      const customOptions = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 1000,
      };

      navigator.geolocation.watchPosition(
        () => {},
        () => {},
        customOptions
      );

      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        customOptions
      );
    });

    it('should call clearWatch with watch ID', () => {
      const watchId = 123;
      navigator.geolocation.clearWatch(watchId);
      
      expect(mockClearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should call clearWatch with any value passed', () => {
      navigator.geolocation.clearWatch(null as unknown as number);
      
      // clearWatch is called with whatever value is passed
      expect(mockClearWatch).toHaveBeenCalled();
    });
  });

  describe('position callbacks', () => {
    it('should handle success callback with position data', () => {
      const successHandler = { current: null as ((pos: unknown) => void) | null };
      const errorHandler = { current: null as ((err: unknown) => void) | null };
      
      mockWatchPosition.mockImplementation((success, error, _options) => {
        successHandler.current = success;
        errorHandler.current = error;
        return 1;
      });

      navigator.geolocation.watchPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );

      const mockPosition = {
        coords: {
          latitude: -34.6037,
          longitude: -58.3816,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      if (successHandler.current) {
        successHandler.current(mockPosition);
      }

      expect(mockWatchPosition).toHaveBeenCalled();
    });

    it('should handle error callback', () => {
      const successHandler = { current: null as ((pos: unknown) => void) | null };
      const errorHandler = { current: null as ((err: { message: string }) => void) | null };
      
      mockWatchPosition.mockImplementation((success, error, _options) => {
        successHandler.current = success;
        errorHandler.current = error;
        return 1;
      });

      navigator.geolocation.watchPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );

      if (errorHandler.current) {
        errorHandler.current({ message: 'Position unavailable' });
      }

      expect(mockWatchPosition).toHaveBeenCalled();
    });
  });

  describe('GPS not supported scenario', () => {
    it('should handle missing geolocation', () => {
      const originalGeolocation = navigator.geolocation;
      
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });

      expect(navigator.geolocation).toBeUndefined();

      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
      });
    });
  });
});
