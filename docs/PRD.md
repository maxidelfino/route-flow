# Route Flow - Product Requirements Document (PRD)

## 1. Resumen del Producto

**Route Flow** es una aplicación web progresiva (PWA) diseñada para optimizar rutas de repartidores en Argentina. Permite cargar hasta 1000 direcciones mediante entrada manual o OCR desde fotos de planillas impresas, calcular rutas optimizadas que priorizan tiempo sobre distancia, y guiar al repartidor durante el recorrido con actualización dinámica de la ruta.

### Propósito del Documento

Este PRD establece los requisitos funcionales y no funcionales para el desarrollo del MVP de Route Flow, destinado a 2 usuarios iniciales en Argentina.

---

## 2. Contexto de Negocio

### Problema Actual

Los repartidores en Argentina enfrentan dificultades para optimizar sus entregas:

- Carga manual de múltiples direcciones consume tiempo valioso
- No existe visibilidad en tiempo real del recorrido
- No hay forma de optimizar el orden de entregas automáticamente
- Necesidad de recalcular rutas cuando surgen desvíos o cambios

### Solución Propuesta

Una PWA mobile-first que permita:

- Carga rápida de direcciones (manual + OCR con cámara)
- Optimización automática de rutas priorizando tiempo
- Visualización en mapa con GPS en tiempo real
- Recálculo dinámico ante desvíos o cambios

### Usuarios Objetivo

- Repartidores en Argentina (inicialmente 2 usuarios)
- Contexto de trabajo: zonas urbanas y periurbanas
- Condiciones: posible falta de conectividad hasta 3 horas

---

## 3. Supuestos y Restricciones del MVP

### Supuestos Clave

| Supuesto | Descripción |
|----------|-------------|
| Dispositivo único | 1 dispositivo = 1 repartidor (sin sincronización) |
| Un viaje por día | El flujo se reinicia al completar las entregas |
| Sin autenticación | No requiere login ni usuarios |
| Sin persistencia | Datos sonephemeral; solo se guardan por seguridad ante recarga |
| Uso en Argentina | APIs deben funcionar correctamente en territorio argentino |

### Restricciones Técnicas

| Restricción | Detalle |
|-------------|---------|
| Presupuesto | $0 - solo servicios gratuitos |
| Proveedores | Nominatim (geocoding), ORS (rutas/matrices) |
| Límite de direcciones | Máximo 1000 por recorrido |
| Offline | Hasta 3 horas sin conexión |
| PWA | Solo desde URL (Vercel), sin Play Store |

---

## 4. Requisitos Funcionales

### 4.1 Gestión de Direcciones

#### RF-001: Carga manual de direcciones
- El usuario puede agregar direcciones manualmente mediante un formulario
- El formulario debe incluir campos: calle, número, ciudad (opcional)
- Debe existir auto-completado mientras el usuario escribe (sugerencias de Nominatim)
- La dirección debe confirmarse manualmente antes de guardarse

#### RF-002: Carga mediante OCR
- El usuario puede tomar una foto o seleccionar de la galería
- Tesseract.js extrae el texto de la imagen
- El texto extraído se muestra en un campo editable para confirmación
- El usuario puede modificar el texto antes de confirmar
- Una vez confirmada, la imagen temporal se elimina

#### RF-003: Lista de direcciones
- Se muestra una lista de todas las direcciones cargadas
- Cada item muestra: dirección confirmada, estado (pendiente/procesada/completada)
- El usuario puede reordenar manualmente mediante drag & drop
- El usuario puede eliminar direcciones antes de iniciar el recorrido

#### RF-004: Geocodificación de direcciones
- Las direcciones confirmadas se geocodifican usando Nominatim
- Se implementa cache local para evitar geocodificar la misma dirección dos veces
- Si la geocodificación falla, el usuario puede editar la dirección y reintentar
- Indicador de progreso durante el proceso de geocodificación

### 4.2 Configuración del Recorrido

#### RF-005: Definición del punto de inicio (Punto 0)
- El usuario puede elegir cualquier ubicación como punto de inicio
- Puede seleccionarse desde el mapa o ingresar una dirección
- El punto 0 se guarda y no es modificable una vez iniciado el recorrido

