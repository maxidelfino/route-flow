# ORS Fallback System

## Overview

Route Flow implements a robust fallback system that allows the application to function even when the OpenRouteService (ORS) API key is not configured. This document explains how the fallback system works.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                  (route-optimize, matrix API)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Routing Module                             │
│              src/lib/routing/index.ts                       │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │   ORS Module        │    │    Local Module          │  │
│  │ src/lib/routing/ors │    │ src/lib/routing/local    │  │
│  │                     │    │                          │  │
│  │ - getRoute()        │    │ - calculateDistance()    │  │
│  │ - getMatrix()       │    │ - buildLocalMatrix()     │  │
│  │                     │    │ - createPolyline()       │  │
│  └──────────┬──────────┘    └────────────┬─────────────┘  │
│             │                             │                 │
│             └──────────┬──────────────────┘                 │
│                        ▼                                    │
│            ┌─────────────────────┐                         │
│            │  Fallback Logic     │                         │
│            │ isApiKeyConfigured()│                         │
│            └─────────────────────┘                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐     ┌───────────────────┐
│ ORS API Server    │     │ Local Calculation │
│ (requires key)    │     │ (Haversine)       │
└───────────────────┘     └───────────────────┘
```

## How Fallback Works

### 1. API Key Detection

The system checks if the ORS API key is configured:

```typescript
// src/lib/ors/index.ts
export function isApiKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ORS_API_KEY);
}
```

### 2. Route Optimization Fallback

When `NEXT_PUBLIC_ORS_API_KEY` is not set:

```typescript
// The route-optimize API endpoint tries ORS first
const result = await getRouteWithFallback(coordinates);

// Internally:
// 1. Checks isApiKeyConfigured()
// 2. If false or useFallback=true → uses local fallback
// 3. If true → attempts ORS request
// 4. If ORS fails → catches error and uses local fallback
```

### 3. Local Fallback Algorithms

#### Distance Calculation (Haversine Formula)

```typescript
// src/lib/routing/local/haversine.ts
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

#### Route Optimization (Nearest Neighbor)

```typescript
// Simple TSP heuristic for local optimization
function optimizeRouteLocal(points: Coordinates[]): Coordinates[] {
  const optimized: Coordinates[] = [points[0]];
  const remaining = points.slice(1);
  
  while (remaining.length > 0) {
    const last = optimized[optimized.length - 1];
    const nearest = remaining.reduce((min, point) => {
      const dist = calculateDistance(last, point);
      return dist < min.dist ? { point, dist } : min;
    }, { point: remaining[0], dist: Infinity });
    
    optimized.push(nearest.point);
    remaining.splice(remaining.indexOf(nearest.point), 1);
  }
  
  return optimized;
}
```

#### ETA Calculation

```typescript
// Estimate duration based on distance and average speed
export function calculateRouteEta(
  points: Coordinates[],
  avgSpeedKmh: number = 30 // default for city delivery
): number {
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(points[i], points[i + 1]);
  }
  return (totalDistance / avgSpeedKmh) * 3600; // seconds
}
```

#### Polyline Generation

```typescript
// Create a simple straight-line polyline for visualization
export function createStraightLinePolyline(
  coordinates: number[][]
): number[][] {
  if (coordinates.length < 2) return coordinates;
  
  const points: number[][] = [];
  const steps = 10; // interpolation points
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      points.push([
        lng1 + (lng2 - lng1) * t,
        lat1 + (lat2 - lat1) * t
      ]);
    }
  }
  
  points.push(coordinates[coordinates.length - 1]);
  return points;
}
```

## Configuration

### Setting Up ORS API Key

1. Get a free API key from [openrouteservice.org](https://openrouteservice.org/dev/#/signup)
2. Create `.env.local` in project root:

```env
NEXT_PUBLIC_ORS_API_KEY=your_ors_api_key_here
```

3. Restart the development server

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ORS_API_KEY` | No | OpenRouteService API key |

## Detecting Fallback Mode

### In Code

```typescript
import { isORSConfigured, getRouteWithFallback } from '@/lib/routing';

const result = await getRouteWithFallback(coordinates);

if (result.isFallback) {
  console.warn('Using local fallback - ORS API not available');
}
```

### In UI

The application displays a warning banner when ORS is not configured:

```
⚠️ ORS API Key no configurada - usando cálculo local
```

This helps users understand why route calculations might be less accurate.

## Limitations of Local Fallback

| Aspect | ORS API | Local Fallback |
|--------|---------|----------------|
| Route optimization | True TSP solver | Nearest-neighbor heuristic |
| Traffic data | Real-time | None (uses average speed) |
| Road preferences | Multiple options | None (straight lines) |
| Distance accuracy | Road network | Great-circle (straight line) |
| Turn-by-turn | Full instructions | None |

## Adding New Routing Features

When adding new routing features:

1. Implement in `src/lib/routing/local/` first
2. Add ORS-specific version in `src/lib/routing/ors/`
3. Add fallback logic in `src/lib/routing/index.ts`
4. Always set `isFallback: boolean` in return value

Example:

```typescript
export async function getRouteWithFallback(...) {
  if (!isApiKeyConfigured()) {
    return { ...localResult, isFallback: true };
  }
  
  try {
    const result = await ors.getRoute(...);
    return { ...result, isFallback: false };
  } catch (error) {
    return { ...localResult, isFallback: true };
  }
}
```
