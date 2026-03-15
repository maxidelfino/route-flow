/**
 * Google Maps API TypeScript Type Definitions
 * Used for Directions, Geocoding, and Distance Matrix APIs
 */

// ============================================
// Common Types
// ============================================

/** Coordinate point with latitude and longitude */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Coordinate as [lng, lat] array (GeoJSON format) */
export type CoordPair = [number, number];

// ============================================
// Google Directions API Types
// ============================================

/** Top-level Directions API response */
export interface GoogleDirectionsResponse {
  status: GoogleAPIStatus;
  routes: GoogleDirectionsRoute[];
  geocoded_waypoints?: GoogleGeocodedWaypoint[];
}

export type GoogleAPIStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'MAX_WAYPOINTS_EXCEEDED'
  | 'NOT_FOUND'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

/** A single route from Directions API */
export interface GoogleDirectionsRoute {
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
  legs: GoogleDirectionsLeg[];
  overview_polyline: {
    points: string;
  };
  warnings?: string[];
  waypoint_order?: number[];
}

/** A leg between two waypoints in a route */
export interface GoogleDirectionsLeg {
  distance: {
    value: number; // meters
    text: string;
  };
  duration: {
    value: number; // seconds
    text: string;
  };
  start_address: string;
  end_address: string;
  start_location: LatLng;
  end_location: LatLng;
  steps: GoogleDirectionsStep[];
}

/** A single step within a leg */
export interface GoogleDirectionsStep {
  distance: {
    value: number;
    text: string;
  };
  duration: {
    value: number;
    text: string;
  };
  start_location: LatLng;
  end_location: LatLng;
  html_instructions: string;
  maneuver?: string;
  polyline: {
    points: string;
  };
}

/** Geocoded waypoint from Directions API */
export interface GoogleGeocodedWaypoint {
  geocoder_status: GoogleAPIStatus;
  place_id: string;
  types: string[];
}

// ============================================
// Google Geocoding API Types
// ============================================

/** Top-level Geocoding API response */
export interface GoogleGeocodingResponse {
  results: GoogleGeocodedAddress[];
  status: GoogleAPIStatus;
}

/** A single geocoded address */
export interface GoogleGeocodedAddress {
  formatted_address: string;
  geometry: {
    location: LatLng;
    location_type: GoogleLocationType;
    bounds?: {
      northeast: LatLng;
      southwest: LatLng;
    };
    viewport?: {
      northeast: LatLng;
      southwest: LatLng;
    };
  };
  place_id: string;
  types: string[];
  address_components?: GoogleAddressComponent[];
  postcode_localities?: string[];
  partial_match?: boolean;
}

export type GoogleLocationType =
  | 'ROOFTOP'        // Precise geocode
  | 'RANGE_INTERPOLATED' // Interpolated along a range
  | 'GEOMETRIC_CENTER'   // Center of geometry
  | 'APPROXIMATE';       // Approximate location

/** Address component (street number, city, etc.) */
export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// ============================================
// Google Distance Matrix API Types
// ============================================

/** Top-level Distance Matrix API response */
export interface GoogleDistanceMatrixResponse {
  status: GoogleAPIStatus;
  rows: GoogleDistanceMatrixRow[];
  origin_addresses: string[];
  destination_addresses: string[];
}

/** A row in the distance matrix */
export interface GoogleDistanceMatrixRow {
  elements: GoogleDistanceMatrixElement[];
}

/** A single element (origin-destination pair) */
export interface GoogleDistanceMatrixElement {
  status: GoogleDistanceMatrixElementStatus;
  distance?: {
    value: number; // meters
    text: string;
  };
  duration?: {
    value: number; // seconds
    text: string;
  };
  duration_in_traffic?: {
    value: number; // seconds
    text: string;
  };
}

export type GoogleDistanceMatrixElementStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS';

// ============================================
// Internal Route Result Types (matching existing RouteResult interface)
// ============================================

/** Route result format used internally by the app */
export interface RouteResult {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  duration: number; // seconds
  distance: number; // meters
  legs: RouteLeg[];
}

/** A leg in the internal route result */
export interface RouteLeg {
  duration: number;
  distance: number;
  steps: RouteStep[];
}

/** A step in a route leg */
export interface RouteStep {
  instruction: string;
  duration: number;
  distance: number;
}

// ============================================
// Geocoding Result Types
// ============================================

/** Geocoding result for address lookup */
export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  placeId?: string;
  locationType?: GoogleLocationType;
}

/** Search result for address autocomplete */
export interface SearchResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
}

// ============================================
// Matrix Result Types
// ============================================

/** Distance matrix result */
export interface MatrixResult {
  durations: number[][];
  distances: number[][];
}
