/**
 * Google Maps API Client Implementation
 * Core client with Directions, Geocoding, and Distance Matrix methods
 */

import {
  GoogleDirectionsResponse,
  GoogleGeocodingResponse,
  GoogleDistanceMatrixResponse,
  RouteResult,
  GeocodeResult,
  SearchResult,
  MatrixResult,
  GoogleDirectionsLeg,
  GoogleDirectionsRoute,
} from './types';
import { decodePolyline } from './polyline';
import { validateCoordinates, validateAddress, isWithinRosarioBounds, isAcceptableLocationType, normalizeAddress } from './validation';
import { API } from '../constants';

const GOOGLE_DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';
const GOOGLE_GEOCODING_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MATRIX_BASE = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// Use centralized API constants
const { MAX_RETRIES, RETRY_DELAYS, REQUEST_TIMEOUT } = API.GOOGLE_MAPS;

/**
 * Google Maps API Client
 * All API calls are made server-side to protect the API key
 */
export class GoogleMapsClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make a fetch request with retry logic and timeout
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for specific Google API error statuses
        if (!response.ok) {
          const errorText = await response.text();
          
          // Check for OVER_QUERY_LIMIT - should retry
          if (response.status === 429 || errorText.includes('OVER_QUERY_LIMIT')) {
            if (attempt < retries) {
              console.warn(`[Google Maps] Rate limited, retrying in ${RETRY_DELAYS[attempt]}ms...`);
              await this.sleep(RETRY_DELAYS[attempt]);
              continue;
            }
          }

          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json() as T;

        // Check Google API status
        const status = (data as any).status;
        if (status === 'OVER_QUERY_LIMIT') {
          if (attempt < retries) {
            console.warn(`[Google Maps] Query limit, retrying in ${RETRY_DELAYS[attempt]}ms...`);
            await this.sleep(RETRY_DELAYS[attempt]);
            continue;
          }
          throw new Error('Google API query limit exceeded after retries');
        }

        if (status === 'REQUEST_DENIED') {
          throw new Error(`Google API request denied: ${(data as any).error_message || 'Unknown error'}`);
        }

        if (status === 'INVALID_REQUEST') {
          throw new Error(`Invalid request: ${(data as any).error_message || 'Check parameters'}`);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('not configured') || error.message.includes('Invalid request')) {
            throw error;
          }
        }

        if (attempt < retries) {
          console.warn(`[Google Maps] Request failed, retrying (attempt ${attempt + 1}/${retries}):`, error);
          await this.sleep(RETRY_DELAYS[attempt]);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // Directions API
  // ============================================

  /**
   * Get route directions between multiple points
   * @param coordinates - Array of [lng, lat] coordinates
   * @param optimizeWaypoints - Whether to optimize waypoint order
   * @returns Route result with decoded polyline
   */
  async getRoute(
    coordinates: number[][], 
    optimizeWaypoints = false
  ): Promise<RouteResult> {
    // Validate coordinates
    const validation = validateCoordinates(coordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    if (coordinates.length < 2) {
      throw new Error('At least 2 coordinates required for route');
    }

    // Build origin and destination
    const origin = `${coordinates[0][1]},${coordinates[0][0]}`; // lat,lng format
    const destination = `${coordinates[coordinates.length - 1][1]},${coordinates[coordinates.length - 1][0]}`;

    // Build waypoints if more than 2 coordinates
    let waypoints: string | undefined;
    if (coordinates.length > 2) {
      const wpCoords = coordinates.slice(1, -1);
      waypoints = wpCoords
        .map(c => `${c[1]},${c[0]}`) // lat,lng format
        .join('|');
    }

    // Build URL
    const params = new URLSearchParams({
      origin,
      destination,
      mode: 'driving',
      key: this.apiKey,
    });

    if (waypoints) {
      params.set('waypoints', waypoints);
      if (optimizeWaypoints) {
        params.set('optimize', 'true');
      }
    }

    const url = `${GOOGLE_DIRECTIONS_BASE}?${params.toString()}`;

    console.log('[Google Maps] Getting route with', coordinates.length, 'points, optimize:', optimizeWaypoints);

    const response = await this.fetchWithRetry<GoogleDirectionsResponse>(url, {
      method: 'GET',
    });

    if (response.status !== 'OK') {
      if (response.status === 'ZERO_RESULTS') {
        throw new Error('No route found between the specified locations');
      }
      if (response.status === 'NOT_FOUND') {
        throw new Error('One or more locations could not be geocoded');
      }
      throw new Error(`Directions API error: ${response.status}`);
    }

    if (!response.routes || response.routes.length === 0) {
      throw new Error('No route returned from Google Directions API');
    }

    return this.mapDirectionsResponse(response.routes[0]);
  }

  /**
   * Map Google Directions response to internal RouteResult format
   */
  private mapDirectionsResponse(route: GoogleDirectionsRoute): RouteResult {
    // Decode the polyline - Google returns [lat, lng], but we need [lng, lat] for GeoJSON
    const decodedPolyline = decodePolyline(route.overview_polyline.points);
    const coordinates = decodedPolyline.map(([lat, lng]) => [lng, lat] as [number, number]);

    // Sum up total distance and duration from legs
    let totalDistance = 0;
    let totalDuration = 0;
    const legs = route.legs.map((leg: GoogleDirectionsLeg) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
      
      return {
        duration: leg.duration.value,
        distance: leg.distance.value,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
          duration: step.duration.value,
          distance: step.distance.value,
        })),
      };
    });

    return {
      geometry: {
        coordinates,
        type: 'LineString',
      },
      duration: totalDuration,
      distance: totalDistance,
      legs,
    };
  }

  // ============================================
  // Distance Matrix API
  // ============================================

  /**
   * Get distance matrix for multiple coordinates
   * @param coordinates - Array of [lng, lat] coordinates
   * @returns Matrix with durations and distances
   */
  async getMatrix(coordinates: number[][]): Promise<MatrixResult> {
    // Validate coordinates
    const validation = validateCoordinates(coordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    if (coordinates.length > 25) {
      throw new Error('Maximum 25 origins/destinations per request. Use batching for larger matrices.');
    }

    // Build origins and destinations strings
    const origins = coordinates.map(c => `${c[1]},${c[0]}`).join('|');
    const destinations = coordinates.map(c => `${c[1]},${c[0]}`).join('|');

    const params = new URLSearchParams({
      origins,
      destinations,
      mode: 'driving',
      key: this.apiKey,
    });

    const url = `${GOOGLE_MATRIX_BASE}?${params.toString()}`;

    console.log('[Google Maps] Getting matrix for', coordinates.length, 'points');

    const response = await this.fetchWithRetry<GoogleDistanceMatrixResponse>(url, {
      method: 'GET',
    });

    if (response.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${response.status}`);
    }

    // Map response to internal format
    const durations: number[][] = [];
    const distances: number[][] = [];

    for (let i = 0; i < response.rows.length; i++) {
      const rowDurations: number[] = [];
      const rowDistances: number[] = [];
      
      for (let j = 0; j < response.rows[i].elements.length; j++) {
        const element = response.rows[i].elements[j];
        
        if (element.status !== 'OK') {
          // Use Infinity for unreachable routes
          rowDurations.push(Infinity);
          rowDistances.push(Infinity);
        } else {
          rowDurations.push(element.duration?.value ?? Infinity);
          rowDistances.push(element.distance?.value ?? Infinity);
        }
      }
      
      durations.push(rowDurations);
      distances.push(rowDistances);
    }

    return { durations, distances };
  }

  // ============================================
  // Geocoding API
  // ============================================

  /**
   * Geocode an address to coordinates
   * @param address - Address string to geocode
   * @returns Geocode result
   */
  async geocode(address: string): Promise<GeocodeResult> {
    // Validate address
    const validation = validateAddress(address);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Try with normalized address (add Rosario context)
    const normalized = normalizeAddress(address);

    const params = new URLSearchParams({
      address: normalized,
      key: this.apiKey,
    });

    const url = `${GOOGLE_GEOCODING_BASE}?${params.toString()}`;

    console.log('[Google Maps] Geocoding address:', normalized);

    const response = await this.fetchWithRetry<GoogleGeocodingResponse>(url, {
      method: 'GET',
    });

    if (response.status === 'ZERO_RESULTS') {
      // Try original address if normalized didn't work
      if (normalized !== address) {
        return this.geocodeWithFallback(address, address);
      }
      throw new Error('Address not found');
    }

    if (response.status !== 'OK') {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    if (!response.results || response.results.length === 0) {
      throw new Error('No results returned from geocoding');
    }

    // Use the first result (most relevant)
    const result = response.results[0];

    // Validate location type
    if (!isAcceptableLocationType(result.geometry.location_type)) {
      console.warn('[Google Maps] Geocoding returned approximate location:', result.geometry.location_type);
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      displayName: result.formatted_address,
      placeId: result.place_id,
      locationType: result.geometry.location_type,
    };
  }

  /**
   * Fallback geocoding with original address
   */
  private async geocodeWithFallback(
    originalAddress: string, 
    normalizedAddress: string
  ): Promise<GeocodeResult> {
    const params = new URLSearchParams({
      address: originalAddress,
      key: this.apiKey,
    });

    const url = `${GOOGLE_GEOCODING_BASE}?${params.toString()}`;

    const response = await this.fetchWithRetry<GoogleGeocodingResponse>(url, {
      method: 'GET',
    });

    if (response.status === 'ZERO_RESULTS' || response.status !== 'OK') {
      throw new Error(`Address not found: "${originalAddress}"`);
    }

    const result = response.results[0];

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      displayName: result.formatted_address,
      placeId: result.place_id,
      locationType: result.geometry.location_type,
    };
  }

  /**
   * Reverse geocode coordinates to an address
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Formatted address string
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // Validate coordinates
    const validation = validateCoordinates([[lat, lng]]);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey,
    });

    const url = `${GOOGLE_GEOCODING_BASE}?${params.toString()}`;

    console.log('[Google Maps] Reverse geocoding:', lat, lng);

    const response = await this.fetchWithRetry<GoogleGeocodingResponse>(url, {
      method: 'GET',
    });

    if (response.status === 'ZERO_RESULTS') {
      throw new Error('No address found for these coordinates');
    }

    if (response.status !== 'OK') {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    if (!response.results || response.results.length === 0) {
      throw new Error('No results returned from reverse geocoding');
    }

    return response.results[0].formatted_address;
  }

  /**
   * Search for addresses (autocomplete-like)
   * @param query - Search query
   * @returns Array of search results
   */
  async searchAddresses(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 3) {
      return [];
    }

    // Add Rosario context to improve results
    const enhancedQuery = /rosario|santa fe/i.test(query) 
      ? query 
      : `${query}, Rosario`;

    const params = new URLSearchParams({
      address: enhancedQuery,
      key: this.apiKey,
    });

    const url = `${GOOGLE_GEOCODING_BASE}?${params.toString()}`;

    console.log('[Google Maps] Searching addresses:', enhancedQuery);

    const response = await this.fetchWithRetry<GoogleGeocodingResponse>(url, {
      method: 'GET',
    });

    if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    if (!response.results || response.results.length === 0) {
      return [];
    }

    return response.results.slice(0, 5).map(result => ({
      placeId: result.place_id,
      displayName: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    }));
  }
}
