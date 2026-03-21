import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as googleMapsModule from '../google-maps';
import type { DistanceMatrixResponse } from '../google-maps';

const { getDurationMatrix } = googleMapsModule;

// Mock the getDistanceMatrix function
const mockGetDistanceMatrix = vi.spyOn(googleMapsModule, 'getDistanceMatrix');

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
      elements: Array.from({ length: destCount }, (_, j) => ({
        status: 'OK',
        duration: { value: i === j ? 0 : (i + 1) * (j + 1) * 100, text: '0 mins' },
        distance: { value: (i + 1) * (j + 1) * 1000, text: '0 km' },
      })),
    })),
  };
}

// ────────────────────────────────────────────────────────────────
// Edge Cases
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - Edge Cases', () => {
  beforeEach(() => {
    mockGetDistanceMatrix.mockReset();
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
    await expect(
      getDurationMatrix([[999, -74.0]])
    ).rejects.toThrow('Invalid latitude 999 at index 0. Must be between -90 and 90.');
  });
  
  it('throws on invalid latitude (too low)', async () => {
    await expect(
      getDurationMatrix([[-999, -74.0]])
    ).rejects.toThrow('Invalid latitude -999 at index 0. Must be between -90 and 90.');
  });
  
  it('throws on invalid longitude (too high)', async () => {
    await expect(
      getDurationMatrix([[40.7, 999]])
    ).rejects.toThrow('Invalid longitude 999 at index 0. Must be between -180 and 180.');
  });
  
  it('throws on invalid longitude (too low)', async () => {
    await expect(
      getDurationMatrix([[40.7, -999]])
    ).rejects.toThrow('Invalid longitude -999 at index 0. Must be between -180 and 180.');
  });
  
  it('handles duplicate coordinates', async () => {
    mockGetDistanceMatrix.mockResolvedValue(mockSuccessResponse(3, 3));
    
    const coords: [number, number][] = [
      [40.7, -74.0],
      [40.7, -74.0],  // duplicate
      [40.8, -74.1],
    ];
    
    const result = await getDurationMatrix(coords);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(3);
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────
// Fast Path (N ≤ 25)
// ────────────────────────────────────────────────────────────────

describe('getDurationMatrix - Fast Path', () => {
  beforeEach(() => {
    mockGetDistanceMatrix.mockReset();
  });
  
  it('uses single batch for N=25', async () => {
    mockGetDistanceMatrix.mockResolvedValue(mockSuccessResponse(25, 25));
    
    const coords = generateTestCoords(25);
    await getDurationMatrix(coords);
    
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(1);
    expect(mockGetDistanceMatrix).toHaveBeenCalledWith(coords, coords);
  });
  
  it('uses single batch for N=10', async () => {
    mockGetDistanceMatrix.mockResolvedValue(mockSuccessResponse(10, 10));
    
    const coords = generateTestCoords(10);
    await getDurationMatrix(coords);
    
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(1);
  });
  
  it('returns correct matrix dimensions for N=20', async () => {
    mockGetDistanceMatrix.mockResolvedValue(mockSuccessResponse(20, 20));
    
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
    mockGetDistanceMatrix.mockReset();
  });

  it('uses 4 batches for N=26', async () => {
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
    });
    
    const coords = generateTestCoords(26);
    await getDurationMatrix(coords);
    
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(4);
    
    // Verify batch sizes
    const calls = mockGetDistanceMatrix.mock.calls;
    expect(calls[0][0]).toHaveLength(25); // origins[0-24]
    expect(calls[0][1]).toHaveLength(25); // destinations[0-24]
    expect(calls[1][0]).toHaveLength(25); // origins[0-24]
    expect(calls[1][1]).toHaveLength(1);  // destinations[25]
    expect(calls[2][0]).toHaveLength(1);  // origins[25]
    expect(calls[2][1]).toHaveLength(25); // destinations[0-24]
    expect(calls[3][0]).toHaveLength(1);  // origins[25]
    expect(calls[3][1]).toHaveLength(1);  // destinations[25]
  });
  
  it('uses 4 batches for N=50 (perfect 2×2)', async () => {
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
    });
    
    const coords = generateTestCoords(50);
    await getDurationMatrix(coords);
    
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(4);
    
    // All batches should be 25×25
    mockGetDistanceMatrix.mock.calls.forEach(call => {
      expect(call[0]).toHaveLength(25);
      expect(call[1]).toHaveLength(25);
    });
  });
  
  it('uses 4 batches for N=31 (reported failure case)', async () => {
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
    });
    
    const coords = generateTestCoords(31);
    const result = await getDurationMatrix(coords);
    
    expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(31);
    expect(result[0]).toHaveLength(31);
  });
  
  it('reconstructs matrix correctly for N=50', async () => {
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
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
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
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
    mockGetDistanceMatrix.mockReset();
  });

  it('uses Haversine for ZERO_RESULTS elements', async () => {
    mockGetDistanceMatrix.mockResolvedValue({
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
    });
    
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
    mockGetDistanceMatrix.mockImplementation((origins, dests) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Network error');
      }
      return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
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
    mockGetDistanceMatrix.mockRejectedValue(new Error('API unavailable'));
    
    const coords = generateTestCoords(50);
    
    await expect(getDurationMatrix(coords)).rejects.toThrow(
      'Distance Matrix API unavailable'
    );
  });
  
  it('falls back to all Haversine on fast path failure', async () => {
    mockGetDistanceMatrix.mockRejectedValue(new Error('API unavailable'));
    
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
    mockGetDistanceMatrix.mockReset();
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
      mockGetDistanceMatrix.mockImplementation((origins, dests) => {
        return Promise.resolve(mockSuccessResponse(origins.length, dests.length));
      });
      
      const coords = generateTestCoords(n);
      await getDurationMatrix(coords);
      
      expect(mockGetDistanceMatrix).toHaveBeenCalledTimes(expected);
    });
  });
  
  it('batch count matches formula: ceil(N/25)²', () => {
    testCases.forEach(({ n, expected }) => {
      const actual = Math.ceil(n / 25) ** 2;
      expect(actual).toBe(expected);
    });
  });
});
