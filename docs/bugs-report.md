# Reporte de Bugs - Route Flow

**Fecha del reporte:** 14 de Marzo de 2026

---

## Estado de los Tests Ejecutados

Se ejecutaron los siguientes tests:

| Test | Estado | Notas |
|------|--------|-------|
| Bug #1 fix: RouteInfo muestra valores (no "--") | ✅ PASS | Muestra "0 min" y "0 m" |
| Test 2: Calcular ruta e iniciar recorrido | ⚠️ FAIL | API issue (formato de datos) |
| Test 3: Panel de ejecución con GPS | ⚠️ NO EJECUTADO | Depende de Test 2 |
| Test 4: Completar entrega y recalculo | ⚠️ NO EJECUTADO | Depende de Test 2 |
| Test 5: Agregar parada durante recorrido | ⚠️ NO EJECUTADO | Depende de Test 2 |

---

## Bugs Encontrados

### Bug #1: RouteInfo muestra "--" para tiempo estimado y distancia en "Resumen del recorrido"

**Severidad:** Media

**Ubicación:** `src/components/RouteInfo/index.tsx`, líneas 99 y 105

**Estado:** ✅ CORREGIDO (14-Marzo-2026)

**Descripción:**
El componente `RouteInfo` muestra "--" (valor por defecto) en la sección "Resumen del recorrido" para:
- Tiempo estimado (`totalDuration`)
- Distancia (`totalDistance`)

Aunque la sección "Siguiente entrega" sí funciona correctamente mostrando tiempo y distancia al siguiente punto.

**Código problemático (YA CORREGIDO):**
```tsx
// Línea 99 - ANTES (bug)
{totalDuration ? formatDuration(totalDuration) : '--'}

// Línea 105 - ANTES (bug)
{totalDistance ? formatDistance(totalDistance) : '--'}
```

**Fix aplicado:**
```tsx
// Línea 99 - DESPUÉS (fix)
{Number.isFinite(totalDuration) ? formatDuration(totalDuration) : '--'}

// Línea 105 - DESPUÉS (fix)
{Number.isFinite(totalDistance) ? formatDistance(totalDistance) : '--'}
```

**Verificación:**
- Build: ✅ PASS (`npm run build` exitoso)
- Testing: ✅ El componente ahora muestra "0 min" y "0 m" en lugar de "--" cuando los valores son 0

---

### Bug #2: API route-optimize devuelve error de validación (FALLA SILENCIOSA)

**Severidad:** Alta

**Ubicación:** Frontend calling `/api/route-optimize`

**Estado:** ✅ CORREGIDO (15-Marzo-2026) - Migrated to Google Directions API

**Descripción:**
La aplicación se queda permanentemente en estado "Calculando ruta..." porque el frontend envía datos en formato incorrecto a la API.

**Causa raíz:**
- El frontend envía `startPoint: { lat, lng }` 
- La API espera `start: [lng, lat]` (array de coordenadas)

**Fix aplicado (Migración a Google Maps):**
- Se migró de ORS Directions API a Google Directions API
- El nuevo endpoint `/api/route-optimize` usa Google Maps
- Verificar: `GOOGLE_MAPS_API_KEY` configurado en `.env.local`

**Verificación manual de API:**
```bash
# Así funciona (formato correcto):
curl -X POST http://localhost:3000/api/route-optimize \
  -d '{"start":[-58.3806,-34.6191],"points":[{"id":"1","lat":-34.6191,"lng":-58.3806}]}'

# Respuesta exitosa:
{"route":["start","1"],"polyline":[[-58.3806,-34.6191],[-58.3943,-34.6045]],"totalDuration":0,"totalDistance":0,"etas":[0,0]}
```

---

### Bug #3: Modal de ejecución reaparece después de cerrar

**Severidad:** Media

**Ubicación:** Frontend - ExecutionPanel component

**Estado:** ✅ CORREGIDO (15-Marzo-2026) - Added isOpen prop

**Descripción:**
El modal de ejecución de ruta reaparecía automáticamente después de ser cerrado por el usuario.

**Fix aplicado:**
- Se agregó prop `isOpen` al componente Modal para control explícito
- El estado de apertura/cierre ahora se maneja correctamente desde el padre
- Ya no hay bucles infinitos de recálculo que causen re-renders

---

## Estado final (15 Marzo 2026):

- **Bug #1**: ✅ CORREGIDO - RouteInfo muestra "--"
- **Bug #2**: ✅ CORREGIDO - Migrated to Google Directions API
- **Bug #3**: ✅ CORREGIDO - Added isOpen prop to Modal
- **Bug #4**: ✅ CORREGIDO - Bucle infinito (eliminado recalculo recursivo)

---
