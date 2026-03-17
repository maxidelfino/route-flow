# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-17

### Added

#### Code Refactoring & Reusability
- **Shared Utilities**: Created centralized utilities to eliminate code duplication
  - `format.ts`: `formatDistance()`, `formatDuration()`, `formatDistanceCompact()`
  - `rate-limit.ts`: Reusable rate limiter for external APIs
  - `constants.ts`: Centralized constants for API configuration

- **Reusable Components**: Created base components following container-presentational pattern
  - `Banner`: Base component with variants (info, warning, error, success, accent)
  - `Overlay`: Reusable modal/dialog overlay with click-outside and Escape handling
  - `Button`: Button with variants (primary, secondary, outline, ghost, danger, success) and sizes
  - `Card`: Card component with CardHeader, CardTitle, CardDescription, CardContent, CardFooter

- **Hooks**
  - `useEventListener`: Reusable hook for DOM event subscriptions

- **Tests**: Added 25+ unit tests for new components and utilities
  - `format.test.ts`, `rate-limit.test.ts`, `constants.test.ts`
  - `Banner.test.tsx`, `Overlay.test.tsx`, `Button.test.tsx`, `Card.test.tsx`
  - `ConfirmDialog.test.tsx`, `LoadingSpinner.test.tsx`, `ErrorToast.test.tsx`

#### CI/CD & Code Quality
- **GitHub Actions CI**: Created `.github/workflows/ci.yml`
  - Runs lint, tests, and build on push/PR

- **Husky Hooks**: Setup pre-commit hook for running tests
  - Pre-commit: Runs unit tests before commit

### Changed

- **Refactored Components**: Updated to use shared utilities
  - `RouteSummary`, `RouteInfo`, `page.tsx`: Use `format.ts`
  - `DeviationBanner`, `OfflineBanner`, `ORSWarningBanner`: Use `Banner` component
  - `ConfirmDialog`: Uses `Overlay` component
  - `google-maps.ts`: Re-exports `decodePolyline` from `polyline.ts`
  - `geocode.ts`: Uses `rate-limit.ts`
  - `routing/index.ts`: Re-exports API configuration functions

- **Updated Dependencies**
  - Added `vitest` test runner

### Fixed

- Eliminated duplicate `decodePolyline` function (was in 2 places)
- Eliminated duplicate `formatDistance`/`formatDuration` functions (was in 3 components)
- Eliminated duplicate API configuration functions (`isGoogleMapsConfigured`, `isApiKeyConfigured`)

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
