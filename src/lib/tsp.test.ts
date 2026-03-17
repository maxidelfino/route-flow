import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ORS client
vi.mock('@/lib/ors', () => ({
  getMatrix: vi.fn().mockResolvedValue({
    durations: [
      [0, 10, 20, 30],
      [10, 0, 15, 25],
      [20, 15, 0, 10],
      [30, 25, 10, 0],
    ],
    distances: [
      [0, 5, 10, 15],
      [5, 0, 7, 12],
      [10, 7, 0, 5],
      [15, 12, 5, 0],
    ],
  }),
}));

describe('tsp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('weightedCost', () => {
    it('should calculate weighted cost with default weights', async () => {
      const { weightedCost } = await import('@/lib/tsp');
      
      // time=10, distance=5 with alpha=0.7, beta=0.3
      const cost = weightedCost(10, 5);
      
      expect(cost).toBe(10 * 0.7 + 5 * 0.3);
    });

    it('should prioritize time over distance with default weights', async () => {
      const { weightedCost } = await import('@/lib/tsp');
      
      // Same cost if time >> distance
      const cost1 = weightedCost(100, 1);
      const cost2 = weightedCost(1, 100);
      
      expect(cost1).toBeGreaterThan(cost2);
    });
  });

  describe('nearestNeighbor', () => {
    it('should return a route starting from startIndex', async () => {
      const { nearestNeighbor } = await import('@/lib/tsp');
      
      const points = [
        { id: 'a', lat: 0, lng: 0 },
        { id: 'b', lat: 0, lng: 0 },
        { id: 'c', lat: 0, lng: 0 },
        { id: 'd', lat: 0, lng: 0 },
      ];
      
      const matrix = {
        durations: [
          [0, 10, 20, 30],
          [10, 0, 15, 25],
          [20, 15, 0, 10],
          [30, 25, 10, 0],
        ],
        distances: [
          [0, 5, 10, 15],
          [5, 0, 7, 12],
          [10, 7, 0, 5],
          [15, 12, 5, 0],
        ],
      };
      
      const route = nearestNeighbor(points, 0, matrix);
      
      expect(route[0]).toBe(0); // Start at index 0
      expect(route.length).toBe(4); // Visit all points
    });

    it('should visit all points exactly once', async () => {
      const { nearestNeighbor } = await import('@/lib/tsp');
      
      const points = [
        { id: 'a', lat: 0, lng: 0 },
        { id: 'b', lat: 0, lng: 0 },
        { id: 'c', lat: 0, lng: 0 },
      ];
      
      const matrix = {
        durations: [
          [0, 10, 20],
          [10, 0, 15],
          [20, 15, 0],
        ],
        distances: [
          [0, 5, 10],
          [5, 0, 7],
          [10, 7, 0],
        ],
      };
      
      const route = nearestNeighbor(points, 0, matrix);
      const unique = new Set(route);
      
      expect(unique.size).toBe(3); // All points visited
    });
  });

  describe('twoOpt', () => {
    it('should improve or maintain route cost', async () => {
      const { twoOpt, routeCost } = await import('@/lib/tsp');
      
      const matrix = {
        durations: [
          [0, 10, 20, 30],
          [10, 0, 15, 25],
          [20, 15, 0, 10],
          [30, 25, 10, 0],
        ],
        distances: [
          [0, 5, 10, 15],
          [5, 0, 7, 12],
          [10, 7, 0, 5],
          [15, 12, 5, 0],
        ],
      };
      
      const initialRoute = [0, 1, 2, 3];
      const initialCost = routeCost(initialRoute, matrix);
      
      const optimizedRoute = twoOpt(initialRoute, matrix);
      const optimizedCost = routeCost(optimizedRoute, matrix);
      
      expect(optimizedCost).toBeLessThanOrEqual(initialCost);
    });

    it('should not change route length', async () => {
      const { twoOpt } = await import('@/lib/tsp');
      
      const matrix = {
        durations: [[0, 10], [10, 0]],
        distances: [[0, 5], [5, 0]],
      };
      
      const route = [0, 1];
      const optimized = twoOpt(route, matrix);
      
      expect(optimized.length).toBe(2);
    });
  });

  describe('optimizeRoute', () => {
    it('should return ordered point IDs', async () => {
      const { optimizeRoute } = await import('@/lib/tsp');
      
      const points = [
        { id: 'p0', lat: -34.6, lng: -58.38 },
        { id: 'p1', lat: -34.7, lng: -58.4 },
        { id: 'p2', lat: -34.5, lng: -58.35 },
      ];
      
      const matrix = {
        durations: [
          [0, 10, 20],
          [10, 0, 15],
          [20, 15, 0],
        ],
        distances: [
          [0, 5, 10],
          [5, 0, 7],
          [10, 7, 0],
        ],
      };
      
      const route = optimizeRoute(points, 0, matrix);
      
      expect(route.length).toBe(3);
      expect(route[0]).toBe(0); // Start at first point
    });
  });

  describe('calculateETAs', () => {
    it('should calculate cumulative ETAs', async () => {
      const { calculateETAs } = await import('@/lib/tsp');
      
      const matrix = {
        durations: [
          [0, 10, 20, 30],
          [10, 0, 15, 25],
          [20, 15, 0, 10],
          [30, 25, 10, 0],
        ],
        distances: [
          [0, 5, 10, 15],
          [5, 0, 7, 12],
          [10, 7, 0, 5],
          [15, 12, 5, 0],
        ],
      };
      
      const route = [0, 1, 2, 3];
      const etas = calculateETAs(route, matrix);
      
      expect(etas[0]).toBe(0); // First point is start (0 minutes)
      // Matrix durations are in seconds: 10s = 0.167min, 15s = 0.25min
      expect(etas[1]).toBeCloseTo(10 / 60, 2); // Time to first stop
      expect(etas[2]).toBeCloseTo((10 + 15) / 60, 2); // Cumulative
    });
  });

  describe('optimizeRouteLinear', () => {
    it('should order points by nearest neighbor sequentially', async () => {
      const { optimizeRouteLinear, optimizeRouteLocal } = await import('@/lib/tsp');
      
      const points = [
        { id: 'A', lat: -32.9368, lng: -60.6393 }, // north
        { id: 'B', lat: -32.9268, lng: -60.6393 }, // north
        { id: 'C', lat: -32.9568, lng: -60.6393 }, // south
        { id: 'D', lat: -32.9668, lng: -60.6393 }, // south
        { id: 'E', lat: -32.9468, lng: -60.6293 }, // east
        { id: 'F', lat: -32.9468, lng: -60.6193 }, // east
        { id: 'G', lat: -32.9468, lng: -60.6493 }, // west
      ];
      
      const startPoint = { lat: -32.9468, lng: -60.6393 };
      
      // Test LINEAR algorithm (new)
      const linearResult = optimizeRouteLinear(points, startPoint);
      
      expect(linearResult.route.length).toBe(8); // start + 7 points
      expect(linearResult.totalDistance).toBeGreaterThan(0);
      // Last point should NOT be start (index 0)
      expect(linearResult.route[linearResult.route.length - 1]).not.toBe(0);
      
      // Map indices to IDs
      const idMap = ['start', ...points.map(p => p.id)];
      const linearIds = linearResult.route.map(i => idMap[i]);
      
      console.log('=== LINEAR (nearest sequential) ===');
      console.log('Route:', linearIds.join(' -> '));
      console.log('Total distance:', linearResult.totalDistance.toFixed(3), 'km');
      console.log('');
      
      // Test CIRCULAR algorithm (original) for comparison
      const circularResult = optimizeRouteLocal(points, startPoint);
      const circularIds = circularResult.route.map(i => idMap[i]);
      
      console.log('=== CIRCULAR (original TSP) ===');
      console.log('Route:', circularIds.join(' -> '));
      console.log('Total distance:', circularResult.totalDistance.toFixed(3), 'km');
      
      // The linear algorithm should NOT return to start
      expect(linearIds[linearIds.length - 1]).not.toBe('start');
      
      // Circular algorithm may or may not return to start depending on implementation
      console.log('Circular last point:', circularIds[circularIds.length - 1]);
    });
  });
});
