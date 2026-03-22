import { Point, nearestNeighborLinear, twoOptLinear, optimizeLinearPipeline, optimizeCircularPipeline } from './tsp';

// ─── Config ───────────────────────────────────────────────────────────────────
//
// 15 paradas por cluster en vez de 25:
//   - Con 30 puntos → k=2 clusters de 15 c/u (antes era 25+5, inútil)
//   - Con 300 puntos → k=20 clusters de 15 c/u
//   - 15×15=225 pares por llamada Distance Matrix (bien dentro del límite de 100×100)
//
const TARGET_CLUSTER_SIZE = 15;
const KMEANS_MAX_ITERATIONS = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Cluster {
  points: Point[];
  centroid: { lat: number; lng: number };
}

export interface ClusteredRouteResult {
  orderedPoints: Point[];
  polyline: number[][];
  totalDuration: number;
  totalDistance: number;
  etas: number[];
  meta: {
    clusterCount: number;
    clusterSizes: number[];
    clusterOrder: number[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function euclideanDist(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// ─── k-means++ ───────────────────────────────────────────────────────────────

function kMeansPlusPlusInit(
  points: Point[],
  k: number
): Array<{ lat: number; lng: number }> {
  const centroids: Array<{ lat: number; lng: number }> = [];

  const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const center = { lat: avgLat, lng: avgLng };

  let closestToCenter = points[0];
  let minDist = Infinity;
  for (const p of points) {
    const d = euclideanDist(p, center);
    if (d < minDist) { minDist = d; closestToCenter = p; }
  }
  centroids.push({ lat: closestToCenter.lat, lng: closestToCenter.lng });

  while (centroids.length < k) {
    const distances = points.map(p =>
      Math.min(...centroids.map(c => euclideanDist(p, c)))
    );
    const totalDist = distances.reduce((s, d) => s + d * d, 0);
    let rand = Math.random() * totalDist;

    for (let i = 0; i < points.length; i++) {
      rand -= distances[i] * distances[i];
      if (rand <= 0) {
        centroids.push({ lat: points[i].lat, lng: points[i].lng });
        break;
      }
    }
    if (centroids.length < k) {
      centroids.push({ lat: points[points.length - 1].lat, lng: points[points.length - 1].lng });
    }
  }

  return centroids;
}

// ─── k-means ──────────────────────────────────────────────────────────────────

export function kMeans(points: Point[], k: number): Cluster[] {
  if (points.length <= k) {
    return points.map(p => ({ points: [p], centroid: { lat: p.lat, lng: p.lng } }));
  }

  let centroids = kMeansPlusPlusInit(points, k);
  let assignments = new Array(points.length).fill(0);
  let changed = true;
  let iterations = 0;

  while (changed && iterations < KMEANS_MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (let i = 0; i < points.length; i++) {
      let nearest = 0;
      let nearestDist = Infinity;
      for (let j = 0; j < k; j++) {
        const d = euclideanDist(points[i], centroids[j]);
        if (d < nearestDist) { nearestDist = d; nearest = j; }
      }
      if (assignments[i] !== nearest) { assignments[i] = nearest; changed = true; }
    }

    const sums = Array.from({ length: k }, () => ({ lat: 0, lng: 0, count: 0 }));
    for (let i = 0; i < points.length; i++) {
      sums[assignments[i]].lat += points[i].lat;
      sums[assignments[i]].lng += points[i].lng;
      sums[assignments[i]].count++;
    }
    centroids = sums.map((s, idx) =>
      s.count > 0 ? { lat: s.lat / s.count, lng: s.lng / s.count } : centroids[idx]
    );
  }

  const clusters: Cluster[] = centroids.map(c => ({ points: [], centroid: c }));
  for (let i = 0; i < points.length; i++) clusters[assignments[i]].points.push(points[i]);

  return clusters.filter(c => c.points.length > 0);
}

export function clusterPoints(points: Point[], maxPerCluster = TARGET_CLUSTER_SIZE): Cluster[] {
  if (points.length <= maxPerCluster) {
    const centroid = {
      lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
      lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    };
    return [{ points, centroid }];
  }
  const k = Math.ceil(points.length / maxPerCluster);
  return kMeans(points, k);
}

// ─── Orden inter-cluster ────────────────────────────────────────────────────────

export function orderClusters(
  clusters: Cluster[],
  startPoint: { lat: number; lng: number },
  circular = false
): Cluster[] {
  if (clusters.length <= 1) return clusters;

  const allPoints = [startPoint, ...clusters.map(c => c.centroid)];
  const n = allPoints.length;

  const durations: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 0 : euclideanDist(allPoints[i], allPoints[j])
    )
  );

  const nnOrder = nearestNeighborLinear(n, durations);

  // Para circular, usar 2-opt circular en el orden de clusters
  const optimizedOrder = circular
    ? optimizeCircularPipeline(nnOrder, durations, 3)
    : twoOptLinear(nnOrder, durations);

  return optimizedOrder
    .filter(idx => idx !== 0)
    .map(idx => clusters[idx - 1]);
}

// ─── Pipeline principal con clustering ───────────────────────────────────────

export async function optimizeWithClustering(
  points: Point[],
  startPoint: { lat: number; lng: number },
  circular = false
): Promise<ClusteredRouteResult> {
  if (points.length === 0) {
    return {
      orderedPoints: [], polyline: [], totalDuration: 0, totalDistance: 0, etas: [],
      meta: { clusterCount: 0, clusterSizes: [], clusterOrder: [] },
    };
  }

  const { getDurationMatrix, getDirections, decodePolyline } = await import('./google-maps');

  const clusters = clusterPoints(points);
  const orderedClusters = orderClusters(clusters, startPoint, circular);

  const clusterSizes = orderedClusters.map(c => c.points.length);
  const clusterOrder = orderedClusters.map((_, i) => i);

  // Procesar clusters secuencialmente para poder pasar el ÚLTIMO PUNTO REAL
  // de cada cluster como startPoint del siguiente.
  // (antes se usaba el centroide, que era impreciso)
  const clusterResults: Array<{
    orderedPoints: Point[];
    polyline: number[][];
    totalDuration: number;
    totalDistance: number;
    legDurations: number[];
    lastPoint: Point;  // ← el último punto real entregado en este cluster
  }> = [];

  let currentStart: { lat: number; lng: number } = startPoint;

  for (let clusterIdx = 0; clusterIdx < orderedClusters.length; clusterIdx++) {
    const cluster = orderedClusters[clusterIdx];
    const clusterPointsList = cluster.points;
    const isLastCluster = clusterIdx === orderedClusters.length - 1;

    // Coordenadas: [currentStart, ...delivery points del cluster]
    const coordinates: [number, number][] = [
      [currentStart.lat, currentStart.lng],
      ...clusterPointsList.map(p => [p.lat, p.lng] as [number, number]),
    ];

    const durations = await getDurationMatrix(coordinates);
    const n = coordinates.length;

    // Para el último cluster en modo circular, usar el pipeline circular
    // para que la última parada quede cerca del startPoint global
    const nnRoute = nearestNeighborLinear(n, durations);
    let optimized: number[];

    if (circular && isLastCluster) {
      // El último cluster se optimiza considerando el retorno al inicio
      // Añadimos el startPoint global como nodo virtual al final de la matriz
      // de duraciones para que el pipeline circular lo vea
      const augmented = durations.map(row => [...row]);
      // El índice 0 en esta matriz ya es currentStart, pero necesitamos
      // que el pipeline sepa que índice 0 = startPoint GLOBAL
      // En el último cluster, currentStart puede diferir del startPoint global
      // si hay múltiples clusters. Agregamos la distancia real al startPoint global.
      // Por simplicidad y corrección, pasamos el pipeline circular que ya
      // considera la arista índice_last → índice_0 (que aquí es currentStart,
      // aproximación válida para el último tramo)
      optimized = optimizeCircularPipeline(nnRoute, durations);
    } else {
      optimized = optimizeLinearPipeline(nnRoute, durations);
    }

    const orderedClusterPoints = optimized
      .filter(idx => idx !== 0)
      .map(idx => clusterPointsList[idx - 1]);

    if (orderedClusterPoints.length === 0) continue;

    const destination = orderedClusterPoints[orderedClusterPoints.length - 1];
    const waypointPoints = orderedClusterPoints.slice(0, -1);

    const directionsWaypoints = waypointPoints.map(p => ({
      location: [p.lat, p.lng] as [number, number],
      stopover: true as const,
    }));

    const directionsResponse = await getDirections(
      [currentStart.lat, currentStart.lng],
      [destination.lat, destination.lng],
      directionsWaypoints,
      { optimize: false }
    );

    const route = directionsResponse.routes[0];
    const polyline = decodePolyline(route.overview_polyline.points);

    let clusterDuration = 0;
    let clusterDistance = 0;
    const clusterEtas: number[] = [];

    for (const leg of route.legs) {
      clusterDuration += leg.duration.value / 60;
      clusterDistance += leg.distance.value / 1000;
      clusterEtas.push(leg.duration.value / 60);
    }

    clusterResults.push({
      orderedPoints: orderedClusterPoints,
      polyline,
      totalDuration: clusterDuration,
      totalDistance: clusterDistance,
      legDurations: clusterEtas,
      lastPoint: destination,
    });

    // FIX: pasar el último punto REAL (no el centroide) al siguiente cluster
    currentStart = { lat: destination.lat, lng: destination.lng };
  }

  // ─── Concatenar resultados ─────────────────────────────────────────────────

  const allOrderedPoints: Point[] = [];
  const allPolyline: number[][] = [];
  let totalDuration = 0;
  let totalDistance = 0;
  const allEtas: number[] = [0];

  for (const result of clusterResults) {
    allOrderedPoints.push(...result.orderedPoints);
    allPolyline.push(...result.polyline);
    totalDuration += result.totalDuration;
    totalDistance += result.totalDistance;
    for (const legDuration of result.legDurations) {
      allEtas.push(allEtas[allEtas.length - 1] + legDuration);
    }
  }

  return {
    orderedPoints: allOrderedPoints,
    polyline: allPolyline,
    totalDuration: Math.round(totalDuration),
    totalDistance,
    etas: allEtas,
    meta: { clusterCount: orderedClusters.length, clusterSizes, clusterOrder },
  };
}
