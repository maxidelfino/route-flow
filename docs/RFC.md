# RFC: Route Flow - Technical Specification

## 1. Project Overview

**Route Flow** is a PWA for delivery route optimization in Argentina. The app allows couriers to load up to 1000 addresses (manual or via OCR), calculate time-optimized routes, and navigate during delivery with dynamic recalculation.

**Key Constraints:**
- Budget: $0 (free tier APIs only)
- Users: 2 couriers in Argentina
- Offline: Up to 3 hours without connectivity
- Storage: Ephemeral (only persists on page reload for safety)

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | Framework (requires Node.js 20.9+) |
| React | 19.x | UI Library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Leaflet + react-leaflet | 4.x | Maps |
| Tesseract.js | 6.x | OCR (browser) |
| idb | 8.x | IndexedDB wrapper |

### Backend

| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Serverless backend |
| Nominatim | Geocoding (OpenStreetMap) |
| OpenRouteService (ORS) | Routing & Matrix API |

### PWA

| Technology | Purpose |
|------------|---------|
| @ducanh2912/next-pwa | PWA plugin for Next.js |
| Service Worker | Offline caching |

---

## 3. Architecture

### Project Structure

```
route-flow/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout + PWA
│   │   ├── page.tsx             # Main app
│   │   └── api/                 # API Routes
│   │       ├── geocode/         # Nominatim proxy
│   │       ├── matrix/           # ORS matrix
│   │       └── route/            # Route optimization
│   ├── components/
│   │   ├── Map/                 # Leaflet map
│   │   ├── AddressList/         # Address management
│   │   ├── OCRUploader/         # Photo + OCR
│   │   ├── RouteInfo/           # Navigation info
│   │   └── DragList/            # Reorderable list
│   ├── lib/
│   │   ├── ors.ts               # ORS client
│   │   ├── geocode.ts           # Nominatim client
│   │   ├── tsp.ts               # Nearest Neighbor + 2-opt
│   │   ├── storage.ts           # IndexedDB (idb)
│   │   └── gps.ts               # Device GPS
│   └── hooks/
│       ├── useRoute.ts          # Route state
│       └── useGPS.ts            # GPS tracking
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # PWA icons
└── package.json
```

---

## 4. Key Technical Decisions

### 4.1 PWA Implementation

**Decision:** Use `@ducanh2912/next-pwa` (maintained fork of `next-pwa`)

```bash
npm install @ducanh2912/next-pwa
```

```javascript
// next.config.mjs
import NextPWA from '@ducanh2912/next-pwa';

const nextConfig = {
  // ... your config
};

export default NextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

**Manifest:**
```json
{
  "name": "Route Flow",
  "short_name": "RouteFlow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 4.2 Leaflet in Next.js App Router

**Challenge:** Leaflet requires browser APIs (window, document) not available in SSR.

**Solution:** Dynamic import with `ssr: false`

```typescript
// src/components/Map/index.tsx
'use client';

import dynamic from 'next/dynamic';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

export default function Map({ centers, route, onMarkerClick }) {
  return (
    <MapContainer center={centers[0]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Markers and polylines */}
    </MapContainer>
  );
}
```

### 4.3 Tesseract.js OCR

**Decision:** Run in browser with web worker

```typescript
// src/lib/ocr.ts
import { createWorker } from 'tesseract.js';

export async function extractText(imageData: string): Promise<string> {
  const worker = await createWorker('spa'); // Spanish for Argentina
  const result = await worker.recognize(imageData);
  await worker.terminate();
  return result.data.text;
}
```

**Note:** Use `spa` (Spanish) language for better accuracy in Argentina.

### 4.4 IndexedDB Storage (idb)

```typescript
// src/lib/storage.ts
import { openDB, DBSchema } from 'idb';

interface RouteDB extends DBSchema {
  addresses: {
    key: string;
    value: {
      id: string;
      text: string;
      lat?: number;
      lng?: number;
      status: 'pending' | 'geocoded' | 'completed';
      createdAt: number;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: string };
  };
}

const dbPromise = openDB<RouteDB>('route-flow', 1, {
  upgrade(db) {
    db.createObjectStore('addresses', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });
  },
});

export const storage = {
  async getAddresses() {
    return (await dbPromise).getAll('addresses');
  },
  async addAddress(addr) {
    return (await dbPromise).put('addresses', addr);
  },
  async deleteAddress(id) {
    return (await dbPromise).delete('addresses', id);
  },
};
```

### 4.5 ORS Integration

**Client:** Use `openrouteservice-js` or direct fetch

```typescript
// src/lib/ors.ts
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

export async function getMatrix(coordinates: number[][]) {
  const response = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locations: coordinates,
      metrics: ['duration', 'distance'],
      units: 'km',
    }),
  });
  return response.json();
}

export async function getRoute(coordinates: number[][]) {
  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates,
      format: 'encodedpolyline',
    }),
  });
  return response.json();
}
```

### 4.6 Nominatim Geocoding

```typescript
// src/lib/geocode.ts
export async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=AR`
  );
  const results = await response.json();
  
  if (results.length === 0) {
    throw new Error('Address not found');
  }
  
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}
```

**Rate Limiting:** 1 request/second (Nominatim policy). Implement delay between requests.

---

## 5. Algorithm: Route Optimization

### 5.1 Strategy for MVP

For 2 users and 100 addresses max (typical), implement:

1. **Nearest Neighbor** as base algorithm
2. **2-opt improvement** for local optimization
3. **Weighted cost function:** `cost = 0.7 * time + 0.3 * distance`

### 5.2 Algorithm Implementation

```typescript
// src/lib/tsp.ts
interface Point {
  id: string;
  lat: number;
  lng: number;
  duration?: number;   // from matrix
  distance?: number;  // from matrix
}

