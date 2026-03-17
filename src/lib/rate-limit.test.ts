import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter, rateLimitNominatim, resetRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('does not delay on first call', async () => {
    const limiter = createRateLimiter({ minDelayMs: 1000 });
    const start = Date.now();
    await limiter();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('delays on subsequent calls', async () => {
    const limiter = createRateLimiter({ minDelayMs: 100 });
    const start = Date.now();
    await limiter();
    await limiter();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  it('uses custom clock when provided', async () => {
    let time = 0;
    const clock = vi.fn(() => time);
    
    const limiter = createRateLimiter({
      minDelayMs: 100,
      clock,
    });
    
    await limiter();
    time = 50;
    await limiter();
    time = 140;
    await limiter();
    
    expect(clock).toHaveBeenCalled();
  });
});

describe('rateLimitNominatim', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('has default delay of 1000ms', async () => {
    const start = Date.now();
    await rateLimitNominatim();
    await rateLimitNominatim();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(990);
  });
});
