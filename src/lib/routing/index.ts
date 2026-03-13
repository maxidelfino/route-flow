/**
 * Routing Module with Fallback Support
 * 
 * This module provides routing functions with automatic fallback
 * from ORS API to local Haversine calculations.
 * 
 * ## API Key Requirements
 * 
 * Some functions require ORS API key:
 * - `getRoute()` - Requires NEXT_PUBLIC_ORS_API_KEY
 * - `getMatrix()` - Requires NEXT_PUBLIC_ORS_API_KEY
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
 * For automatic fallback:
 * ```typescript
 * import { getRouteWithFallback, getMatrixWithFallback } from '@/lib/routing';
 * 
 * const result = await getRouteWithFallback(coordinates);
 * ```
 * 
 * For local-only (no API key required):
 * ```typescript
 * import { calculateDistance, buildLocalMatrix } from '@/lib/routing/local';
 * 
 * const distance = calculateDistance(lat1, lng1, lat2, lng2);
 * ```
 */

import { isApiKeyConfigured } from '@/lib/ors';
import * as ors from './ors';
import * as local from './local';

export type { RouteResult } from './local';
export type { Point, Matrix, Coordinate, PlannedRoute } from './local';

// Re-export ORS functions (require API key)
export const { getRoute, getMatrix } = ors;
export { isApiKeyConfigured } from '@/lib/ors';

/**
 * Check if ORS API is available
 * @returns true if NEXT_PUBLIC_ORS_API_KEY is configured
 */
export function isORSConfigured(): boolean {
  return isApiKeyConfigured();
}

/**
 * Get route with automatic fallback to local calculation
 * @param coordinates Array of [lng, lat] coordinates
 * @param useFallback If true, skip ORS and use local calculation
 * @returns Route with geometry and stats
 */
export async function getRouteWithFallback(
  coordinates: number[][],
  useFallback: boolean = false
): Promise<{
  geometry: { coordinates: number[][]; type: string };
  duration: number;
  distance: number;
  legs: Array<{ duration: number; distance: number; steps: any[] }>;
  isFallback: boolean;
}> {
  if (!isApiKeyConfigured() || useFallback) {
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

  try {
    const result = await ors.getRoute(coordinates);
    return { ...result, isFallback: false };
  } catch (error) {
    console.warn('ORS route failed, using fallback:', error);
    // Fall through to fallback
    const polyline = local.createInterpolatedPolyline(coordinates, 3);
    const totalDistance = local.calculateDistance(
      coordinates[0][1], coordinates[0][0],
      coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]
    );
    const totalDuration = local.estimateDuration(totalDistance, 30);
    
    return {
      geometry: { coordinates: polyline, type: 'LineString' },
      duration: totalDuration,
      distance: totalDistance * 1000,
      legs: [{
        duration: totalDuration,
        distance: totalDistance * 1000,
        steps: [],
      }],
      isFallback: true,
    };
  }
}

/**
 * Get matrix with automatic fallback to local calculation
 * @param coordinates Array of [lng, lat] coordinates
 * @param useFallback If true, skip ORS and use local calculation
 * @returns Matrix with durations and distances
 */
export async function getMatrixWithFallback(
  coordinates: number[][],
  useFallback: boolean = false
): Promise<{
  durations: number[][];
  distances: number[][];
  isFallback: boolean;
}> {
  if (!isApiKeyConfigured() || useFallback) {
    const matrix = local.buildLocalMatrix(coordinates);
    return { ...matrix, isFallback: true };
  }

  try {
    const result = await ors.getMatrix(coordinates);
    return { ...result, isFallback: false };
  } catch (error) {
    console.warn('ORS matrix failed, using fallback:', error);
    const matrix = local.buildLocalMatrix(coordinates);
    return { ...matrix, isFallback: true };
  }
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
