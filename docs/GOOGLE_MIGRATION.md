# Google Maps Migration Guide

## Overview

In March 2026, Route Flow migrated from OpenRouteService (ORS) to Google Maps Platform as the primary routing and geocoding provider. This document explains the migration and the new architecture.

## Migration Summary

| Aspect | Before (ORS) | After (Google Maps) |
|--------|--------------|---------------------|
| Routing | ORS Directions API | Google Directions API |
| Distance Matrix | ORS Matrix API | Google Distance Matrix API |
| Geocoding | Nominatim | Google Geocoding API |
| Map Rendering | Leaflet + OSM | Google Maps JavaScript API |

## Why Google Maps?

1. **Better TSP Optimization**: Google Directions API has built-in `optimizeWaypoints` that solves the Traveling Salesman Problem server-side
2. **Accurate Traffic Data**: Real-time and historical traffic information
3. **Unified Platform**: Single API key for directions, distance matrix, geocoding, and map rendering
4. **Better Reliability**: Higher uptime and more consistent API response formats

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                  (route-optimize, matrix API)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Maps Module                             │
│              src/lib/google-maps/index.ts                   │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │   Directions API     │    │    Distance Matrix API   │  │
│  │ - getDirections()    │    │ - getDistanceMatrix()    │  │
│  │ - decodePolyline()   │    │ - batchMatrix()          │  │
│  └─────────────────────┘    └──────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │   Geocoding API     │    │    Maps JavaScript API   │  │
│  │ - getGeocode()      │    │ - @vis.gl/react-google-maps│ │
│  │ - getAddress()      │    │                          │  │
│  └─────────────────────┘    └──────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│ Google Cloud      │     │ Local Fallback    │
│ Platform APIs     │     │ (Haversine)       │
│ (requires key)    │     │                   │
└───────────────────┘     └───────────────────┘
```

## API Configuration

### Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Create a new project or select existing
3. Enable these APIs:
   - **Directions API** - Route optimization
   - **Distance Matrix API** - Duration/distance calculations
   - **Geocoding API** - Address to coordinates
   - **Maps JavaScript API** - Map rendering
4. Create credentials (API Key)
5. Add to `.env.local`:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### Restrict Your API Key (Important!)

In Google Cloud Console, restrict the API key to:
- **HTTP referrers** (for web apps): `localhost:3000`, `yourdomain.com`
- **APIs**: Only enable the APIs you need

## Fallback Chain

When Google Maps is unavailable:

| Feature | Fallback 1 | Fallback 2 |
|---------|-----------|-------------|
| Route Optimization | (formerly ORS) | Local nearest-neighbor |
| Distance Matrix | (formerly ORS) | Haversine formula |
| Geocoding | (formerly Nominatim) | Error message |
| Map Display | (formerly OSM) | Error message |

## Code Examples

### Route Optimization (Directions API)

```typescript
import { getDirections, decodePolyline } from '@/lib/google-maps';

// Get optimized route with Google's TSP solver
const directions = await getDirections(
  [startLat, startLng],     // origin [lat, lng]
  [startLat, startLng],     // same as destination for round trip
  waypoints,                 // delivery points
  { optimize: true }         // enable TSP optimization
);

const polyline = decodePolyline(directions.routes[0].overview_polyline.points);
```

### Distance Matrix

```typescript
import { getDistanceMatrix } from '@/lib/google-maps';

// Get duration/distance between all points
const origins = coords.map(c => [c[1], c[0]] as [number, number]); // [lat, lng]
const destinations = coords.map(c => [c[1], c[0]] as [number, number]);

const matrix = await getDistanceMatrix(origins, destinations);
// matrix.rows[i].elements[j].duration.value (seconds)
// matrix.rows[i].elements[j].distance.value (meters)
```

### Geocoding

```typescript
import { getGeocode, getAddress } from '@/lib/google-maps';

// Address to coordinates
const result = await getGeocode({ address: '123 Main St, City, Country' });
const location = result[0].geometry.location;

// Coordinates to address
const address = await getAddress({ location: { lat: 40.7128, lng: -74.0060 } });
```

## Removed Dependencies

The following packages were removed during migration:

```bash
npm uninstall leaflet react-leaflet @types/leaflet leaflet-defaulticon-compatibility
```

Replaced with:
- `@vis.gl/react-google-maps` - React wrapper for Google Maps JavaScript API

## Files Changed

| File | Change |
|------|--------|
| `src/lib/google-maps/` | New module for Google Maps API |
| `src/components/Map/` | Migrated from Leaflet to Google Maps |
| `src/app/api/route-optimize/` | Uses Google Directions API |
| `src/app/api/matrix/` | Uses Google Distance Matrix API |
| `src/app/api/geocode/` | Uses Google Geocoding API |
| `src/lib/routing/ors/` | Removed (broken/unused) |

## Troubleshooting

### "API key not configured" error

Ensure `GOOGLE_MAPS_API_KEY` is set in `.env.local` and restart the dev server.

### "This API project is not authorized" error

Enable the required APIs in Google Cloud Console:
- Directions API
- Distance Matrix API  
- Geocoding API

### "OVER_QUERY_LIMIT" error

You have exceeded your quota. Check Google Cloud Console for usage limits.

### Routes returning "ZERO_RESULTS"

The addresses could not be geocoded. Try:
1. Checking address format
2. Adding more context (city, country)
3. Using the Google Geocoding API to validate addresses first

## Legacy Support

Local fallback algorithms are kept in `src/lib/routing/local/`:
- Haversine distance calculations
- Nearest-neighbor TSP heuristic
- Straight-line polyline generation

These serve as a final fallback when Google Maps is unavailable.
