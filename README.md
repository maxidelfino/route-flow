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

- 📷 Carga de direcciones por foto (OCR)
- 🗺️ Mapa con ruta optimizada
- 📍 Tracking GPS en tiempo real
- 🔄 Recálculo dinámico de rutas
- 📱 PWA instalable
- 🔌 Funciona offline

## Configuración

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key
```

Obtener API key gratuita en [openrouteservice.org](https://openrouteservice.org)

## Docs

- [PRD](./docs/PRD.md) - Product Requirements
- [RFC](./docs/RFC.md) - Technical Specification
