# Feature Matrix - Route Flow

## Overview

This document details all features in Route Flow and their dependency on external services.

## Feature Status Legend

| Status | Description | Requires API Key |
|--------|-------------|------------------|
| ✅ INDEPENDENT | Fully functional without external services | No |
| ✅ FALLBACK | Works with ORS API, falls back to local when unavailable | Optional |
| 🔶 DEPRECATED | Feature exists but may be removed | N/A |

## Feature Matrix

### Core Features

| Feature | File(s) | Status | API Dependency | Fallback |
|---------|---------|--------|-----------------|----------|
| Address OCR | `src/components/OCRUploader/` | ✅ INDEPENDENT | None | N/A |
| Address Input/Validation | `src/components/AddressInput/` | ✅ INDEPENDENT | None | N/A |
| Address List Management | `src/components/AddressList/` | ✅ INDEPENDENT | None | N/A |
| Route Optimization | `src/app/api/route-optimize/` | ✅ FALLBACK | ORS API | nearest-neighbor |
| Distance Matrix | `src/app/api/matrix/` | ✅ FALLBACK | ORS API | Haversine |
| Route Display | `src/components/Map/` | ✅ FALLBACK | ORS API | Straight polyline |
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

### OpenRouteService (ORS)

The app uses OpenRouteService for:
- Route optimization ( Traveling Salesman Problem )
- Distance/duration matrices
- Turn-by-turn routing

**Getting an API key:**
1. Register at [openrouteservice.org](https://openrouteservice.org)
2. Create a free account
3. Generate an API token
4. Add to `.env.local`:

```env
NEXT_PUBLIC_ORS_API_KEY=your-api-key-here
```

### Fallback Behavior

When ORS API key is not configured:

| Feature | Fallback Behavior |
|---------|-------------------|
| Route Optimization | Nearest-neighbor heuristic |
| Distance Matrix | Haversine formula calculation |
| Route Display | Straight-line polyline |
| ETA Calculation | Distance / average speed (30 km/h) |

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

## Migration History

See [CHANGELOG.md](../CHANGELOG.md) for feature evolution.
