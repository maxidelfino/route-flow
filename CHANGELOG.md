# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-13

### Added

#### Architecture & Routing
- **Fallback System**: Implemented robust fallback system for when ORS API key is not configured
  - New folder structure: `src/lib/routing/ors/` (API-dependent) and `src/lib/routing/local/` (fallback)
  - Automatic fallback from ORS to local Haversine calculations
  - `isFallback` flag in all route/matrix responses

- **Local Routing Functions** (`src/lib/routing/local/`):
  - `calculateDistance()` - Haversine formula for accurate distance calculation
  - `estimateDuration()` - ETA based on distance and average speed
  - `calculateRouteEta()` - Total route duration estimation
  - `buildLocalMatrix()` - Distance/duration matrix using Haversine
  - `detectRouteDeviation()` - Check if user is off the planned route
  - `createStraightLinePolyline()` - Simple polyline for fallback visualization
  - `interpolateLine()` - Line interpolation for smooth fallback routes
  - `createInterpolatedPolyline()` - Multi-segment polyline interpolation
  - `compareRouteWithPosition()` - Compare current position to planned route
  - `getEstimatedTimeRemaining()` - Time remaining based on current position

- **UI Notifications**:
  - Warning banner when ORS API key is not configured

#### Documentation
- `docs/FEATURES.md` - Complete feature matrix with status indicators
- `docs/ORS_FALLBACK.md` - Technical documentation of fallback system
- README.md updated with feature status matrix

### Changed

- **API Endpoints**:
  - `/api/route-optimize` - Now uses fallback system automatically
  - `/api/matrix` - Now returns 503 with helpful message when ORS unavailable

- **Route Display**:
  - Map component displays straight-line polylines when ORS unavailable
  - Visual indicator shows when fallback mode is active

### Dependencies

- No new dependencies added

## [0.9.0] - 2026-02-01

### Added
- Initial PWA implementation
- OCR address upload with Tesseract.js
- GPS tracking
- IndexedDB offline storage

### Features
- Route optimization via ORS API
- Map display with Leaflet
- Offline mode support