### 4.3 Optimización de Rutas

#### RF-006: Cálculo de ruta optimizada
- Al presionar "Calcular ruta", se genera una ruta optimizada
- **Algoritmo**: Nearest Neighbor ponderado con mejora 2-opt
- **Ponderación**: Tiempo tiene mayor peso que distancia (alpha > beta)
- El resultado muestra: orden de paradas, polyline, tiempo estimado total, distancia total

#### RF-007: Visualización de la ruta en mapa
- Mapa con OpenStreetMap + Leaflet
- Polilínea mostrando la ruta completa
- Marcadores para cada parada en orden
- Marcador destacado para la próxima parada

### 4.4 Ejecución del Recorrido

#### RF-008: Modo ejecución del recorrido
- El usuario inicia el recorrido cuando está listo
- El mapa muestra siempre la posición actual del repartidor (GPS)
- Se indica la próxima parada con instrucciones: dirección, distancia, tiempo estimado
- Botón para marcar la parada como completada

#### RF-009: Recálculo dinámico de ruta
- Al marcar una parada como completada, se recalcula la ruta con los puntos restantes
- **Recálculo por desvío**: Si el repartidor se desvía y está más cerca del siguiente punto que el originally planned, se recalcula la ruta completa

#### RF-010: Modificación durante el recorrido
- El usuario puede agregar nuevas direcciones durante el recorrido
- Al agregar, se avisa que la ruta se recalculará y tardará más
- Se recalcula la ruta con el nuevo punto insertado

#### RF-011: Finalización del recorrido
- Cuando todas las paradas están completadas, se muestra un resumen
- Tiempo total del recorrido, distancia total, cantidad de entregas
- Opción de iniciar un nuevo recorrido (limpia todo)

### 4.5 PWA y Offline

#### RF-012: Funcionalidad offline
- La app funciona sin conexión para cargar direcciones e imágenes
- Las direcciones e imágenes se guardan en IndexedDB
- Si no hay conexión, se muestran advertencias: "Operando offline - optimización pendiente"
- Al恢复 conexión, se procesa la geocodificación y optimización

#### RF-013: Instalación como PWA
- La app es instalable desde Chrome Android y Safari iOS
- Se cachean los assets necesarios para funcionamiento offline básico

---

## 5. Requisitos No Funcionales

### 5.1 Rendimiento

| Requisito | Criterio |
|-----------|----------|
| Tiempo de carga inicial | < 3 segundos en 3G |
| Geocodificación por dirección | < 2 segundos por dirección |
| Cálculo de ruta (100 direcciones) | < 30 segundos |
| Actualización de GPS | Cada 5 segundos |

### 5.2 Usabilidad

- Interfaz mobile-first optimizada para pantallas de 360px-428px
- Touch targets mínimo de 44x44px
- Feedback visual para todas las acciones del usuario
- Indicadores de carga claros durante procesos largos

### 5.3 Compatibilidad

- Chrome Android (últimas 2 versiones)
- Safari iOS (últimas 2 versiones)
- Responsive design para mobile-first

### 5.4 Privacidad

- Las imágenes solo se almacenan localmente hasta confirmación
- No se suben imágenes a servidores terceros
- No se requiere autenticación ni almacenamiento de datos personales

---

## 6. Flujos de Usuario

### Flujo Principal: Carga y Ejecución de Recorrido

