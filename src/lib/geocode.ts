import { cacheStorage } from './storage';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const RATE_LIMIT_MS = 1000; // 1 request per second

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface SearchResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Geocode a single address to coordinates
 * Uses cache to avoid repeated requests
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // Check cache first
  const cacheKey = `geocode:${address.toLowerCase()}`;
  const cached = await cacheStorage.get<GeocodeResult>(cacheKey);
  
  if (cached) {
    return cached;
  }

  await rateLimit();

  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&countrycodes=AR&limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RouteFlow/1.0 (routeflow.app)',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.statusText}`);
  }

  const results = await response.json();

  if (results.length === 0) {
    throw new Error('Address not found');
  }

  const result: GeocodeResult = {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };

  // Cache for 24 hours
  await cacheStorage.set(cacheKey, result, 24 * 60);

  return result;
}

/**
 * Search for addresses (autocomplete)
 * Returns list of matching addresses
 */
export async function searchAddresses(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  await rateLimit();

  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=AR&limit=5`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RouteFlow/1.0 (routeflow.app)',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const results = await response.json();

  return results.map((r: any) => ({
    placeId: r.place_id,
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

/**
 * Reverse geocode: coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  await rateLimit();

  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RouteFlow/1.0 (routeflow.app)',
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.display_name || '';
}
