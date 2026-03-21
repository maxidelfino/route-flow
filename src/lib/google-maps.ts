/**
 * Google Maps API integration utilities
 * Server-side only - uses GOOGLE_MAPS_API_KEY from environment
 */

import { decodePolyline } from './google-maps/polyline';

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

// Re-export decodePolyline from google-maps/polyline for backward compatibility
export { decodePolyline };

// ============================================================================
// TypeScript Types for Google Maps API Responses
// ============================================================================

export interface DirectionsWaypoint {
  geocoder_status: string;
  place_id: string;
  text: string;
}

export interface DirectionsStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_location: { lat: number; lng: number };
  html_instructions: string;
  maneuver?: string;
  polyline: { points: string };
  start_location: { lat: number; lng: number };
  travel_mode: string;
}

export interface DirectionsLeg {
  arrival_time: { text: string; value: number };
  departure_time: { text: string; value: number };
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_address: string;
  end_location: { lat: number; lng: number };
  start_address: string;
  start_location: { lat: number; lng: number };
  steps: DirectionsStep[];
  traffic_speed_entry: unknown[];
  via_waypoint: DirectionsWaypoint[];
}

export interface DirectionsRoute {
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  copyrights: string;
  legs: DirectionsLeg[];
  overview_polyline: { points: string };
  summary: string;
  warnings: string[];
  waypoint_order: number[];
}

export interface DirectionsResponse {
  routes: DirectionsRoute[];
  status: string;
  geocoded_waypoints: DirectionsWaypoint[];
}

// ============================================================================

export interface GeocodingResult {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  place_id: string;
  types: string[];
}

export interface GeocodingResponse {
  results: GeocodingResult[];
  status: string;
}

// ============================================================================

export interface DistanceMatrixElement {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  duration_in_traffic?: { text: string; value: number };
  status: string;
}

export interface DistanceMatrixRow {
  elements: DistanceMatrixElement[];
}

export interface DistanceMatrixResponse {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: DistanceMatrixRow[];
  status: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Check if Google Maps API key is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

/**
 * Get directions between origin and destination with optional waypoints
 * Uses Google Directions API with optimizeWaypoints for TSP optimization
 */
export async function getDirections(
  origin: [number, number] | string,
  destination: [number, number] | string,
  waypoints?: Array<{ location: [number, number] | string; stopover?: boolean }>,
  options?: {
    optimize?: boolean;
    travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  }
): Promise<DirectionsResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env.local');
  }

  const params = new URLSearchParams({
    key: apiKey,
  });

  // Handle origin - can be [lat, lng] or address string
  const originStr = Array.isArray(origin) ? `${origin[0]},${origin[1]}` : origin;
  const destStr = Array.isArray(destination) ? `${destination[0]},${destination[1]}` : destination;

  params.set('origin', originStr);
  params.set('destination', destStr);

  // Add waypoints if provided
  if (waypoints && waypoints.length > 0) {
    const shouldOptimize = options?.optimize ?? true;
    const waypointStrings = waypoints.map(wp => {
      const locStr = Array.isArray(wp.location) 
        ? `${wp.location[0]},${wp.location[1]}` 
        : wp.location;
      // stopover=true (default) = can be reordered by Google
      // stopover=false = via waypoint (NOT reordered, but no stop time)
      // Only add 'via:' prefix for non-stopover waypoints
      return wp.stopover === false ? `via:${locStr}` : locStr;
    });
    
    // Google expects: waypoints=optimize:true|lat1,lng1|lat2,lng2|...
    // The optimize flag goes INSIDE the waypoints string at the start
    if (shouldOptimize && waypointStrings.length > 0) {
      waypointStrings[0] = `optimize:true|${waypointStrings[0]}`;
    }
    
    params.set('waypoints', waypointStrings.join('|'));
  }

  // Set travel mode (default: driving)
  const travelMode = options?.travelMode ?? 'driving';
  params.set('mode', travelMode);

  const url = `${GOOGLE_MAPS_BASE}/directions/json?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Directions API error: ${response.statusText}`);
  }

  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK') {
    const errorMessages: Record<string, string> = {
      'NOT_FOUND': 'One or more of the specified locations could not be found',
      'ZERO_RESULTS': 'No route could be found between the specified locations',
      'MAX_WAYPOINTS_EXCEEDED': 'Too many waypoints in the request',
      'INVALID_REQUEST': 'The provided request was invalid',
      'OVER_QUERY_LIMIT': 'API quota exceeded',
      'REQUEST_DENIED': 'API request denied',
      'UNKNOWN_ERROR': 'Server error - please try again',
    };
    throw new Error(errorMessages[data.status] || `Directions API error: ${data.status}`);
  }

  return data;
}

