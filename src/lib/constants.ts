/**
 * Named constants for Route Flow
 * Avoids magic numbers throughout the codebase
 */

// TSP optimization weights
export const DEFAULT_ALPHA = 0.7; // time weight
export const DEFAULT_BETA = 0.3;  // distance weight

// Earth radius
export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS_METERS = 6371000;

// API Configuration
export const API = {
  // Google Maps API
  GOOGLE_MAPS: {
    MAX_RETRIES: 3,
    RETRY_DELAYS: [1000, 2000, 4000] as const, // Exponential backoff in ms
    REQUEST_TIMEOUT: 10000, // 10 seconds
    MAX_WAYPOINTS: 25,
  },
  
  // Nominatim (OpenStreetMap)
  NOMINATIM: {
    MIN_DELAY_MS: 1000, // Rate limit: 1 request per second
    MAX_RESULTS: 5,
    USER_AGENT: 'RouteFlow/1.0 (routeflow.app)',
  },
  
  // ORS (OpenRouteService)
  ORS: {
    MIN_DELAY_MS: 1000,
    BATCH_SIZE: 100,
  },
  
  // General
  DEFAULT_BATCH_SIZE: 25,
  MAX_ADDRESSES: 100,
} as const;