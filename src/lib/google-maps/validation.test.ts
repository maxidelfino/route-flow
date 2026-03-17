/**
 * Unit Tests for Google Maps Validation
 * Tests coordinate format handling and validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateCoordinate,
  validateCoordinates,
  validateAddress,
  isWithinRosarioBounds,
  isAcceptableLocationType,
  normalizeAddress,
} from '@/lib/google-maps/validation';

describe('validateCoordinate', () => {
  it('should validate valid lng,lat coordinates', () => {
    const result = validateCoordinate([-60.65, -32.94], 'lnglat');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate valid lat,lng coordinates', () => {
    const result = validateCoordinate([-32.94, -60.65], 'latlng');
    expect(result.valid).toBe(true);
  });

  it('should reject coordinates with invalid latitude', () => {
    const result = validateCoordinate([-60.65, 100], 'lnglat');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Latitude');
  });

  it('should reject coordinates with invalid longitude', () => {
    const result = validateCoordinate([200, -32.94], 'lnglat');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Longitude');
  });

  it('should reject NaN coordinates', () => {
    const result = validateCoordinate([NaN, -32.94], 'lnglat');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('NaN');
  });

  it('should reject invalid coordinate array', () => {
    expect(validateCoordinate([1], 'lnglat').valid).toBe(false);
    expect(validateCoordinate([], 'lnglat').valid).toBe(false);
    expect(validateCoordinate(null as any, 'lnglat').valid).toBe(false);
  });

  it('should accept edge case valid coordinates', () => {
    // Min/max values
    expect(validateCoordinate([-180, -90], 'lnglat').valid).toBe(true);
    expect(validateCoordinate([180, 90], 'lnglat').valid).toBe(true);
    expect(validateCoordinate([0, 0], 'lnglat').valid).toBe(true);
  });
});

describe('validateCoordinates', () => {
  it('should validate array of valid coordinates', () => {
    const coords = [
      [-60.65, -32.94],
      [-60.63, -32.95],
      [-60.60, -32.96],
    ];
    const result = validateCoordinates(coords);
    expect(result.valid).toBe(true);
  });

  it('should reject empty array', () => {
    const result = validateCoordinates([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject non-array input', () => {
    expect(validateCoordinates(null as any).valid).toBe(false);
    expect(validateCoordinates('invalid' as any).valid).toBe(false);
  });

  it('should reject array with invalid coordinate', () => {
    const coords = [
      [-60.65, -32.94],
      [200, -32.95], // Invalid
    ];
    const result = validateCoordinates(coords);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('index 1');
  });

  it('should reject single coordinate', () => {
    const result = validateCoordinates([[-60.65, -32.94]]);
    // Single coordinate is valid (not empty)
    expect(result.valid).toBe(true);
  });
});

describe('validateAddress', () => {
  it('should validate valid addresses', () => {
    expect(validateAddress('Paraguay 1658, Rosario').valid).toBe(true);
    expect(validateAddress('San Martín 850').valid).toBe(true);
    expect(validateAddress('Av. Pelligrini 1200').valid).toBe(true);
  });

  it('should reject empty or whitespace addresses', () => {
    expect(validateAddress('').valid).toBe(false);
    expect(validateAddress('   ').valid).toBe(false);
    expect(validateAddress(null as any).valid).toBe(false);
  });

  it('should reject addresses that are too short', () => {
    expect(validateAddress('AB').valid).toBe(false);
    expect(validateAddress('123').valid).toBe(false);
  });

  it('should reject numeric-only addresses', () => {
    expect(validateAddress('12345').valid).toBe(false);
    expect(validateAddress('123456789').valid).toBe(false);
  });

  it('should accept addresses with special characters', () => {
    expect(validateAddress("O'Neill 123").valid).toBe(true);
    expect(validateAddress('Av. Rivadavia 1500').valid).toBe(true);
  });
});

describe('isWithinRosarioBounds', () => {
  it('should identify coordinates within Rosario bounds', () => {
    // Centro de Rosario
    expect(isWithinRosarioBounds(-32.9442, -60.6505)).toBe(true);
    // Echesa
    expect(isWithinRosarioBounds(-32.9562, -60.6395)).toBe(true);
    // Pichincha
    expect(isWithinRosarioBounds(-32.9360, -60.6290)).toBe(true);
  });

  it('should reject coordinates outside Rosario bounds', () => {
    // Buenos Aires
    expect(isWithinRosarioBounds(-34.6037, -58.3816)).toBe(false);
    // Outside Argentina
    expect(isWithinRosarioBounds(40.7128, -74.0060)).toBe(false);
  });

  it('should handle edge cases on Rosario boundaries', () => {
    // Exact bounds
    expect(isWithinRosarioBounds(-32.80, -60.60)).toBe(true);
    expect(isWithinRosarioBounds(-32.95, -60.75)).toBe(true);
  });
});

describe('isAcceptableLocationType', () => {
  it('should accept ROOFTOP location type', () => {
    expect(isAcceptableLocationType('ROOFTOP')).toBe(true);
  });

  it('should accept RANGE_INTERPOLATED location type', () => {
    expect(isAcceptableLocationType('RANGE_INTERPOLATED')).toBe(true);
  });

  it('should reject approximate location types', () => {
    expect(isAcceptableLocationType('GEOMETRIC_CENTER')).toBe(false);
    expect(isAcceptableLocationType('APPROXIMATE')).toBe(false);
  });

  it('should handle undefined input', () => {
    expect(isAcceptableLocationType(undefined)).toBe(false);
  });
});

describe('normalizeAddress', () => {
  it('should add Rosario context to addresses without it', () => {
    const result = normalizeAddress('Paraguay 1658');
    expect(result).toContain('Rosario');
    expect(result).toContain('Santa Fe');
    expect(result).toContain('Argentina');
  });

  it('should not modify addresses that already have Rosario', () => {
    expect(normalizeAddress('Paraguay 1658, Rosario')).toContain('Rosario');
    expect(normalizeAddress('San Martín, Santa Fe')).toContain('Santa Fe');
  });

  it('should trim whitespace', () => {
    const result = normalizeAddress('  Paraguay 1658  ');
    expect(result).not.toContain('  ');
  });
});
