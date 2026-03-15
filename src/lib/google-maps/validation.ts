/**
 * Validation utilities for Google Maps API integration
 */

/**
 * Validate that a coordinate pair is within valid ranges
 * @param coord - [lng, lat] or [lat, lng] array
 * @param format - 'lnglat' or 'latlng'
 * @returns Validation result
 */
export function validateCoordinate(
  coord: number[], 
  format: 'lnglat' | 'latlng' = 'lnglat'
): { valid: boolean; error?: string } {
  if (!coord || coord.length < 2) {
    return { valid: false, error: 'Coordinate must have at least 2 values' };
  }

  const [first, second] = coord;
  const lat = format === 'latlng' ? first : second;
  const lng = format === 'lnglat' ? first : second;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }

  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, error: 'Coordinates cannot be NaN' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: `Latitude ${lat} is out of range (-90 to 90)` };
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, error: `Longitude ${lng} is out of range (-180 to 180)` };
  }

  return { valid: true };
}

/**
 * Validate an array of coordinates
 * @param coordinates - Array of [lng, lat] arrays
 * @returns Validation result
 */
export function validateCoordinates(coordinates: number[][]): { valid: boolean; error?: string } {
  if (!coordinates || !Array.isArray(coordinates)) {
    return { valid: false, error: 'Coordinates must be an array' };
  }

  if (coordinates.length === 0) {
    return { valid: false, error: 'Coordinates array cannot be empty' };
  }

  for (let i = 0; i < coordinates.length; i++) {
    const result = validateCoordinate(coordinates[i], 'lnglat');
    if (!result.valid) {
      return { valid: false, error: `Coordinate at index ${i}: ${result.error}` };
    }
  }

  return { valid: true };
}

/**
 * Validate an address string
 * @param address - The address to validate
 * @returns Validation result
 */
export function validateAddress(address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  const trimmed = address.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Address cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Address is too short (minimum 3 characters)' };
  }

  // Check for obviously invalid addresses
  if (/^[0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Address cannot be only numbers' };
  }

  return { valid: true };
}

/**
 * Validate coordinates are within Rosario, Argentina bounds
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns True if within Rosario bounds
 */
export function isWithinRosarioBounds(lat: number, lng: number): boolean {
  // Approximate Rosario bounds (expanded to include Echesa, Pichincha, and surrounding neighborhoods)
  const ROSARIO_BOUNDS = {
    lat: { min: -33.00, max: -32.80 },
    lng: { min: -60.75, max: -60.58 },
  };

  return (
    lat >= ROSARIO_BOUNDS.lat.min &&
    lat <= ROSARIO_BOUNDS.lat.max &&
    lng >= ROSARIO_BOUNDS.lng.min &&
    lng <= ROSARIO_BOUNDS.lng.max
  );
}

/**
 * Validate location type from geocoding response
 * @param locationType - The location type from Google
 * @returns True if acceptable precision
 */
export function isAcceptableLocationType(locationType?: string): boolean {
  // ROOFTOP is most precise, RANGE_INTERPOLATED is good for street addresses
  return locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED';
}

/**
 * Normalize an address for better geocoding results
 * @param address - Raw address string
 * @returns Normalized address
 */
export function normalizeAddress(address: string): string {
  let normalized = address.trim();

  // Add Rosario, Argentina if not present
  if (!/rosario|santa fe|argentina/i.test(normalized)) {
    normalized = `${normalized}, Rosario, Santa Fe, Argentina`;
  }

  return normalized;
}
