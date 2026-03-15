/**
 * Routing Module with Fallback Support
 * 
 * This module provides routing functions with Google Maps as the PRIMARY provider
 * and automatic fallback to local Haversine calculations.
 * 
 * ## Priority
 * 
 * 1. Google Maps API (when GOOGLE_MAPS_API_KEY is configured) - PRIMARY
 * 2. Local Haversine calculations - FALLBACK
 * 
 * ## API Key Requirements
 * 
 * For Google Maps:
 * - `GOOGLE_MAPS_API_KEY` - Required for primary routing
 * 
 * These functions work without API key:
 * - `calculateDistance()` - Uses Haversine formula
 * - `buildLocalMatrix()` - Uses Haversine distances
 * - `calculateRouteEta()` - Uses average speed estimation
 * - `detectRouteDeviation()` - Uses Haversine distance check
 * - `createStraightLinePolyline()` - Creates simple polyline
 * 
 * ## Usage
 * 
 * For route optimization, use the API endpoints:
 * - `/api/route-optimize` - Full route optimization with Google TSP
 * - `/api/matrix` - Distance matrix with Google Distance Matrix
 * 
 * For local-only calculations:
 * ```typescript
 * import { calculateDistance, buildLocalMatrix } from '@/lib/routing/local';
 * 
 * const distance = calculateDistance(lat1, lng1, lat2, lng2);
 * ```
 */

import * as local from './local';

export type { RouteResult } from './local';
export type { Point, Matrix, Coordinate, PlannedRoute } from './local';

// Re-export local functions for direct use
export const getRoute = local.createInterpolatedPolyline;
export const getMatrix = local.buildLocalMatrix;

/**
 * Check if Google Maps API is configured
 * @returns true if GOOGLE_MAPS_API_KEY is set
 */
export function isApiKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/**
 * Check if Google Maps API is available
 * @deprecated Use isApiKeyConfigured() instead
 */
export function isGoogleMapsConfigured(): boolean {
  return isApiKeyConfigured();
}

/**
 * Legacy function - use /api/route-optimize instead
 * @deprecated
 */
export async function getRouteWithFallback(
  coordinates: number[][],
  useFallback: boolean = false
): Promise<{
  geometry: { coordinates: number[][]; type: string };
  duration: number;
  distance: number;
  legs: Array<{ duration: number; distance: number; steps: Array<{ instruction: string; duration: number; distance: number }> }>;
  isFallback: boolean;
}> {
  // Use local fallback - create straight line polyline
  const polyline = local.createInterpolatedPolyline(coordinates, 3);
  const totalDistance = local.calculateDistance(
    coordinates[0][1], coordinates[0][0],
    coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]
  );
  const totalDuration = local.estimateDuration(totalDistance, 30);
  
  return {
    geometry: { coordinates: polyline, type: 'LineString' },
    duration: totalDuration,
    distance: totalDistance * 1000, // Convert to meters
    legs: [{
      duration: totalDuration,
      distance: totalDistance * 1000,
      steps: [],
    }],
    isFallback: true,
  };
}

/**
 * Legacy function - use /api/matrix instead
 * @deprecated
 */
export async function getMatrixWithFallback(
  coordinates: number[][],
  useFallback: boolean = false
): Promise<{
  durations: number[][];
  distances: number[][];
  isFallback: boolean;
}> {
  const matrix = local.buildLocalMatrix(coordinates);
  return { ...matrix, isFallback: true };
}

// Export all local functions for direct use
export {
  calculateDistance,
  estimateDuration,
  calculateRouteEta,
  buildLocalMatrix,
  detectRouteDeviation,
  getClosestRoutePoint,
  createStraightLinePolyline,
  interpolateLine,
  createInterpolatedPolyline,
  compareRouteWithPosition,
  getEstimatedTimeRemaining,
} from './local';
