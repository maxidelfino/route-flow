/**
 * Local Routing - Route Comparator
 * Compare planned route with current position to detect deviations
 */

import { calculateDistance } from './haversine';

export interface RouteSegment {
  start: [number, number];
  end: [number, number];
}

export interface ComparisonResult {
  isDeviating: boolean;
  distanceToRoute: number; // km
  closestSegmentIndex: number;
  closestPoint: [number, number];
  progress: number; // 0-1 percentage of route completed
  remainingDistance: number; // km
}

/**
 * Find the closest point on a route segment to a given position
 * Uses perpendicular distance to line segment
 */
function closestPointOnSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): { point: [number, number]; distance: number } {
  const [px, py] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  // Convert to km for distance calculation
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Segment is a point
    const dist = calculateDistance(py, px, y1, x1);
    return { point: segmentStart, distance: dist };
  }

  // Calculate projection parameter
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  // Project point onto line
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const closest: [number, number] = [projX, projY];
  const distance = calculateDistance(py, px, projY, projX);

  return { point: closest, distance };
}

/**
 * Compare current position with planned route
 * @param currentPosition Current position [lng, lat]
 * @param plannedRoute Array of [lng, lat] coordinates
 * @param maxDeviationKm Maximum allowed deviation in km (default: 0.5 km)
 * @returns Comparison result with deviation status
 */
export function compareRouteWithPosition(
  currentPosition: [number, number],
  plannedRoute: number[][],
  maxDeviationKm: number = 0.5
): ComparisonResult {
  if (plannedRoute.length < 2) {
    const fallbackPoint: [number, number] = plannedRoute[0] 
      ? [plannedRoute[0][0], plannedRoute[0][1]] 
      : currentPosition;
    return {
      isDeviating: true,
      distanceToRoute: 0,
      closestSegmentIndex: 0,
      closestPoint: fallbackPoint,
      progress: 0,
      remainingDistance: 0,
    };
  }

  let closestSegmentIndex = 0;
  let minDistance = Infinity;
  let closestPoint: [number, number] = [plannedRoute[0][0], plannedRoute[0][1]];

  // Find closest point on route
  for (let i = 0; i < plannedRoute.length - 1; i++) {
    const segment: RouteSegment = {
      start: plannedRoute[i] as [number, number],
      end: plannedRoute[i + 1] as [number, number],
    };

    const { point, distance } = closestPointOnSegment(
      currentPosition,
      segment.start,
      segment.end
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestSegmentIndex = i;
      closestPoint = point;
    }
  }

  // Calculate progress (how much of route has been covered)
  let distanceAlongRoute = 0;
  for (let i = 0; i < closestSegmentIndex; i++) {
    distanceAlongRoute += calculateDistance(
      plannedRoute[i][1], plannedRoute[i][0],
      plannedRoute[i + 1][1], plannedRoute[i + 1][0]
    );
  }
  // Add distance to closest point
  distanceAlongRoute += calculateDistance(
    plannedRoute[closestSegmentIndex][1], plannedRoute[closestSegmentIndex][0],
    closestPoint[1], closestPoint[0]
  );

  // Calculate total route distance
  let totalDistance = 0;
  for (let i = 0; i < plannedRoute.length - 1; i++) {
    totalDistance += calculateDistance(
      plannedRoute[i][1], plannedRoute[i][0],
      plannedRoute[i + 1][1], plannedRoute[i + 1][0]
    );
  }

  const progress = totalDistance > 0 ? distanceAlongRoute / totalDistance : 0;
  const remainingDistance = totalDistance - distanceAlongRoute;

  return {
    isDeviating: minDistance > maxDeviationKm,
    distanceToRoute: minDistance,
    closestSegmentIndex,
    closestPoint,
    progress: Math.min(1, Math.max(0, progress)),
    remainingDistance: Math.max(0, remainingDistance),
  };
}

/**
 * Get estimated time remaining based on current position and route
 * @param currentPosition Current position [lng, lat]
 * @param plannedRoute Array of [lng, lat] coordinates
 * @param avgSpeedKmh Average speed in km/h (default: 30 km/h)
 * @returns Estimated time remaining in minutes
 */
export function getEstimatedTimeRemaining(
  currentPosition: [number, number],
  plannedRoute: number[][],
  avgSpeedKmh: number = 30
): number {
  const comparison = compareRouteWithPosition(currentPosition, plannedRoute);
  const timeHours = comparison.remainingDistance / avgSpeedKmh;
  return timeHours * 60; // Convert to minutes
}
