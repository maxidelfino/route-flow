# Feature Matrix - Route Flow

## Overview

This document details all features in Route Flow and their dependency on external services.

## Feature Status Legend

| Status | Description | Requires API Key |
|--------|-------------|------------------|
| ✅ ACTIVE | Primary implementation using Google Maps | Yes (Google Maps) |
| ✅ INDEPENDENT | Works without any external API | No |
| ✅ FALLBACK | Works with fallback when primary unavailable | Optional |
| 🔶 LEGACY | Deprecated, kept for backward compatibility | Optional |

## Feature Matrix

### Core Features

| Feature | File(s) | Status | API Dependency | Fallback |
|---------|---------|--------|-----------------|----------|
| Address OCR | `src/components/OCRUploader/` | ✅ INDEPENDENT | None | N/A |
| Address Input/Validation | `src/components/AddressInput/` | ✅ INDEPENDENT | None | N/A |
| Address List Management | `src/components/AddressList/` | ✅ INDEPENDENT | None | N/A |
| Route Mode Selection | `src/components/ExecutionPanel/` | ✅ INDEPENDENT | None | N/A |
| Route Optimization | `src/app/api/route-optimize/` | ✅ ACTIVE | Google Directions API | ORS → Nearest-neighbor |
| Distance Matrix | `src/app/api/matrix/` | ✅ ACTIVE | Google Distance Matrix API | ORS → Haversine |
| Geocoding | `src/app/api/geocode/` | ✅ ACTIVE | Google Geocoding API | Nominatim |
| Route Display | `src/components/Map/` | ✅ ACTIVE | Google Directions API | ORS → Straight polyline |
| GPS Tracking | `src/components/RouteInfo/` | ✅ INDEPENDENT | None | N/A |
| Route Deviation Detection | `src/lib/routing/local/` | ✅ INDEPENDENT | None | N/A |

### Offline & PWA

| Feature | File(s) | Status | API Dependency |
|---------|---------|--------|-----------------|
| Offline Storage | `src/lib/db/` | ✅ INDEPENDENT | None |
| PWA Install | `src/components/PWAInstallButton/` | ✅ INDEPENDENT | None |
| Service Worker | `src/app/sw.ts` | ✅ INDEPENDENT | None |

### UI Components

| Component | File(s) | Status |
|-----------|---------|--------|
| OfflineBanner | `src/components/OfflineBanner/` | ✅ INDEPENDENT |
| ErrorToast | `src/components/ErrorToast/` | ✅ INDEPENDENT |
| LoadingSpinner | `src/components/LoadingSpinner/` | ✅ INDEPENDENT |
| ExecutionPanel | `src/components/ExecutionPanel/` | ✅ INDEPENDENT |
| StartPointSelector | `src/components/StartPointSelector/` | ✅ INDEPENDENT |

## API Key Configuration

### Google Maps API (Primary - March 2026)

The app uses Google Maps Platform as the primary service:
- **Directions API**: Route optimization (Traveling Salesman Problem)
- **Distance Matrix API**: Duration and distance calculations
- **Geocoding API**: Address to coordinates conversion
- **Maps JavaScript API**: Interactive map display

**Getting an API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Create a project or select existing
3. Enable these APIs:
   - Directions API
   - Distance Matrix API
   - Geocoding API
   - Maps JavaScript API
4. Create credentials (API Key)
5. Add to `.env.local`:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**IMPORTANT**: Restrict your API key to your domain in Google Cloud Console for security.

### OpenRouteService (ORS) - Fallback Only

**Status**: 🔶 LEGACY - Kept as fallback when Google Maps unavailable

The app uses ORS only as a fallback:
- When Google Maps API key is not configured
- When Google API requests fail

**Getting an API key (optional, for fallback):**
1. Register at [openrouteservice.org](https://openrouteservice.org)
2. Create a free account
3. Generate an API token
4. Add to `.env.local`:

```env
NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key-here
```

### Fallback Chain

When Google Maps API is unavailable:

| Feature | Fallback 1 (ORS) | Fallback 2 (Local) |
|---------|------------------|-------------------|
| Route Optimization | ORS Directions API | Nearest-neighbor heuristic |
| Distance Matrix | ORS Matrix API | Haversine formula |
| Geocoding | Nominatim | Error message |
| Route Display | ORS polyline | Straight-line polyline |

## Local Routing Functions

Located in `src/lib/routing/local/`:

| Function | Description | API Required |
|----------|-------------|--------------|
| `calculateDistance()` | Haversine formula | No |
| `estimateDuration()` | Time based on distance + speed | No |
| `calculateRouteEta()` | Total route ETA | No |
| `buildLocalMatrix()` | Distance matrix via Haversine | No |
| `detectRouteDeviation()` | Check if user off-route | No |
| `createStraightLinePolyline()` | Simple visualization | No |
| `compareRouteWithPosition()` | Distance to planned route | No |

## Route Modes

### Circular Route (Default)
- Returns to start point after all deliveries
- Optimized for distance efficiency
- Use case: Return to depot/warehouse

### Linear Route
- One-way route, no return to start
- Visits nearest unvisited point first
- Use case: End at final customer's location

## Recent Updates (v1.0.0)

- **March 2026**: Migrated from Leaflet/ORS to Google Maps Platform
- Added route mode selection (circular/linear)
- Unified address search with `useAddressSearch` hook
- OCR address suggestions after text extraction
- Fixed execution progress persistence
- Improved mobile layout

See [CHANGELOG.md](../CHANGELOG.md) for full feature evolution.
