import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock navigator.geolocation for GPS tests
Object.defineProperty(navigator, 'geolocation', {
  value: {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  },
  writable: true,
});

// Mock IndexedDB for storage tests - more complete mock
const mockIDBFactory = {
  createObjectStore: vi.fn(),
  transaction: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  createIndex: vi.fn(),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(false),
  },
};

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn().mockImplementation(() => ({
      result: mockIDBFactory,
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
    })),
  },
  writable: true,
});
