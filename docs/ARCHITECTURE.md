# Route Flow Architecture

## Overview

Route Flow is a route optimization application for delivery logistics. It solves the Traveling Salesman Problem (TSP) to find the optimal order for delivering packages to multiple addresses.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19 |
| Maps | Google Maps JavaScript API (@vis.gl/react-google-maps) |
| Routing | Google Directions API |
| Distance Matrix | Google Distance Matrix API |
| Geocoding | Google Geocoding API |
| State | React Context + useReducer |
| Drag & Drop | @dnd-kit |
| Storage | IndexedDB (idb) |
| Styling | Tailwind CSS 4 |
| OCR | Tesseract.js |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ AddressList  │  │    Map       │  │   ExecutionPanel     │  │
│  │ (dnd-kit)    │  │(Google Maps)│  │   (GPS Tracking)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                           │                                      │
│                    ┌──────┴──────┐                               │
│                    │ MapProvider │                               │
│                    └──────┬──────┘                               │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌─────────────────┐ ┌───────────────┐ ┌────────────────┐
│ /api/route-     │ │ /api/matrix   │ │ /api/geocode   │
│ optimize        │ │               │ │                │
│ (Directions API)│ │(Distance Matrix)│ (Geocoding)  │
└────────┬────────┘ └───────┬───────┘ └───────┬────────┘
         │                  │                 │
         └──────────────────┼─────────────────┘
                            │
                    ┌───────┴───────┐
                    │ google-maps   │
                    │ lib           │
                    └───────────────┘
```

## Google Maps APIs

Route Flow uses four Google Maps Platform APIs:

### 1. Maps JavaScript API

**Purpose**: Interactive map rendering in the browser

**Component**: `src/components/Map/`

```tsx
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

<APIProvider apiKey={apiKey}>
  <Map center={center} zoom={zoom}>
    <Marker position={position} />
  </Map>
</APIProvider>
```

### 2. Directions API

**Purpose**: Route calculation and TSP optimization

**Endpoint**: `/api/route-optimize`

**Features**:
- Round-trip optimization (start = end) or linear mode
- `optimizeWaypoints=true` for TSP solving
- Step-by-step navigation instructions
- Encoded polyline for route visualization

**Request**:
```json
{
  "start": [-58.3806, -34.6191],
  "points": [
    { "id": "1", "lat": -34.6037, "lng": -58.3816 },
    { "id": "2", "lat": -34.6100, "lng": -58.4000 }
  ]
}
```

**Response**:
```json
{
  "route": ["start", "2", "1"],
  "polyline": [[-58.3806, -34.6191], ...],
  "totalDuration": 45,
  "totalDistance": 12.5,
  "etas": [20, 45],
  "steps": [
    { "instruction": "Head north on Main St", "duration": 5, "distance": 1.2 }
  ]
}
```

### 3. Distance Matrix API

**Purpose**: Calculate travel times and distances between all point pairs

**Endpoint**: `/api/matrix`

**Use Case**: Building the distance matrix for local TSP optimization as fallback

**Limits**:
- Max 25 origins × 25 destinations per request
- Batching implemented for larger matrices

**Request**:
```json
{
  "coordinates": [[-58.3806, -34.6191], [-58.3816, -34.6037], ...]
}
```

**Response**:
```json
{
  "durations": [[0, 1200, 2400], [1200, 0, 1500], ...],
  "distances": [[0, 500, 1000], [500, 0, 600], ...],
  "_provider": "google"
}
```

### 4. Geocoding API

**Purpose**: Convert addresses to coordinates and vice versa

**Endpoint**: `/api/geocode`

**Functions**:
- Address to coordinates: `getGeocode({ address: "123 Main St" })`
- Coordinates to address: `getAddress({ location: { lat, lng } })`

## Fallback Chain

When Google Maps API is unavailable:

| Feature | Fallback 1 (ORS) | Fallback 2 (Local) |
|---------|------------------|-------------------|
| Route Optimization | ORS Directions API | Nearest-neighbor heuristic |
| Distance Matrix | ORS Matrix API | Haversine formula |
| Geocoding | Nominatim | Error message |
| Route Display | ORS polyline | Straight-line polyline |

## Data Flow

### 1. Adding Addresses

```
User enters address
       │
       ▼
