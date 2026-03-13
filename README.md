# Route Flow 🚚

> Optimizador de rutas para repartidores en Argentina

PWA para optimizar rutas de entrega. Carga hasta 1000 direcciones (manual o OCR), calcula rutas optimizadas priorizando tiempo, y guía al repartidor durante el recorrido con GPS en tiempo real.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + TypeScript
- **Tailwind CSS 4**
- **Leaflet** - Mapas OpenStreetMap
- **Tesseract.js** - OCR en navegador
- **IndexedDB** - Almacenamiento offline
- **OpenRouteService** - Routing y matrices
- **Vitest** - Testing

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Features

| Feature | Estado | Notas |
|---------|--------|-------|
| 📷 Carga de direcciones por foto (OCR) | ✅ INDEPENDENT | Usa Tesseract.js |
| 🗺️ Mapa con ruta optimizada | ✅ FALLBACK | ORS con Haversine fallback |
| 📍 Tracking GPS en tiempo real | ✅ INDEPENDENT | Browser Geolocation API |
| 🔄 Recálculo dinámico de rutas | ✅ FALLBACK | ORS con detección de desviación local |
| 📱 PWA instalable | ✅ INDEPENDENT | Service Worker + Manifest |
| 🔌 Funciona offline | ✅ INDEPENDENT | IndexedDB para datos |
| 📊 Matriz de distancias | ✅ FALLBACK | ORS con Haversine fallback |
| 🎯 Optimización de ruta (TSP) | ✅ FALLBACK | ORS con nearest-neighbor fallback |

### Estados de Features
- **INDEPENDENT**: Funciona sin API key externa
- **FALLBACK**: Usa ORS API cuando está disponible, fallback local cuando no
- **BLOCKED**: Requiere ORS API key (no implementado con fallback)

## Configuración

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key
```

Obtener API key gratuita en [openrouteservice.org](https://openrouteservice.org)

## Docs

- [PRD](./docs/PRD.md) - Product Requirements
- [RFC](./docs/RFC.md) - Technical Specification
- [FEATURES](./docs/FEATURES.md) - Feature Matrix
- [ORS_FALLBACK](./docs/ORS_FALLBACK.md) - Fallback System Documentation
