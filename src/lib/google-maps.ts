/**
 * Google Maps API integration utilities
 * Server-side only - uses GOOGLE_MAPS_API_KEY from environment
 */

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

/**
 * Polyline decoder utility
 * Decodes an encoded polyline string into an array of [lat, lng] coordinates
 * @param encoded - The encoded polyline string from Google Maps API
 * @returns Array of [lat, lng] coordinate pairs
 */
export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  
  const poly: [number, number][] = [];
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

    // Google returns lat, lng - we convert to [lat, lng] for Leaflet
    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

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
