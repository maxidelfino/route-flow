import { calculateDistance } from './routing/local/haversine';
import { EARTH_RADIUS_METERS } from './constants';

/**
 * Calculate Haversine distance between two coordinates
 * Returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // calculateDistance returns km, convert to meters
  return calculateDistance(lat1, lon1, lat2, lon2) * 1000;
}

export { EARTH_RADIUS_METERS };