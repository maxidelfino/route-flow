/**
 * Local Routing - Haversine Distance Calculations
 * Fallback implementation when ORS API key is not available
 */

/**
 * Calculate Haversine distance between two coordinates
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimate duration from distance
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmh Average speed in km/h (default: 30 km/h for city)
 * @returns Duration in seconds
 */
export function estimateDuration(distanceKm: number, avgSpeedKmh: number = 30): number {
  return (distanceKm / avgSpeedKmh) * 3600;
}

/**
 * Calculate route ETA without traffic API
 * @param points Array of coordinates [lng, lat]
 * @param avgSpeedKmh Average speed in km/h (default: 30 km/h)
 * @returns Array of cumulative ETAs in minutes
 */
export function calculateRouteEta(
  points: number[][],
  avgSpeedKmh: number = 30
): number[] {
  if (points.length === 0) return [];

  const etas: number[] = [0]; // First point is start (0 minutes)

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distance = calculateDistance(prev[1], prev[0], curr[1], curr[0]);
    const durationSeconds = estimateDuration(distance, avgSpeedKmh);
    const segmentMinutes = durationSeconds / 60;
    etas.push(etas[i - 1] + segmentMinutes);
  }

  return etas;
}

/**
 * Build a local distance/duration matrix using Haversine
 * @param points Array of [lng, lat] coordinates
 * @param avgSpeedKmh Average speed in km/h
 * @returns Matrix with distances (km) and durations (seconds)
 */
export function buildLocalMatrix(
  points: number[][],
  avgSpeedKmh: number = 30
): { distances: number[][]; durations: number[][] } {
  const n = points.length;
  const distances: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));
  const durations: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        durations[i][j] = 0;
      } else {
        const dist = calculateDistance(
          points[i][1], points[i][0], // [lng, lat] -> lat, lng
          points[j][1], points[j][0]
        );
        distances[i][j] = dist;
        durations[i][j] = estimateDuration(dist, avgSpeedKmh);
      }
    }
  }

  return { distances, durations };
}

/**
 * Detect if a position has deviated from the planned route
 * @param currentPosition Current position [lng, lat]
 * @param plannedRoute Array of coordinates representing the route
 * @param maxDeviationKm Maximum allowed deviation in km (default: 0.5 km)
 * @returns true if deviation detected
 */
export function detectRouteDeviation(
  currentPosition: [number, number],
  plannedRoute: number[][],
  maxDeviationKm: number = 0.5
): boolean {
  if (plannedRoute.length === 0) return false;

  // Find minimum distance to any point on the route
  let minDistance = Infinity;

  for (const routePoint of plannedRoute) {
    const distance = calculateDistance(
      currentPosition[1], currentPosition[0], // [lng, lat] -> lat, lng
      routePoint[1], routePoint[0]
    );
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance > maxDeviationKm;
}

/**
 * Get the closest point on the planned route to current position
 * @param currentPosition Current position [lng, lat]
 * @param plannedRoute Array of coordinates representing the route
 * @returns Object with closest point and distance
 */
export function getClosestRoutePoint(
  currentPosition: [number, number],
  plannedRoute: number[][]
): { index: number; coordinate: number[]; distanceKm: number } {
  if (plannedRoute.length === 0) {
    throw new Error('Planned route is empty');
  }

  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < plannedRoute.length; i++) {
    const routePoint = plannedRoute[i];
    const distance = calculateDistance(
      currentPosition[1], currentPosition[0],
      routePoint[1], routePoint[0]
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return {
    index: closestIndex,
    coordinate: plannedRoute[closestIndex],
    distanceKm: minDistance,
  };
}
