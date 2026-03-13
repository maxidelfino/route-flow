/**
 * Local Routing - Polyline Utilities
 * Fallback implementation for route visualization when ORS is unavailable
 */

/**
 * Create a straight-line polyline between points
 * Used as fallback when ORS route geometry is not available
 * @param coordinates Array of [lng, lat] coordinates
 * @returns GeoJSON-like geometry object
 */
export function createStraightLinePolyline(
  coordinates: number[][]
): { type: string; coordinates: number[][] } {
  if (coordinates.length < 2) {
    return { type: 'LineString', coordinates };
  }

  // Simply return the coordinates as a LineString
  // In a real implementation, you might interpolate points
  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Interpolate points along a straight line
 * @param start [lng, lat] start coordinate
 * @param end [lng, lat] end coordinate
 * @param numPoints Number of points to interpolate (including start and end)
 * @returns Array of interpolated coordinates
 */
export function interpolateLine(
  start: [number, number],
  end: [number, number],
  numPoints: number = 10
): number[][] {
  if (numPoints < 2) {
    return [start, end];
  }

  const points: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    points.push([lng, lat]);
  }

  return points;
}

/**
 * Create a complete polyline with interpolation for smoother visualization
 * @param coordinates Array of [lng, lat] waypoints
 * @param pointsPerSegment Number of interpolation points per segment
 * @returns Interpolated polyline coordinates
 */
export function createInterpolatedPolyline(
  coordinates: number[][],
  pointsPerSegment: number = 5
): number[][] {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const result: number[][] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i] as [number, number];
    const end = coordinates[i + 1] as [number, number];
    const interpolated = interpolateLine(start, end, pointsPerSegment);
    
    // Add all points except the last one (to avoid duplicates)
    result.push(...interpolated.slice(0, -1));
  }

  // Add the final point
  result.push(coordinates[coordinates.length - 1]);

  return result;
}
