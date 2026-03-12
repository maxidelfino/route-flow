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

// Mock IndexedDB for storage tests
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn(),
  },
  writable: true,
});
