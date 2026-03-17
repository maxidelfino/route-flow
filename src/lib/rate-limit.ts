/**
 * Rate Limiting Utilities
 * Reusable rate limiting for external APIs
 */

import { API } from './constants';

interface RateLimiterOptions {
  /** Minimum delay between requests in milliseconds */
  minDelayMs: number;
  /** Optional: Custom clock (useful for testing) */
  clock?: () => number;
}

let defaultLastRequestTime = 0;

/**
 * Creates a rate limiter function
 * @param options - Configuration for the rate limiter
 * @returns A rate limiter function that returns a Promise
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { minDelayMs, clock = () => Date.now() } = options;
  let lastRequestTime = 0;

  return async function rateLimit(): Promise<void> {
    const now = clock();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < minDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, minDelayMs - timeSinceLastRequest)
      );
    }

    lastRequestTime = clock();
  };
}

/**
 * Global rate limiter for Nominatim API (1 request per second)
 * Reusable across the application
 */
export const rateLimitNominatim = createRateLimiter({
  minDelayMs: API.NOMINATIM.MIN_DELAY_MS,
});

/**
 * Reset the global rate limiter (useful for testing)
 */
export function resetRateLimiter(): void {
  defaultLastRequestTime = 0;
}
