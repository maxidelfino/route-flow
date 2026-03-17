import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ALPHA,
  DEFAULT_BETA,
  EARTH_RADIUS_KM,
  EARTH_RADIUS_METERS,
} from './constants';

describe('constants', () => {
  describe('TSP optimization weights', () => {
    it('has valid DEFAULT_ALPHA (time weight)', () => {
      expect(DEFAULT_ALPHA).toBe(0.7);
      expect(DEFAULT_ALPHA).toBeGreaterThan(0);
      expect(DEFAULT_ALPHA).toBeLessThan(1);
    });

    it('has valid DEFAULT_BETA (distance weight)', () => {
      expect(DEFAULT_BETA).toBe(0.3);
      expect(DEFAULT_BETA).toBeGreaterThan(0);
      expect(DEFAULT_BETA).toBeLessThan(1);
    });

    it('weights sum to 1', () => {
      expect(DEFAULT_ALPHA + DEFAULT_BETA).toBe(1);
    });
  });

  describe('Earth radius', () => {
    it('has correct EARTH_RADIUS_KM', () => {
      expect(EARTH_RADIUS_KM).toBe(6371);
    });

    it('has correct EARTH_RADIUS_METERS', () => {
      expect(EARTH_RADIUS_METERS).toBe(6371000);
    });

    it('METERS is 1000 times KM', () => {
      expect(EARTH_RADIUS_METERS).toBe(EARTH_RADIUS_KM * 1000);
    });
  });
});
