/**
 * @deprecated This module is no longer the primary routing service.
 * 
 * Migration to Google Maps Platform (March 2026):
 * - Directions: Now uses Google Directions API via `@/lib/google-maps/directions`
 * - Geocoding: Now uses Google Geocoding API via `@/lib/google-maps/geocoding`
 * - Distance Matrix: Now uses Google Distance Matrix API via `@/lib/google-maps/matrix`
 * 
 * This module remains as a FALLBACK only:
 * - Used when Google Maps API key is not configured
 * - Provides local Haversine-based calculations
 * - Maintained for backward compatibility
 * 
 * To migrate: Ensure GOOGLE_MAPS_API_KEY is set in .env.local
 * @see src/lib/google-maps/ for the new implementation
 */
const ORS_BASE_URL = 'https://api.openrouteservice.org';

interface ORSConfig {
  apiKey: string;
}

/**
 * Check if ORS API key is configured
 * @deprecated Use Google Maps API instead (GOOGLE_MAPS_API_KEY)
 * @returns Whether ORS API key is set in environment
 */
export function isApiKeyConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ORS_API_KEY;
}

/**
 * Get ORS API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
  if (!apiKey) {
    throw new Error('ORS API key not configured. Set NEXT_PUBLIC_ORS_API_KEY in .env.local');
  }
  return apiKey;
}

/**
 * Get time/distance matrix from ORS
 * @deprecated Use Google Distance Matrix API via @/lib/google-maps/matrix
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Matrix with durations (seconds) and distances (km)
 */
export async function getMatrix(coordinates: number[][]): Promise<{
  durations: number[][];
  distances: number[][];
}> {
  const apiKey = getApiKey();

  const response = await fetch(`${ORS_BASE_URL}/v2/matrix/driving-car?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locations: coordinates,
      metrics: ['duration', 'distance'],
      units: 'km',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ORS Matrix API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    durations: data.durations,
    distances: data.distances,
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @param coord1 [lng, lat]
 * @param coord2 [lng, lat]
 * @returns distance in meters
 */
function haversineDistance(coord1: number[], coord2: number[]): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total route distance using Haversine formula
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Total distance in meters
 */
export function calculateRouteDistance(coordinates: number[][]): number {
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += haversineDistance(coordinates[i], coordinates[i + 1]);
  }
  return totalDistance;
}

/**
 * Get route directions between multiple points using Haversine fallback
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Fallback route with straight-line geometry
 */
export function getRouteFallback(coordinates: number[][]): RouteResult {
  const totalDistance = calculateRouteDistance(coordinates);
  // Estimate duration: assume average speed of 40 km/h in city
  const estimatedDuration = (totalDistance / 1000) * 3.6 * 3600; // seconds

  return {
    geometry: {
      coordinates,
      type: 'LineString',
    },
    duration: estimatedDuration,
    distance: totalDistance,
    legs: [
      {
        duration: estimatedDuration,
        distance: totalDistance,
        steps: [
          {
            instruction: 'Seguir ruta',
            duration: estimatedDuration,
            distance: totalDistance,
          },
        ],
      },
    ],
  };
}

/**
 * ORS API types
 */
export interface ORSStep {
  instruction: string;
  duration: number;
  distance: number;
}

export interface ORSSegment {
  duration: number;
  distance: number;
  steps: ORSStep[];
}

export interface RouteResult {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  duration: number; // seconds
  distance: number; // meters
  legs: Array<{
    duration: number;
    distance: number;
    steps: Array<{
      instruction: string;
      duration: number;
      distance: number;
    }>;
  }>;
}

/**
 * Get route directions between multiple points
 * @deprecated Use Google Directions API via @/lib/google-maps/directions
 * @param coordinates Array of [lng, lat] coordinates
 * @param useFallback If true, skip API call and use Haversine fallback
 * @returns Route with geometry and instructions
 */

export async function getRoute(coordinates: number[][], useFallback = false): Promise<RouteResult> {
  const apiKey = getApiKey();

  // If fallback is requested, skip API call
  if (useFallback) {
    console.log('[ORS] Using Haversine fallback for route calculation');
    return getRouteFallback(coordinates);
  }

  // ORS expects [lng, lat] format
  const response = await fetch(`${ORS_BASE_URL}/v2/directions/driving-car?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates,
      format: 'geojson',
      instructions: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ORS] API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      endpoint: `${ORS_BASE_URL}/v2/directions/driving-car`,
      coordinatesCount: coordinates.length,
    });
    throw new Error(`ORS Directions API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    geometry: data.features[0].geometry,
    duration: data.features[0].properties.summary.duration,
    distance: data.features[0].properties.summary.distance,
    legs: data.features[0].properties.segments.map((seg: ORSSegment) => ({
      duration: seg.duration,
      distance: seg.distance,
      steps: seg.steps.map((step: ORSStep) => ({
        instruction: step.instruction,
        duration: step.duration,
        distance: step.distance,
      })),
    })),
  };
}

/**
 * Decode polyline from ORS (uses encoded polyline by default)
 * For geojson format, geometry is already decoded
 */
export function decodePolyline(encoded: string): number[][] {
  const poly: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lng / 1e5, lat / 1e5]);
  }

  return poly;
}
