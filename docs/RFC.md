# RFC: Route Flow - Technical Specification

## 1. Project Overview

**Route Flow** is a PWA for delivery route optimization in Argentina. The app allows couriers to load up to 1000 addresses (manual or via OCR), calculate time-optimized routes, and navigate during delivery with dynamic recalculation.

**Key Constraints:**
- Budget: $0 (free tier APIs only)
- Users: 2 couriers in Argentina
- Offline: Up to 3 hours without connectivity
- Storage: Persists on page reload for safety

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | Framework (requires Node.js 20.9+) |
| React | 19.x | UI Library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Google Maps | @vis.gl/react-google-maps | Maps |
| Tesseract.js | 7.x | OCR (browser) |
| idb | 8.x | IndexedDB wrapper |

### Backend

| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Serverless backend |
| Google Maps APIs | Primary: Directions, Distance Matrix, Geocoding |
| OpenRouteService (ORS) | Fallback routing |
| Nominatim | Fallback geocoding |

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
│   │   ├── sw.ts                # Service worker
│   │   └── api/                 # API Routes
│   │       ├── geocode/         # Google Geocoding proxy
│   │       ├── matrix/          # Google Distance Matrix
│   │       └── route-optimize/  # Google Directions + optimization
│   ├── components/
│   │   ├── Map/                 # Google Maps component
│   │   ├── AddressList/         # Address management (dnd-kit)
│   │   ├── AddressInput/       # Address input with autocomplete
│   │   ├── OCRUploader/        # Photo + OCR
│   │   ├── ExecutionPanel/     # Route execution mode
│   │   ├── RouteInfo/          # Navigation info
│   │   ├── StartPointSelector/ # Start point selection
│   │   └── PWAInstallButton/   # PWA install prompt
│   ├── lib/
│   │   ├── google-maps/         # Google Maps client
│   │   │   ├── directions.ts   # Directions API wrapper
│   │   │   ├── matrix.ts       # Distance Matrix wrapper
│   │   │   ├── geocode.ts      # Geocoding wrapper
│   │   │   └── polyline.ts    # Polyline decoder
│   │   ├── routing/
│   │   │   ├── local/          # Offline fallback algorithms
│   │   │   │   ├── distance.ts # Haversine formula
│   │   │   │   ├── matrix.ts   # Local matrix builder
│   │   │   │   └── deviation.ts # Route deviation detection
│   │   │   └── ors/            # ORS fallback (legacy)
│   │   ├── tsp.ts              # TSP solver (nearest-neighbor + 2-opt)
│   │   ├── db.ts               # IndexedDB operations
│   │   └── useAddressSearch.ts # Unified address search hook
│   └── hooks/
│       ├── useRoute.ts          # Route state management
│       └── useGPS.ts            # GPS tracking
├── public/
│   └── manifest.json            # PWA manifest
└── package.json
```

---

## 4. Key Technical Decisions

### 4.1 Google Maps Integration

**Decision:** Use `@vis.gl/react-google-maps` for map rendering

```typescript
// src/components/Map/index.tsx
'use client';

import { APIProvider, Map, Marker, Polyline } from '@vis.gl/react-google-maps';

export default function RouteMap({ center, zoom, route, markers }) {
  return (
    <APIProvider apiKey={process.env.GOOGLE_MAPS_API_KEY}>
      <Map center={center} zoom={zoom} mapId="route-flow-map">
        {markers.map(marker => (
          <Marker key={marker.id} position={marker.position} />
        ))}
        {route && <Polyline path={route.polyline} />}
      </Map>
    </APIProvider>
  );
}
```

### 4.2 Fallback Chain

**Decision:** Implement three-tier fallback for reliability

```
Google Maps API → OpenRouteService → Local Haversine
     (primary)        (fallback 1)      (fallback 2)
```

### 4.3 Route Modes

**Decision:** Support both circular and linear routes

- **Circular (default)**: Return to start point, optimized distance
- **Linear**: One-way, visit nearest first, no return

### 4.4 Tesseract.js OCR

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

### 4.5 IndexedDB Storage (idb)

```typescript
// src/lib/db.ts
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
```

---

## 5. Algorithm: Route Optimization

### 5.1 Strategy

For MVP with typical 50-100 addresses:

1. **Google Directions API** for primary optimization (when available)
2. **Nearest Neighbor** as fallback base algorithm
3. **2-opt improvement** for local optimization
4. **Weighted cost function:** `cost = 0.7 * time + 0.3 * distance`

### 5.2 Implementation

```typescript
// src/lib/tsp.ts
interface Point {
  id: string;
  lat: number;
  lng: number;
  duration?: number;
  distance?: number;
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
  _provider: 'google' | 'ors' | 'local';
}
```

### POST /api/route-optimize

```typescript
// Request
{
  start: [number, number];        // [lng, lat]
  points: Array<{ id: string; lat: number; lng: number }>;
  mode: 'circular' | 'linear';   // route mode
  alpha?: number;                 // time weight (default 0.7)
  beta?: number;                  // distance weight (default 0.3)
}

// Response
{
  route: string[];                // ordered point IDs
  polyline: [number, number][];  // decoded polyline
  totalDuration: number;          // minutes
  totalDistance: number;          // km
  etas: number[];                // ETA to each point
  _provider: 'google' | 'ors' | 'local';
}
```

---

## 8. Environment Variables

```bash
# .env.local
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Optional - for fallback
NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key
```

---

## 9. Implementation Status

### Phase 1: Foundation ✅ COMPLETO
- [x] Initialize Next.js project with TypeScript + Tailwind
- [x] Set up PWA with next-pwa
- [x] Configure Google Maps component
- [x] Create IndexedDB storage layer

### Phase 2: Address Management ✅ COMPLETO
- [x] Manual address input with Google autocomplete
- [x] OCR upload with Tesseract.js
- [x] Address list with drag & drop (dnd-kit)
- [x] Address CRUD in IndexedDB

### Phase 3: Route Calculation ✅ COMPLETO
- [x] Google Maps client implementation
- [x] TSP algorithm (nearest-neighbor + 2-opt)
- [x] Google Directions API integration
- [x] Fallback chain (ORS → Local)

### Phase 4: Execution ✅ COMPLETO
- [x] GPS tracking hook
- [x] Complete delivery action UI
- [x] Dynamic route recalculation
- [x] Route deviation detection

### Phase 5: MVP Polish ✅ COMPLETO
- [x] Route mode selection (circular/linear)
- [x] Loading states and progress indicators
- [x] Offline mode handling
- [x] PWA install prompts

---

## 10. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Google Maps API limits | 100-2500 req/day (tier) | Cache matrices, batch requests |
| Tesseract accuracy | Varies | Always require user confirmation |
| GPS precision | Varies by device | Show accuracy indicator |
| Offline geocoding | Not possible | Queue for later when online |

---

## 11. References

- [Google Maps Platform](https://developers.google.com/maps)
- [Google Maps JavaScript API](https://vis.gl/react-google-maps)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [next-pwa Documentation](https://www.npmjs.com/package/@ducanh2912/next-pwa)
- [OpenRouteService API](https://openrouteservice.org/dev/) (fallback)

---

*Document version: 2.0*
*Updated: 2026-03-17*
*For MVP Release*
