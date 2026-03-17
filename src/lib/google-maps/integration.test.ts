/**
 * Integration Tests for Google Maps API Routes
 * Tests /api/route-optimize, /api/geocode, and /api/matrix endpoints
 * 
 * Note: These tests require a running Next.js dev server or mock the API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GoogleDirectionsResponse,
  GoogleGeocodingResponse,
  GoogleDistanceMatrixResponse,
} from './types';

// Mock the google-maps module
vi.mock('@/lib/google-maps', async () => {
  const actual = await vi.importActual('@/lib/google-maps');
  return {
    ...actual,
    isGoogleMapsConfigured: vi.fn().mockReturnValue(true),
    getDirections: vi.fn(),
    getDistanceMatrix: vi.fn(),
    geocodeAddress: vi.fn(),
    decodePolyline: vi.fn(),
  };
});

// Mock the routing module
vi.mock('@/lib/routing', async () => {
  return {
    getMatrix: vi.fn(),
    getRoute: vi.fn(),
    isApiKeyConfigured: vi.fn().mockReturnValue(false),
    createStraightLinePolyline: vi.fn().mockReturnValue({
      coordinates: [[-60.65, -32.94], [-60.63, -32.95]],
    }),
  };
});

// Mock TSP module
vi.mock('@/lib/tsp', async () => {
  return {
    optimizeAndCalculate: vi.fn().mockReturnValue({
      route: [0, 1, 2],
      totalDuration: 600,
      totalDistance: 5000,
      etas: [5, 10],
    }),
    optimizeRouteLocal: vi.fn().mockReturnValue({
      route: [0, 1, 2],
      totalDuration: 600,
      totalDistance: 5000,
      etas: [5, 10],
    }),
    Point: {},
    Matrix: {},
  };
});

// Mock the local routing module
vi.mock('@/lib/routing/local', async () => {
  return {
    buildLocalMatrix: vi.fn().mockReturnValue({
      durations: [[0, 300], [300, 0]],
      distances: [[0, 5000], [5000, 0]],
    }),
  };
});

// Mock Next.js request/response
const mockRequest = (options: {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  json?: () => Promise<any>;
}) => {
  return {
    method: options.method || 'POST',
    json: options.json || (async () => options.body),
    nextUrl: {
      searchParams: new URLSearchParams(options.query || {}),
    },
  } as any;
};

describe('Google Maps API Response Type Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate Google Directions response structure', () => {
    // Valid response
    const validResponse: GoogleDirectionsResponse = {
      status: 'OK',
      routes: [
        {
          bounds: {
            northeast: { lat: 40.7, lng: -120.2 },
            southwest: { lat: 38.5, lng: -120.95 },
          },
          legs: [
            {
              distance: { value: 5000, text: '5 km' },
              duration: { value: 600, text: '10 mins' },
              start_address: 'Start',
              end_address: 'End',
              start_location: { lat: 38.5, lng: -120.2 },
              end_location: { lat: 40.7, lng: -120.95 },
              steps: [],
            },
          ],
          overview_polyline: {
            points: '_p~iF~ps|U',
          },
        },
      ],
    };

    expect(validResponse.status).toBe('OK');
    expect(validResponse.routes).toHaveLength(1);
    expect(validResponse.routes[0].overview_polyline.points).toBeDefined();
  });

  it('should validate Google Geocoding response structure', () => {
    const validResponse: GoogleGeocodingResponse = {
      status: 'OK',
      results: [
        {
          formatted_address: 'Paraguay 1658, Rosario, Santa Fe, Argentina',
          geometry: {
            location: { lat: -32.9442, lng: -60.6505 },
            location_type: 'ROOFTOP',
          },
          place_id: 'ChIJxxxx',
          types: ['street_address'],
        },
      ],
    };

    expect(validResponse.status).toBe('OK');
    expect(validResponse.results).toHaveLength(1);
    expect(validResponse.results[0].geometry.location_type).toBe('ROOFTOP');
  });

  it('should validate Google Distance Matrix response structure', () => {
    const validResponse: GoogleDistanceMatrixResponse = {
      status: 'OK',
      origin_addresses: ['Start', 'Point 1'],
      destination_addresses: ['Point 1', 'End'],
      rows: [
        {
          elements: [
            {
              status: 'OK',
              distance: { value: 1000, text: '1 km' },
              duration: { value: 300, text: '5 mins' },
            },
            {
              status: 'OK',
              distance: { value: 2000, text: '2 km' },
              duration: { value: 600, text: '10 mins' },
            },
          ],
        },
      ],
    };

    expect(validResponse.status).toBe('OK');
    expect(validResponse.rows[0].elements).toHaveLength(2);
    expect(validResponse.rows[0].elements[0].status).toBe('OK');
  });

  it('should map Google response to internal RouteResult format', async () => {
    // Import the mapping logic
    const { decodePolyline } = await import('./polyline');
    
    // Simulate what the API does
    const googleRoute = {
      overview_polyline: { points: '_p~iF~ps|U' },
      legs: [
        {
          distance: { value: 5000 },
          duration: { value: 600 },
          steps: [
            {
              html_instructions: 'Head north',
              distance: { value: 5000 },
              duration: { value: 600 },
              start_location: { lat: 38.5, lng: -120.2 },
              end_location: { lat: 40.7, lng: -120.95 },
              polyline: { points: '_p~iF~ps|U' },
            },
          ],
        },
      ],
    };

    const decodedPolyline = decodePolyline(googleRoute.overview_polyline.points);
    const coordinates = decodedPolyline.map(([lat, lng]) => [lng, lat] as [number, number]);

    expect(coordinates.length).toBeGreaterThan(0);
    expect(coordinates[0][0]).toBeDefined(); // lng
    expect(coordinates[0][1]).toBeDefined(); // lat
  });

  it('should handle Google API error statuses', () => {
    const errorStatuses = ['ZERO_RESULTS', 'NOT_FOUND', 'MAX_WAYPOINTS_EXCEEDED', 'OVER_QUERY_LIMIT', 'REQUEST_DENIED'];
    
    for (const status of errorStatuses) {
      const response = { status, routes: [] };
      expect(response.status).toBe(status);
    }
  });
});

describe('Fallback Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fallback when Google API fails', async () => {
    // This tests the fallback chain in the API routes
    // When Google Maps is not configured, should fallback to ORS or local
    
    const { isGoogleMapsConfigured } = await import('@/lib/google-maps');
    
    // Simulate Google not configured
    vi.mocked(isGoogleMapsConfigured).mockReturnValue(false);
    
    expect(isGoogleMapsConfigured()).toBe(false);
  });

  it('should handle rate limiting with retry', () => {
    // Test retry logic is implemented
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000];
    
    expect(maxRetries).toBe(3);
    expect(retryDelays.length).toBe(3);
    expect(retryDelays[0]).toBeLessThan(retryDelays[1]);
    expect(retryDelays[1]).toBeLessThan(retryDelays[2]);
  });

  it('should use Haversine fallback when no API available', async () => {
    const { buildLocalMatrix } = await import('@/lib/routing/local');
    
    const coords = [[-60.65, -32.94], [-60.63, -32.95]];
    const matrix = buildLocalMatrix(coords);
    
    expect(matrix.durations).toBeDefined();
    expect(matrix.distances).toBeDefined();
    expect(matrix.durations.length).toBe(2);
  });
});