/**
 * Geocode an address to coordinates
 * Uses Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env.local');
  }

  const params = new URLSearchParams({
    address: address,
    key: apiKey,
  });

  const url = `${GOOGLE_MAPS_BASE}/geocode/json?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.statusText}`);
  }

  const data: GeocodingResponse = await response.json();

  if (data.status !== 'OK') {
    const errorMessages: Record<string, string> = {
      'ZERO_RESULTS': 'No results found for the specified address',
      'OVER_QUERY_LIMIT': 'API quota exceeded',
      'REQUEST_DENIED': 'API request denied',
      'INVALID_REQUEST': 'The provided request was invalid',
      'UNKNOWN_ERROR': 'Server error - please try again',
    };
    throw new Error(errorMessages[data.status] || `Geocoding API error: ${data.status}`);
  }

  if (data.results.length === 0) {
    throw new Error('No results found for the specified address');
  }

  const result = data.results[0];
  
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

/**
 * Reverse geocode coordinates to address
 * Uses Google Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string;
  placeId: string;
  components: Record<string, string>;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env.local');
  }

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: apiKey,
  });

  const url = `${GOOGLE_MAPS_BASE}/geocode/json?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.statusText}`);
  }

  const data: GeocodingResponse = await response.json();

  if (data.status !== 'OK') {
    const errorMessages: Record<string, string> = {
      'ZERO_RESULTS': 'No results found for the specified coordinates',
      'OVER_QUERY_LIMIT': 'API quota exceeded',
      'REQUEST_DENIED': 'API request denied',
      'INVALID_REQUEST': 'The provided request was invalid',
      'UNKNOWN_ERROR': 'Server error - please try again',
    };
    throw new Error(errorMessages[data.status] || `Geocoding API error: ${data.status}`);
  }

  if (data.results.length === 0) {
    throw new Error('No results found for the specified coordinates');
  }

  const result = data.results[0];
  
  // Extract address components
  const components: Record<string, string> = {};
  for (const component of result.address_components) {
    for (const type of component.types) {
      components[type] = component.long_name;
    }
  }
  
  return {
    address: result.formatted_address,
    placeId: result.place_id,
    components,
  };
}

/**
 * Get distance matrix for multiple origins and destinations
 * Useful for calculating travel times and distances between multiple points
 */
/**
 * Validates that coordinates are within valid latitude/longitude ranges
 * @throws {Error} If any coordinate is out of range
 */
function validateCoordinates(coordinates: [number, number][]): void {
  for (let i = 0; i < coordinates.length; i++) {
    const [lat, lng] = coordinates[i];
    if (lat < -90 || lat > 90) {
      throw new Error(
        `Invalid latitude ${lat} at index ${i}. Must be between -90 and 90.`
      );
    }
    if (lng < -180 || lng > 180) {
      throw new Error(
        `Invalid longitude ${lng} at index ${i}. Must be between -180 and 180.`
      );
    }
  }
}

/**
 * Estimate duration using Haversine distance formula
 * Used as fallback when Distance Matrix API fails
 * 
 * @param from - Origin coordinate [lat, lng]
 * @param to - Destination coordinate [lat, lng]
 * @param avgSpeedKmh - Assumed average speed (default: 50 km/h for urban)
 * @returns Estimated duration in seconds
 */
