import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatDistanceCompact,
  formatDuration,
  formatDurationRemaining,
} from './format';

describe('formatDistance', () => {
  it('formats kilometers with one decimal place', () => {
    expect(formatDistance(12.5)).toBe('12.5 km');
    expect(formatDistance(0.5)).toBe('0.5 km');
  });

  it('returns -- for non-finite values', () => {
    expect(formatDistance(Infinity)).toBe('--');
    expect(formatDistance(NaN)).toBe('--');
    expect(formatDistance(undefined as unknown as number)).toBe('--');
  });

  it('handles zero', () => {
    expect(formatDistance(0)).toBe('0.0 km');
  });
});

describe('formatDistanceCompact', () => {
  it('shows meters for distances less than 1km', () => {
    expect(formatDistanceCompact(0.5)).toBe('500m');
    expect(formatDistanceCompact(0.1)).toBe('100m');
  });

  it('shows km for distances 1km or more', () => {
    expect(formatDistanceCompact(1)).toBe('1.0km');
    expect(formatDistanceCompact(12.5)).toBe('12.5km');
  });

  it('returns empty string for non-finite values', () => {
    expect(formatDistanceCompact(Infinity)).toBe('');
    expect(formatDistanceCompact(NaN)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats minutes less than 60', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(45.5)).toBe('46 min');
  });

  it('formats hours and minutes for 60+ minutes', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(125)).toBe('2h 5min');
  });

  it('returns -- for non-finite values', () => {
    expect(formatDuration(Infinity)).toBe('--');
    expect(formatDuration(NaN)).toBe('--');
  });
});

describe('formatDurationRemaining', () => {
  it('adds ~ prefix to formatDuration result', () => {
    expect(formatDurationRemaining(30)).toBe('~30 min');
    expect(formatDurationRemaining(90)).toBe('~1h 30min');
  });

  it('returns -- for non-finite values', () => {
    expect(formatDurationRemaining(Infinity)).toBe('--');
  });
});