function weightedCost(time: number, distance: number): number {
  return 0.7 * time + 0.3 * distance;
}

function nearestNeighbor(
  points: Point[],
  startIndex: number,
  matrix: { durations: number[][]; distances: number[][] }
): number[] {
  const n = points.length;
  const visited = new Set<number>();
  const route = [startIndex];
  visited.add(startIndex);

  while (route.length < n) {
    const current = route[route.length - 1];
    let minCost = Infinity;
    let nextIdx = -1;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      
      const cost = weightedCost(
        matrix.durations[current][i],
        matrix.distances[current][i]
      );
      
      if (cost < minCost) {
        minCost = cost;
        nextIdx = i;
      }
    }

    if (nextIdx !== -1) {
      route.push(nextIdx);
      visited.add(nextIdx);
    }
  }

  return route;
}

function twoOpt(route: number[], matrix: any): number[] {
  let improved = true;
  let bestRoute = [...route];
  
  while (improved) {
    improved = false;
    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let j = i + 1; j < bestRoute.length; j++) {
        const newRoute = bestRoute
          .slice(0, i)
          .concat(bestRoute.slice(i, j + 1).reverse())
          .concat(bestRoute.slice(j + 1));
        
        if (routeCost(newRoute, matrix) < routeCost(bestRoute, matrix)) {
          bestRoute = newRoute;
          improved = true;
        }
      }
    }
  }
  
  return bestRoute;
}

function routeCost(route: number[], matrix: any): number {
  let cost = 0;
  for (let i = 0; i < route.length - 1; i++) {
    cost += weightedCost(
      matrix.durations[route[i]][route[i + 1]],
      matrix.distances[route[i]][route[i + 1]]
    );
  }
  return cost;
}

export function optimizeRoute(
  points: Point[],
  startIndex: number,
  matrix: { durations: number[][]; distances: number[][] }
): number[] {
  const nn = nearestNeighbor(points, startIndex, matrix);
  return twoOpt(nn, matrix);
}
```

---

## 6. GPS Tracking

```typescript
// src/hooks/useGPS.ts
import { useState, useEffect } from 'react';

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGPS() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error };
}
```

---

## 7. API Endpoints

### POST /api/geocode

```typescript
// Request
{ addresses: string[] }

// Response
{
  results: Array<{
    input: string;
    lat?: number;
    lng?: number;
    success: boolean;
    error?: string;
  }>
}
```

### POST /api/matrix

```typescript
// Request
{ coordinates: [number, number][] }

// Response
{
  durations: number[][];
  distances: number[][];
}
```

### POST /api/route-optimize

```typescript
// Request
{
  start: [number, number];        // [lng, lat]
  points: Array<{ id: string; lat: number; lng: number }>;
  alpha: number;                   // time weight (default 0.7)
  beta: number;                    // distance weight (default 0.3)
}

// Response
{
  route: string[];                 // ordered point IDs
  polyline: string;                // encoded polyline
  totalDuration: number;           // minutes
  totalDistance: number;           // km
  etas: number[];                  // ETA to each point
}
```

---

## 8. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key
```

**Note:** Get free API key at https://openrouteservice.org/dev/#/signup

---

## 9. Implementation Phases

### Phase 1: Foundation
- [ ] Initialize Next.js project with TypeScript + Tailwind
- [ ] Set up PWA with next-pwa
- [ ] Configure Leaflet map component
- [ ] Create IndexedDB storage layer

### Phase 2: Address Management
- [ ] Manual address input with Nominatim autocomplete
- [ ] OCR upload with Tesseract.js
- [ ] Address list with drag & drop reordering
- [ ] Address CRUD in IndexedDB

### Phase 3: Route Calculation
- [ ] ORS matrix API integration
- [ ] ORS directions API integration
- [ ] Nearest Neighbor + 2-opt algorithm
- [ ] Route visualization on map

### Phase 4: Execution
- [ ] GPS tracking hook
- [ ] "Complete delivery" action
- [ ] Dynamic route recalculation
- [ ] Route deviation detection

### Phase 5: Polish
- [ ] Loading states and progress indicators
- [ ] Offline mode handling
- [ ] Error states and retry logic
- [ ] PWA install prompts

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Nominatim rate limit | 1 req/sec | Add delay, cache results |
| ORS free tier | 2000 req/day | Cache matrices, batch requests |
| Tesseract accuracy | Varies | Always require user confirmation |
| GPS precision | Varies by device | Show accuracy indicator |
| Offline geocoding | Not possible | Queue for later |

---

## 11. References

- [Nominatim Usage Policy](https://nominatim.org/release-docs/latest/admin/Usage-Policy/)
- [OpenRouteService API](https://openrouteservice.org/dev/)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Leaflet React Integration](https://react-leaflet.js.org/)
- [next-pwa Documentation](https://www.npmjs.com/package/@ducanh2912/next-pwa)

---

## 12. Next Steps

After RFC approval:

1. Initialize Next.js project
2. Set up development environment
3. Begin Phase 1 implementation
4. Validate with 2 test users

---

*Document version: 1.0*
*Created: 2026-03-12*