```
┌─────────────────────────────────────────────────────────────────┐
│                         INICIO APP                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. SELECCIONAR PUNTO 0 (punto de inicio)                       │
│     - Elegir en mapa o ingresar dirección                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CARGAR DIRECCIONES                                           │
│     a) Manual: escribir dirección con auto-completado           │
│     b) OCR: tomar foto → OCR → confirmar/edit → guardar        │
│     - Repetir hasta tener todas las direcciones                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. GEOCODIFICAR DIRECCIONES                                     │
│     - Proceso automático al presionar "Calcular ruta"          │
│     - Progress indicator durante el proceso                    │
│     - Fallos: permitir editar y reintentar                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CALCULAR RUTA OPTIMIZADA                                     │
│     - Algoritmo: Nearest Neighbor + 2-opt                       │
│     - Prioridad: tiempo > distancia                             │
│     - Resultado: orden de paradas, polyline, ETAs              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. INICIAR RECORRIDO                                           │
│     - Mapa muestra ruta + posición actual (GPS)                 │
│     - Lista de paradas en orden                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. EJECUCIÓN DEL RECORRIDO                                      │
│     ┌───────────────────────────────────────────────────────┐   │
│     │  a) Ver info próxima parada (dirección, tiempo, dist) │   │
│     │  b) Marcar como completada                            │   │
│     │     → Recálculo con puntos restantes                  │   │
│     │  c) Agregar nueva dirección durante recorrido         │   │
│     │     → Recálculo con aviso de demora                  │   │
│     │  d) Desvío: si está más cerca del sig. punto         │   │
│     │     → Recálculo automático                            │   │
│     └───────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. FINALIZAR RECORRIDO                                          │
│     - Resumen: tiempo total, distancia, entregas                │
│     - Opción: iniciar nuevo recorrido                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Arquitectura Técnica

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14+ (App Router), React, TypeScript |
| Estilos | Tailwind CSS |
| Mapa | OpenStreetMap + Leaflet + react-leaflet |
| OCR | Tesseract.js (web worker) |
| Almacenamiento | IndexedDB (via idb) |
| APIs | Next.js API Routes |
| Geocoding | Nominatim (OpenStreetMap) |
| Rutas/Matrices | OpenRouteService (ORS) |
| PWA | next-pwa + service worker |

### Estructura de Proyecto

```
/route-flow
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # Pantalla principal
│  │  ├─ layout.tsx               # Layout con PWA
│  │  └─ api/                      # API Routes
│  │     ├─ geocode/route.ts       # Geocodificación
│  │     ├─ matrix/route.ts        # Matriz de tiempos/distancias
│  │     └─ route-optimize/route.ts # Optimización de ruta
│  ├─ components/
│  │  ├─ MapView/                  # Componente de mapa
│  │  ├─ AddressList/              # Lista de direcciones
│  │  ├─ OCRUploader/              # Carga y OCR de imágenes
│  │  ├─ RouteInstructions/       # Instrucciones de navegación
│  │  └─ DraggableList/            # Lista ordenable
│  ├─ lib/
│  │  ├─ geocode.ts                # Cliente Nominatim
│  │  ├─ ors.ts                    # Cliente ORS
│  │  ├─ routing.ts                # Lógica de rutas
│  │  ├─ tsp.ts                    # Algoritmo TSP (Nearest Neighbor + 2-opt)
│  │  └─ storage.ts                # IndexedDB wrapper
│  └─ hooks/
│       ├─ useGPS.ts               # GPS del dispositivo
│       └─ useRoute.ts             # Estado del recorrido
├─ public/
│  └─ manifest.json               # Manifiesto PWA
└── scripts/
     └─ generate-sample.ts        # Generador de datos de prueba