function estimateDurationFromHaversine(
  from: [number, number],
  to: [number, number],
  avgSpeedKmh = 50
): number {
  // Handle same point
  if (from[0] === to[0] && from[1] === to[1]) {
    return 0;
  }
  
  const R = 6371; // Earth's radius in km
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  
  // Convert to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  // Convert to duration in seconds
  const durationHours = distanceKm / avgSpeedKmh;
  const durationSeconds = Math.round(durationHours * 3600);
  
  return durationSeconds;
}

/**
 * Calculate duration matrix using Google Distance Matrix API
 * 
 * Uses optimized batching strategy:
 * - N ≤ 25: Single batch (fast path)
 * - N > 25: 2D batching with 25×25 chunks
 * 
 * Automatically falls back to Haversine distance estimation for:
 * - Elements with status !== 'OK' (e.g., ZERO_RESULTS, NOT_FOUND)
 * - Batches that fail due to network errors
 * 
 * @param coordinates - Array of [latitude, longitude] tuples
 * @returns Promise<number[][]> - N×N matrix of durations in seconds
 * 
 * @throws {Error} If all batches fail (API unavailable)
 * @throws {Error} If coordinates are invalid (out of range)
 * 
 * @example
 * ```typescript
 * const coords: [number, number][] = [
 *   [40.7128, -74.0060], // NYC
 *   [34.0522, -118.2437], // LA
 * ];
 * const durations = await getDurationMatrix(coords);
 * // [[0, 14400], [14400, 0]] (example values in seconds)
 * ```
 * 
 * Performance:
 * - N=31: ~2s (4 batches)
 * - N=100: ~8s (16 batches)
 * - N=300: ~72s (144 batches) - consider using clustering instead
 */
export async function getDurationMatrix(
  coordinates: [number, number][] // Array of [lat, lng]
): Promise<number[][]> {
  const n = coordinates.length;
  
  // Edge cases
  if (n === 0) return [];
  if (n === 1) return [[0]];
  
  // Validate coordinates
  validateCoordinates(coordinates);
  
  // Google Distance Matrix API has limits:
  // - Maximum 100 elements per request (Standard plan: origins × destinations)
  // - Maximum 625 elements per request (Premium plan: 25 origins × 25 destinations)
  // With 2D batching at 25 per dimension: 25×25 = 625 elements per batch (Premium limit)
  // For N ≤ 25: single batch. For N > 25: ceil(N/25)² batches.
  const MAX_PER_DIMENSION = 25; // Google API hard limit (Premium plan: 25×25=625 elements)
  
  // Fast path: N ≤ 25 (single batch)
  if (n <= MAX_PER_DIMENSION) {
    try {
      const response = await getDistanceMatrix(coordinates, coordinates);
      const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
      
      for (let i = 0; i < response.rows.length; i++) {
        for (let j = 0; j < response.rows[i].elements.length; j++) {
          const element = response.rows[i].elements[j];
          
          if (element.status === 'OK') {
            durations[i][j] = element.duration.value;
          } else {
            // Fallback to Haversine
            durations[i][j] = estimateDurationFromHaversine(
              coordinates[i],
              coordinates[j]
            );
            console.warn(
              `Element status ${element.status} at [${i}][${j}], using Haversine estimate`
            );
          }
        }
      }
      
      return durations;
    } catch (error) {
      console.error('Fast path failed, falling back to Haversine for all elements:', error);
      
      // Complete fallback
      const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          durations[i][j] = estimateDurationFromHaversine(coordinates[i], coordinates[j]);
        }
      }
      return durations;
    }
  }
  
  // 2D Batching: N > 25
  const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  let successfulBatches = 0;
  let failedBatches = 0;
  const totalBatches = Math.ceil(n / MAX_PER_DIMENSION) ** 2;
  
  console.log(
    `[getDurationMatrix] N=${n}, batches=${totalBatches}, using 2D batching`
  );
  
  // Nested loop: batch BOTH dimensions
  for (let i = 0; i < n; i += MAX_PER_DIMENSION) {
    for (let j = 0; j < n; j += MAX_PER_DIMENSION) {
      const iEnd = Math.min(i + MAX_PER_DIMENSION, n);
      const jEnd = Math.min(j + MAX_PER_DIMENSION, n);
      
      const originBatch = coordinates.slice(i, iEnd);
      const destBatch = coordinates.slice(j, jEnd);
      
      console.log(
        `[Batch ${successfulBatches + failedBatches + 1}/${totalBatches}] ` +
        `origins[${i}-${iEnd-1}] × destinations[${j}-${jEnd-1}] ` +
        `(${originBatch.length}×${destBatch.length} = ${originBatch.length * destBatch.length} elements)`
      );
      
      try {
        const response = await getDistanceMatrix(originBatch, destBatch);
        successfulBatches++;
        
        // Map batch results to global matrix
        for (let row = 0; row < response.rows.length; row++) {
          const globalRow = i + row;
          for (let col = 0; col < response.rows[row].elements.length; col++) {
            const globalCol = j + col;
            const element = response.rows[row].elements[col];
            
            if (element.status === 'OK') {
              durations[globalRow][globalCol] = element.duration.value;
            } else {
              // Element-level fallback
              durations[globalRow][globalCol] = estimateDurationFromHaversine(
                coordinates[globalRow],
                coordinates[globalCol]
              );
              console.warn(
                `Element status ${element.status} at [${globalRow}][${globalCol}], using Haversine`
              );
            }
          }
        }
      } catch (error) {
        // Batch-level fallback
        failedBatches++;
        console.error(
          `Batch failed at origins ${i}-${iEnd-1}, destinations ${j}-${jEnd-1}:`,
          error
        );
        
        for (let row = i; row < iEnd; row++) {
          for (let col = j; col < jEnd; col++) {
            durations[row][col] = estimateDurationFromHaversine(
              coordinates[row],
              coordinates[col]
            );
          }
        }
      }
    }
  }
  
  // Check for complete failure
  if (successfulBatches === 0 && failedBatches > 0) {
    throw new Error(
      `Distance Matrix API unavailable. All ${failedBatches} batches failed.`
    );
  }
  
  if (failedBatches > 0) {
    console.warn(
      `${failedBatches} of ${totalBatches} batches failed. ` +
      `Route uses estimated distances for failed segments.`
    );
  }
  
  return durations;
}

