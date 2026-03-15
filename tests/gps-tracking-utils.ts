import { Page, test } from '@playwright/test';

/**
 * Mock geolocation position interface
 */
export interface MockGeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

/**
 * Set mock position for geolocation API
 * @param page Playwright page
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param accuracy Accuracy in meters (default: 10)
 */
export async function setMockPosition(
  page: Page,
  latitude: number,
  longitude: number,
  accuracy = 10
): Promise<void> {
  await page.evaluate(
    ({ lat, lng, acc }) => {
      const mockPosition: MockGeolocationPosition = {
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
        },
        timestamp: Date.now(),
      };

      // Override navigator.geolocation
      (navigator.geolocation as unknown as Record<string, unknown>).getCurrentPosition = (
        successCallback: (position: MockGeolocationPosition) => void,
        _errorCallback?: unknown,
        _options?: unknown
      ) => {
        successCallback(mockPosition);
      };

      (navigator.geolocation as unknown as Record<string, unknown>).watchPosition = (
        successCallback: (position: MockGeolocationPosition) => void,
        _errorCallback?: unknown,
        _options?: unknown
      ) => {
        // Immediately call the success callback
        successCallback(mockPosition);
        // Return a fake watch ID
        return 1;
      };

      (navigator.geolocation as unknown as Record<string, unknown>).clearWatch = (_watchId: number) => {
        // No-op for mock
      };
    },
    { lat: latitude, lng: longitude, acc: accuracy }
  );
}

/**
 * Simulate user deviating from route
 * @param page Playwright page
 * @param routeCoords Array of [lng, lat] coordinates representing the route
 * @param distanceMeters Distance in meters to deviate from the nearest point
 */
export async function simulateDeviation(
  page: Page,
  routeCoords: number[][],
  distanceMeters: number
): Promise<void> {
  // Find the middle point of the route
  const midIndex = Math.floor(routeCoords.length / 2);
  const [lng, lat] = routeCoords[midIndex];

  // Calculate a new position perpendicular to the route
  // This is a simplified deviation - move ~0.001 degrees (approx 100m)
  const deviationFactor = distanceMeters / 111000; // rough conversion to degrees
  const deviationLat = lat + deviationFactor;
  const deviationLng = lng;

  await setMockPosition(page, deviationLat, deviationLng, 10);
}

/**
 * Helper to wait for map to be ready
 */
export async function waitForMapReady(page: Page): Promise<void> {
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
}

/**
 * Helper to get bounding box of route on map
 */
export async function getRouteBounds(page: Page): Promise<{
  north: number;
  south: number;
  east: number;
  west: number;
} | null> {
  return page.evaluate(() => {
    // Access Leaflet map instance
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) return null;

    // Try to get bounds from Leaflet
    const leaflet = (window as unknown as Record<string, unknown>).L as {
      map?: {
        getBounds?: () => {
          getNorth: () => number;
          getSouth: () => number;
          getEast: () => number;
          getWest: () => number;
        };
      };
    };

    if (leaflet?.map) {
      const bounds = leaflet.map.getBounds?.();
      if (bounds) {
        return {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };
      }
    }
    return null;
  });
}

/**
 * Check if user marker exists on map
 */
export async function hasUserMarker(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Look for user location marker
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    for (const marker of markers) {
      const alt = marker.getAttribute('alt');
      if (alt && (alt.toLowerCase().includes('user') || alt.toLowerCase().includes('location'))) {
        return true;
      }
    }
    // Also check for circle marker (accuracy radius)
    const circles = document.querySelectorAll('.leaflet-circle');
    return circles.length > 0;
  });
}

/**
 * Check if deviation warning is visible
 */
export async function hasDeviationWarning(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Look for warning elements with deviation-related text
    const warningSelectors = [
      '.leaflet-control', // Leaflet controls
      '[class*="warning"]',
      '[class*="deviation"]',
      '[class*="alert"]',
    ];

    for (const selector of warningSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('desvi') || text.includes('route') || text.includes('off')) {
          return true;
        }
      }
    }
    return false;
  });
}
