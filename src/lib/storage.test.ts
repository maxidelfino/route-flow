import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock IDB
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    createObjectStore: vi.fn(),
    transaction: vi.fn(),
  }),
  DBSchema: vi.fn(),
}));

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateId', () => {
    it('should generate unique IDs', async () => {
      const { generateId } = await import('@/lib/storage');
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp and random string', async () => {
      const { generateId } = await import('@/lib/storage');
      
      const id = generateId();
      
      // Should contain a timestamp-like number
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('addressStorage', () => {
    it('should have getAll method', async () => {
      const { addressStorage } = await import('@/lib/storage');
      
      expect(addressStorage.getAll).toBeDefined();
      expect(typeof addressStorage.getAll).toBe('function');
    });

    it('should have add method', async () => {
      const { addressStorage } = await import('@/lib/storage');
      
      expect(addressStorage.add).toBeDefined();
      expect(typeof addressStorage.add).toBe('function');
    });
  });
});
