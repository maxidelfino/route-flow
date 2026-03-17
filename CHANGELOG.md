# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-17

### Added

#### Google Maps Platform Integration
- **Migration from Leaflet/ORS to Google Maps**: Complete rewrite of map integration
  - New `@vis.gl/react-google-maps` library for map rendering
  - Google Directions API for route optimization
  - Google Distance Matrix API for time/distance calculations
  - Google Geocoding API for address resolution
  - Fallback chain: Google Maps → ORS → Local Haversine

- **Route Mode Selection**: Users can now choose between:
  - **Circular route**: Return to start point (default, optimized distance)
  - **Linear route**: Visit nearest points first, no return (for one-way deliveries)

- **Unified Address Search**: Created `useAddressSearch` hook to unify 3 different search inputs
  - Used by AddressInput, StartPointSelector, and OCRUploader components

- **OCR Address Suggestions**: After OCR text extraction, users now see geocoded address suggestions

- **Execution Progress Persistence**: Fixed bug where route recalculation reset progress

#### UI/UX Improvements
- Fixed mobile layout issues preserving map visibility during scroll
- Route numbering now reflects optimized order
- Better error handling and loading states
- RouteInfo shows actual values instead of "--" when duration/distance is 0

#### PWA & Offline
- Configured `runtimeCaching` for offline asset caching (tiles, fonts, scripts)

### Fixed Bugs

- **RouteInfo "--" display**: Changed from ternary to `Number.isFinite()` check
- **Execution cancellation**: Fixed recalculation resetting `currentIndex` to 0
- **Modal reappearing**: Added `isOpen` prop for explicit modal control
- **OCR address flow**: Implemented proper suggestions display after OCR

### Changed

- Tech Stack updated:
  - Next.js 16.1.6 (was 14+)
  - React 19.2.3 (was 18+)
  - Tailwind CSS 4 (was 3.x)
  - Added `@vis.gl/react-google-maps` (replaced Leaflet)
  - Removed Leaflet and `react-leaflet` packages
  - Removed ORS as primary (now fallback only)

### Dependencies

- Added: `@vis.gl/react-google-maps`
- Removed: `leaflet`, `react-leaflet`, `@react-leaflet/core`

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