/api/geocode (Google Geocoding)
       │
       ▼
Coordinates stored in state
       │
       ▼
Map shows new marker
```

### 2. Route Optimization

```
User clicks "Calculate Route"
       │
       ▼
/api/route-optimize
       │
       ├─► Google Directions API (primary)
       │      │
       │      ▼
       │   Optimized route + polyline
       │
       └─► Local Haversine (fallback)
              │
              ▼
           Straight-line polyline
       │
       ▼
UI updates with route
```

### 3. Execution Mode

```
User starts delivery run
       │
       ▼
GPS tracking enabled
       │
       ▼
Compare position with planned route
       │
       ├─► On track → Next delivery info
       │
       └─► Deviation detected → Alert + recalculate
```

## Key Modules

### `/src/lib/google-maps/`

Wrapper for Google Maps API calls:

| Function | API | Description |
|----------|-----|-------------|
| `getDirections()` | Directions | Get optimized route |
| `decodePolyline()` | (utility) | Decode encoded polyline |
| `getDistanceMatrix()` | Distance Matrix | Get duration/distance matrix |
| `getGeocode()` | Geocoding | Address → coordinates |
| `getAddress()` | Geocoding | Coordinates → address |

### `/src/lib/tsp/`

Traveling Salesman Problem solver:

| Function | Description |
|----------|-------------|
| `optimizeAndCalculate()` | Full TSP with alpha/beta weighting |
| `optimizeRouteLocal()` | Nearest-neighbor heuristic |
| `Point` | Input point type |
| `Matrix` | Distance/duration matrix type |

### `/src/lib/routing/local/`

Offline fallback algorithms:

| Function | Description |
|----------|-------------|
| `calculateDistance()` | Haversine formula |
| `buildLocalMatrix()` | Distance matrix via Haversine |
| `estimateDuration()` | Time based on distance + speed |
| `createStraightLinePolyline()` | Simple visualization |
| `detectRouteDeviation()` | Check if user off-route |

### `/src/lib/db/`

IndexedDB persistence:

| Function | Description |
|----------|-------------|
| `initDB()` | Initialize database |
| `saveRoute()` | Persist route data |
| `loadRoute()` | Retrieve saved route |
| `clearRoute()` | Delete saved data |

## State Management

Route Flow uses React Context with useReducer:

```typescript
interface AppState {
  addresses: Address[];
  route: OptimizedRoute | null;
  execution: ExecutionState;
  isCalculating: boolean;
}

type Action =
  | { type: 'ADD_ADDRESS'; payload: Address }
  | { type: 'REMOVE_ADDRESS'; payload: string }
  | { type: 'SET_ROUTE'; payload: OptimizedRoute }
  | { type: 'START_EXECUTION' }
  | { type: 'UPDATE_POSITION'; payload: Position }
  // ...
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps Platform API key |
| `NEXT_PUBLIC_ORS_API_KEY` | No | OpenRouteService (fallback) |

## Security

1. **API Key Restriction**: Restrict key to your domain in Google Cloud Console
2. **Environment Variables**: API key stored in `.env.local`, never committed
3. **Input Validation**: All API endpoints validate and limit input sizes

## Performance Considerations

1. **Matrix Batching**: Large distance matrices are split into 25×25 batches
2. **Debounced Calculations**: Route recalculation is debounced during editing
3. **Lazy Loading**: Map components are loaded lazily
4. **IndexedDB**: Route data persisted locally to survive page refreshes

## Route Modes

### Circular Route (Default)
- Starts from a point and returns to it
- Optimized for distance efficiency
- Use case: Return to depot after deliveries

### Linear Route
- Visits nearest points first, no return
- Use case: One-way delivery routes (e.g., end at customer's location)

## Future Enhancements

- Real-time traffic integration
- Multiple delivery vehicles (VRP)
- Time window constraints
- Offline maps for poor connectivity areas
