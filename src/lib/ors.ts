const ORS_BASE_URL = 'https://api.openrouteservice.org';

interface ORSConfig {
  apiKey: string;
}

/**
 * Check if ORS API key is configured
 */
export function isApiKeyConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ORS_API_KEY;
}

/**
 * Get ORS API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
  if (!apiKey) {
    throw new Error('ORS API key not configured. Set NEXT_PUBLIC_ORS_API_KEY in .env.local');
  }
  return apiKey;
}

/**
 * Get time/distance matrix from ORS
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Matrix with durations (seconds) and distances (km)
 */
export async function getMatrix(coordinates: number[][]): Promise<{
  durations: number[][];
  distances: number[][];
}> {
  const apiKey = getApiKey();

  const response = await fetch(`${ORS_BASE_URL}/v2/matrix/driving-car`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locations: coordinates,
      metrics: ['duration', 'distance'],
      units: 'km',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ORS Matrix API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    durations: data.durations,
    distances: data.distances,
  };
}

/**
 * Get route directions between multiple points
 * @param coordinates Array of [lng, lat] coordinates
 * @returns Route with geometry and instructions
 */
export interface RouteResult {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  duration: number; // seconds
  distance: number; // meters
  legs: Array<{
    duration: number;
    distance: number;
    steps: Array<{
      instruction: string;
      duration: number;
      distance: number;
    }>;
  }>;
}

export async function getRoute(coordinates: number[][]): Promise<RouteResult> {
  const apiKey = getApiKey();

  // ORS expects [lng, lat] format
  const response = await fetch(`${ORS_BASE_URL}/v2/directions/driving-car`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates,
      format: 'geojson',
      instructions: true,
      instructions_type: 'text',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ORS Directions API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    geometry: data.features[0].geometry,
    duration: data.features[0].properties.summary.duration,
    distance: data.features[0].properties.summary.distance,
    legs: data.features[0].properties.segments.map((seg: any) => ({
      duration: seg.duration,
      distance: seg.distance,
      steps: seg.steps.map((step: any) => ({
        instruction: step.instruction,
        duration: step.duration,
        distance: step.distance,
      })),
    })),
  };
}

/**
 * Decode polyline from ORS (uses encoded polyline by default)
 * For geojson format, geometry is already decoded
 */
export function decodePolyline(encoded: string): number[][] {
  const poly: number[][] = [];
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

    poly.push([lng / 1e5, lat / 1e5]);
  }

  return poly;
}
