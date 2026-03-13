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
 * Raw Nominatim API response type
 */
export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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

  return results.map((r: NominatimResult) => ({
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

/**
 * Normalize address format from OCR short format to full format
 * e.g., "Q Junín 568" -> "Calle Junín 568"
 * e.g., "B Arguello 123" -> "Boulevard Arguello 123"
 * e.g., "A Corrientes 456" -> "Avenida Corrientes 456"
 */
export function normalizeAddressFormat(address: string): string {
  // First normalize common abbreviations
  let normalized = address
    // Replace Q (Calle) at start
    .replace(/^Q\s+/i, '')
    // Replace B (Boulevard) at start
    .replace(/^B\s+/i, 'Boulevard ')
    // Replace A (Avenida) at start
    .replace(/^A\s+/i, 'Avenida ')
    // Common street type abbreviations
    .replace(/\bav\.?\s+/gi, 'Avenida ')
    .replace(/\bdr\.?\s+/gi, 'Doctor ')
    .replace(/\bgral\.?\s+/gi, 'General ')
    .replace(/\bpte\.?\s+/gi, 'Presidente ')
    .replace(/\bsgto\.?\s+/gi, 'Sargento ')
    .replace(/\bcnel\.?\s+/gi, 'Coronel ')
    .replace(/\bint\.?\s+/gi, 'Intendente ');

  // If it looks like a street address without city, add default city
  // Pattern: Street + number at end (e.g., "Calle Junín 568")
  const hasStreetNumber = /\d{2,5}$/.test(normalized.trim());
  const hasCity = /(?:Buenos Aires|CABA|Ciudad|Municipio)/i.test(normalized);

  if (hasStreetNumber && !hasCity) {
    // Try to detect if it looks like a complete address already
    const parts = normalized.split(',');
    if (parts.length === 1) {
      // Single line address, append default city
      normalized = `${normalized}, Buenos Aires, Argentina`;
    }
  }

  return normalized;
}

/**
 * Try to geocode an address with multiple format attempts
 * This helps with OCR-extracted addresses that may be in short format
 */
export async function geocodeAddressWithFallback(address: string): Promise<GeocodeResult> {
  const formats = [
    address,
    normalizeAddressFormat(address),
    `${address}, Buenos Aires, Argentina`,
    normalizeAddressFormat(`${address}, Buenos Aires, Argentina`),
  ];

  const triedFormats: string[] = [];

  for (const format of formats) {
    if (triedFormats.includes(format.toLowerCase())) {
      continue;
    }
    triedFormats.push(format.toLowerCase());

    try {
      const result = await geocodeAddress(format);
      return result;
    } catch (error) {
      // Format didn't work, try next one
      console.debug(`Geocode attempt failed for "${format}":`, error);
    }
  }

  throw new Error(`Could not geocode address "${address}" with any format`);
}