export async function getDistanceMatrix(
  origins: Array<[number, number] | string>,
  destinations: Array<[number, number] | string>,
  options?: {
    travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    departureTime?: Date;
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  }
): Promise<DistanceMatrixResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env.local');
  }

  const params = new URLSearchParams({ key: apiKey });

  // Convert origins to string format
  const originStrs = origins.map(o => 
    Array.isArray(o) ? `${o[0]},${o[1]}` : o
  );
  const destStrs = destinations.map(d => 
    Array.isArray(d) ? `${d[0]},${d[1]}` : d
  );

  params.set('origins', originStrs.join('|'));
  params.set('destinations', destStrs.join('|'));

  // Set travel mode (default: driving)
  const travelMode = options?.travelMode ?? 'driving';
  params.set('mode', travelMode);

  // Add departure time for traffic estimation (requires future time)
  if (options?.departureTime) {
    params.set('departure_time', Math.floor(options.departureTime.getTime() / 1000).toString());
    if (options.trafficModel) {
      params.set('traffic_model', options.trafficModel);
    }
  }

  const url = `${GOOGLE_MAPS_BASE}/distancematrix/json?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Distance Matrix API error: ${response.statusText}`);
  }

  const data: DistanceMatrixResponse = await response.json();

  if (data.status !== 'OK') {
    const errorMessages: Record<string, string> = {
      'INVALID_REQUEST': 'The provided request was invalid',
      'MAX_DIMENSIONS_EXCEEDED': 'Too many origins or destinations',
      'MAX_ELEMENTS_EXCEEDED': 'Too many origin-destination pairs',
      'OVER_QUERY_LIMIT': 'API quota exceeded',
      'REQUEST_DENIED': 'API request denied',
      'UNKNOWN_ERROR': 'Server error - please try again',
    };
    throw new Error(errorMessages[data.status] || `Distance Matrix API error: ${data.status}`);
  }

  return data;
}
