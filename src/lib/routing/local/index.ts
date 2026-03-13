/**
 * Local Routing - Fallback Implementations
 * These functions work without ORS API key using Haversine calculations
 */

export {
  calculateDistance,
  estimateDuration,
  calculateRouteEta,
  buildLocalMatrix,
  detectRouteDeviation,
  getClosestRoutePoint,
} from './haversine';

export {
  createStraightLinePolyline,
  interpolateLine,
  createInterpolatedPolyline,
} from './polyline';

export {
  compareRouteWithPosition,
  getEstimatedTimeRemaining,
} from './routeComparator';

export type { Point, Matrix, RouteResult, Coordinate, PlannedRoute } from './types';
export type { RouteSegment, ComparisonResult } from './routeComparator';
