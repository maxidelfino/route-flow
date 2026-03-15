import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types
export interface Address {
  id: string;
  text: string;
  lat?: number;
  lng?: number;
  status: 'pending' | 'geocoding' | 'geocoded' | 'completed';
  createdAt: number;
  order?: number;
}

export interface RouteSettings {
  startLat?: number;
  startLng?: number;
  startAddress?: string;
}

// IndexedDB Schema
interface RouteFlowDB extends DBSchema {
  addresses: {
    key: string;
    value: Address;
    indexes: { 'by-status': string };
  };
  settings: {
    key: string;
    value: RouteSettings;
  };
  cache: {
    key: string;
    value: {
      data: unknown;
      expiresAt: number;
    };
  };
}

// Database instance
let dbPromise: Promise<IDBPDatabase<RouteFlowDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RouteFlowDB>('route-flow', 1, {
      upgrade(db) {
        // Addresses store
        if (!db.objectStoreNames.contains('addresses')) {
          const addressStore = db.createObjectStore('addresses', { keyPath: 'id' });
          addressStore.createIndex('by-status', 'status');
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Cache store for geocoding results
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Address operations
export const addressStorage = {
  async getAll(): Promise<Address[]> {
    const db = await getDB();
    const addresses = await db.getAll('addresses');
    return addresses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async getById(id: string): Promise<Address | undefined> {
    const db = await getDB();
    return db.get('addresses', id);
  },

  async add(address: Address): Promise<void> {
    const db = await getDB();
    await db.put('addresses', address);
  },

  async update(id: string, updates: Partial<Address>): Promise<void> {
    const db = await getDB();
    const existing = await db.get('addresses', id);
    if (existing) {
      await db.put('addresses', { ...existing, ...updates });
    }
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('addresses', id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('addresses');
  },

  async getByStatus(status: Address['status']): Promise<Address[]> {
    const db = await getDB();
    return db.getAllFromIndex('addresses', 'by-status', status);
  },
};

// Settings operations
export const settingsStorage = {
  async get<K extends keyof RouteSettings>(key: K): Promise<RouteSettings[K] | undefined> {
    const db = await getDB();
    const settings = await db.get('settings', key);
    return settings?.[key];
  },

  async set<K extends keyof RouteSettings>(key: K, value: RouteSettings[K]): Promise<void> {
    const db = await getDB();
    const existing = await db.get('settings', key) || {};
    await db.put('settings', { ...existing, [key]: value });
  },

  async getAll(): Promise<RouteSettings> {
    const db = await getDB();
    const all = await db.getAll('settings');
    return Object.assign({}, ...all);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('settings');
  },
};

// Cache operations (for geocoding results)
export const cacheStorage = {
  async get<T>(key: string): Promise<T | null> {
    const db = await getDB();
    const item = await db.get('cache', key);
    if (!item) return null;
    
    // Check if expired
    if (item.expiresAt < Date.now()) {
      await db.delete('cache', key);
      return null;
    }
    
    return item.data as T;
  },

  async set<T>(key: string, data: T, ttlMinutes = 24 * 60): Promise<void> {
    const db = await getDB();
    await db.put('cache', {
      key: key,
      data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    } as RouteFlowDB['cache']['value']);
  },

  async delete(key: string): Promise<void> {
    const db = await getDB();
    await db.delete('cache', key);
  },
};

// Utility to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