```

---

## 8. APIs Externas y Límites

### Nominatim (Geocoding)

| Aspecto | Detalle |
|---------|---------|
| URL | https://nominatim.openstreetmap.org |
| Límite | 1 request/segundo |
| Cache | Implementar cache local (24 horas) |
| País | Filter: Argentina (country codes: AR) |

### OpenRouteService (Rutas/Matrices)

| Aspecto | Detalle |
|---------|---------|
| API Key | Variable ORS_API_KEY (gratuito con registro) |
| Endpoints | /v2/matrix, /v2/directions |
| Límite | 2000 requests/día (free tier) |
| Fallback | OSRM si ORS no responde |

---

## 9. Algoritmo de Optimización

### Estrategia MVP (Escalable)

Para el MVP con 2 usuarios, se implementará un algoritmo simplificado que escala hasta 100 direcciones sin clustering:

1. **Geocodificación**: Convertir direcciones a coordenadas con cache
2. **Matriz de tiempos/distancias**: Obtener matriz NxN (o subconjunto) de ORS
3. **Algoritmo base**: Nearest Neighbor ponderado
   - Función de costo: `w = alpha * time + beta * distance`
   - alpha = 0.7, beta = 0.3 (prioriza tiempo)
4. **Mejora local**: 2-opt iterativo (hasta 100 iteraciones)
5. **Recálculo en ejecución**:
   - Al completar una parada: re-ejecutar con puntos restantes
   - Usar matrices cacheadas para velocidad

### Notas de Escalabilidad

- Para >200 direcciones: implementar clustering (k-means)
- Para producción: evaluar Google OR-Tools o pgRouting
- Matrices >100x100 pueden superar límites gratuitos de ORS

---

## 10. Criterios de Aceptación del MVP

### CA-001: Carga de Direcciones
- [ ] Puedo cargar direcciones manualmente con auto-completado
- [ ] Puedo cargar direcciones mediante foto + OCR
- [ ] El texto del OCR es editable antes de confirmar
- [ ] Las direcciones aparecen en una lista visible

### CA-002: Geocodificación
- [ ] Las direcciones se geocodifican automáticamente
- [ ] Hay indicador de progreso durante geocodificación
- [ ] Si falla, puedo editar y reintentar

### CA-003: Optimización de Ruta
- [ ] Al presionar "Calcular ruta" se genera una ruta optimizada
- [ ] La ruta prioriza tiempo sobre distancia
- [ ] Se muestra: orden de paradas, polyline, tiempo total, distancia total

### CA-004: Visualización
- [ ] El mapa muestra la ruta completa con polilínea
- [ ] Los marcadores indican cada parada en orden
- [ ] La posición actual del repartidor se muestra en tiempo real

### CA-005: Ejecución del Recorrido
- [ ] Puedo iniciar el recorrido con la ruta calculada
- [ ] La información de la próxima parada es visible (dirección, tiempo, distancia)
- [ ] Al marcar una parada completada, la ruta se recalcula

### CA-006: Recálculo por Desvío
- [ ] Si me desvío y estoy más cerca del siguiente punto, la ruta se recalcula

### CA-007: Modificación Durante Recorrido
- [ ] Puedo agregar nuevas direcciones durante el recorrido
- [ ] Se avisa que el cálculo tardará más

### CA-008: PWA y Offline
- [ ] La app funciona sin conexión para cargar direcciones
- [ ] La app es instalable desde URL (Chrome/Safari)
- [ ] Los assets están cacheados para funcionamiento offline básico

### CA-009: Resumen Final
- [ ] Al completar todas las paradas se muestra un resumen
- [ ] Puedo iniciar un nuevo recorrido

---

## 11. Roadmap Post-MVP (Fuera del Alcance Actual)

| Feature | Prioridad | Notas |
|---------|-----------|-------|
| Clustering para >200 direcciones | Media | k-means antes de matriz |
| Historial de recorridos | Baja | Persistencia en IndexedDB |
| Múltiples vehículos | Baja | VRP completo |
| Integración con Waze | Baja | Navegación turn-by-turn |
| Notificaciones push | Baja | Para nuevas asignaciones |

---

## 12. Glosario

| Término | Definición |
|---------|------------|
| **Punto 0** | Ubicación de inicio del recorrido (depot) |
| **Geocodificación** | Conversión de dirección texto a coordenadas (lat/lon) |
| **Matriz de tiempos/distancias** | Matriz NxN con tiempos y distancias entre todos los puntos |
| **TSP** | Traveling Salesman Problem - Problema del vendedor viajero |
| **2-opt** | Algoritmo de mejora local para rutas |
| **Polyline** | Representación codificada de una línea en el mapa |
| **ETA** | Estimated Time Arrival - Tiempo estimado de llegada |
| **PWA** | Progressive Web App - Aplicación web progresiva |

---

## 13. Historial de Revisiones

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0.0 | 2026-03-12 | Maxi | Versión inicial del PRD |

---

*Documento creado para el desarrollo del MVP de Route Flow - Optimizador de rutas para repartidores en Argentina*
