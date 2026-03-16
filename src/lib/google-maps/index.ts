/**
 * Google Maps API Client
 * Provides typed wrapper for Directions, Geocoding, and Distance Matrix APIs
 */

import { GoogleMapsClient } from './client';
import { decodePolyline, encodePolyline, POLYLINE_TESTS, validatePolylineDecoder } from './polyline';
import {
  validateCoordinate,
  validateCoordinates,
  validateAddress,
  isWithinRosarioBounds,
  isAcceptableLocationType,
  normalizeAddress,
} from './validation';

export * from './types';
export * from './polyline';
export * from './validation';

// ============================================
// Factory Functions
// ============================================

/**
 * Get Google Maps API key from environment
 * Uses server-side only GOOGLE_MAPS_API_KEY (not NEXT_PUBLIC_)
 */
export function getGoogleMapsApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'Google Maps API key not configured. ' +
      'Set GOOGLE_MAPS_API_KEY in .env.local (server-side only, do NOT use NEXT_PUBLIC_ prefix).'
    );
  }
  
  return apiKey;
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

/**
 * Create a new Google Maps API client
 */
export function createGoogleMapsClient(): GoogleMapsClient {
  const apiKey = getGoogleMapsApiKey();
  return new GoogleMapsClient(apiKey);
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Get a route between multiple coordinates using Google Directions
 * @param coordinates - Array of [lng, lat] coordinates
 * @param optimizeWaypoints - Whether to optimize waypoint order
 * @returns Route result with polyline
 */
export async function getRoute(
  coordinates: number[][], 
  optimizeWaypoints = false
) {
  const client = createGoogleMapsClient();
  return client.getRoute(coordinates, optimizeWaypoints);
}

/**
 * Get distance matrix for multiple coordinates
 * @param coordinates - Array of [lng, lat] coordinates
 * @returns Matrix with durations and distances
 */
export async function getMatrix(coordinates: number[][]) {
  const client = createGoogleMapsClient();
  return client.getMatrix(coordinates);
}

/**
 * Geocode an address to coordinates
 * @param address - Address string to geocode
 * @returns Geocode result with lat/lng
 */
export async function geocode(address: string) {
  const client = createGoogleMapsClient();
  return client.geocode(address);
}

/**
 * Reverse geocode coordinates to an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address string
 */
export async function reverseGeocode(lat: number, lng: number) {
  const client = createGoogleMapsClient();
  return client.reverseGeocode(lat, lng);
}

/**
 * Search for addresses (autocomplete)
 * @param query - Search query
 * @returns Array of search results
 */
export async function searchAddresses(query: string) {
  const client = createGoogleMapsClient();
  return client.searchAddresses(query);
}

// ============================================
// Utility Exports
// ============================================

export {
  decodePolyline,
  encodePolyline,
  POLYLINE_TESTS,
  validatePolylineDecoder,
  validateCoordinate,
  validateCoordinates,
  validateAddress,
  isWithinRosarioBounds,
  isAcceptableLocationType,
  normalizeAddress,
};
