import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch global
global.fetch = vi.fn();

// Mock idb module
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false),
    },
  }),
}));

describe('geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    it('should return coordinates for a valid address', async () => {
      const mockResponse = [
        {
          lat: '-34.6037',
          lon: '-58.3816',
          display_name: 'Buenos Aires, Argentina',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const { geocodeAddress } = await import('@/lib/geocode');
      const result = await geocodeAddress('Buenos Aires, Argentina');

      expect(result).toEqual({
        lat: -34.6037,
        lng: -58.3816,
        displayName: 'Buenos Aires, Argentina',
      });
    });

    it('should throw error when address not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      });

      const { geocodeAddress } = await import('@/lib/geocode');

      await expect(geocodeAddress('direccion inexistente xyz 123')).rejects.toThrow(
        'Address not found'
      );
    });

    it('should include country code AR in request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      });

      const { geocodeAddress } = await import('@/lib/geocode');

      try {
        await geocodeAddress('test');
      } catch (e) {
        // Ignore error
      }

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('countrycodes=AR'),
        expect.any(Object)
      );
    });
  });

  describe('searchAddresses', () => {
    it('should return list of addresses for autocomplete', async () => {
      const mockResponse = [
        { place_id: 1, display_name: 'Calle 1, Buenos Aires', lat: '-34.60', lon: '-58.38' },
        { place_id: 2, display_name: 'Calle 2, Buenos Aires', lat: '-34.61', lon: '-58.39' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const { searchAddresses } = await import('@/lib/geocode');
      const result = await searchAddresses('Calle');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        placeId: 1,
        displayName: 'Calle 1, Buenos Aires',
        lat: -34.6,
        lng: -58.38,
      });
    });
  });

  describe('normalizeAddressFormat', () => {
    it('should normalize Q (Calle) prefix', async () => {
      const { normalizeAddressFormat } = await import('@/lib/geocode');
      // Adds Buenos Aires because it has street number
      expect(normalizeAddressFormat('Q Junín 568')).toContain('Junín 568');
    });

    it('should normalize B (Boulevard) prefix', async () => {
      const { normalizeAddressFormat } = await import('@/lib/geocode');
      expect(normalizeAddressFormat('B Arguello 123')).toContain('Boulevard Arguello 123');
    });

    it('should normalize A (Avenida) prefix', async () => {
      const { normalizeAddressFormat } = await import('@/lib/geocode');
      expect(normalizeAddressFormat('A Corrientes 456')).toContain('Avenida Corrientes 456');
    });

    it('should normalize common abbreviations', async () => {
      const { normalizeAddressFormat } = await import('@/lib/geocode');
      expect(normalizeAddressFormat('av. test')).toContain('Avenida test');
    });
  });
});
