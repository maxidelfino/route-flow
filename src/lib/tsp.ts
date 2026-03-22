import { DEFAULT_ALPHA, DEFAULT_BETA } from './constants';
import { calculateDistance, estimateDuration } from './routing/local/haversine';

export interface Point {
  id: string;
  lat: number;
  lng: number;
}

export interface Matrix {
  durations: number[][];
  distances: number[][];
}

export interface RouteResult {
  route: number[];
  totalDuration: number;
  totalDistance: number;
  etas: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function weightedCost(
  duration: number,
  distance: number,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number {
  return alpha * duration + beta * distance;
}

export function routeCost(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number {
  let cost = 0;
  for (let i = 0; i < route.length - 1; i++) {
    cost += weightedCost(
      matrix.durations[route[i]][route[i + 1]],
      matrix.distances[route[i]][route[i + 1]],
      alpha,
      beta
    );
  }
  return cost;
}

/**
 * Costo circular: igual que routeCost pero suma además la arista de retorno
 * desde el último nodo hasta el índice 0 (startPoint).
 *
 * Esto es lo que diferencia al modo circular del lineal:
 * el algoritmo elige el orden que minimiza (ruta + regreso al inicio).
 */
export function routeCostCircular(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number {
  if (route.length === 0) return 0;
  const baseCost = routeCost(route, matrix, alpha, beta);
  const last = route[route.length - 1];
  const returnCost = weightedCost(
    matrix.durations[last][0],
    matrix.distances[last][0],
    alpha,
    beta
  );
  return baseCost + returnCost;
}

function routeCostFromDurations(route: number[], durations: number[][]): number {
  let cost = 0;
  for (let i = 0; i < route.length - 1; i++) cost += durations[route[i]][route[i + 1]];
  return cost;
}

/**
 * Costo lineal desde duraciones — sin arista de retorno.
 */
function routeCostLinearFromDurations(route: number[], durations: number[][]): number {
  return routeCostFromDurations(route, durations);
}

/**
 * Costo circular desde duraciones — suma arista de retorno al índice 0.
 */
function routeCostCircularFromDurations(route: number[], durations: number[][]): number {
  if (route.length === 0) return 0;
  const base = routeCostFromDurations(route, durations);
  const last = route[route.length - 1];
  return base + durations[last][0];
}

export function calculateETAs(route: number[], matrix: Matrix): number[] {
  const etas: number[] = [0];
  for (let i = 1; i < route.length; i++) {
    etas.push(etas[i - 1] + matrix.durations[route[i - 1]][route[i]] / 60);
  }
  return etas;
}

export function calculateRouteStats(
  route: number[],
  matrix: Matrix
): { totalDuration: number; totalDistance: number } {
  let totalDuration = 0;
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDuration += matrix.durations[route[i]][route[i + 1]];
    totalDistance += matrix.distances[route[i]][route[i + 1]];
  }
  return { totalDuration: totalDuration / 60, totalDistance };
}

// ─── Smart start selection ────────────────────────────────────────────────────

function selectDispersedStarts(
  durations: number[][],
  k: number,
  startRange: number,
  endRange: number
): number[] {
  const n = endRange - startRange;
  if (k >= n) return Array.from({ length: n }, (_, i) => startRange + i);

  const candidates = Array.from({ length: n }, (_, i) => startRange + i);

  let seedIdx = candidates[0];
  let minAvg = Infinity;
  for (const c of candidates) {
    let avg = 0;
    for (const d of candidates) avg += durations[c][d];
    avg /= candidates.length;
    if (avg < minAvg) { minAvg = avg; seedIdx = c; }
  }

  const selected = [seedIdx];
  const minDistToSelected = new Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    minDistToSelected[i] = durations[candidates[i]][seedIdx];
  }

  while (selected.length < k) {
    let farthest = -1;
    let maxDist = -1;
    for (let i = 0; i < n; i++) {
      if (selected.includes(candidates[i])) continue;
      if (minDistToSelected[i] > maxDist) { maxDist = minDistToSelected[i]; farthest = i; }
    }
    if (farthest === -1) break;
    selected.push(candidates[farthest]);
    for (let i = 0; i < n; i++) {
      const d = durations[candidates[i]][candidates[farthest]];
      if (d < minDistToSelected[i]) minDistToSelected[i] = d;
    }
  }

  return selected;
}

// ─── Nearest Neighbor ─────────────────────────────────────────────────────────

function nearestNeighborBase(
  n: number,
  startIndex: number,
  durations: number[][],
  excluded: Set<number> = new Set()
): number[] {
  const visited = new Set<number>([startIndex, ...excluded]);
  const route = [startIndex];

  while (route.length + excluded.size < n) {
    const current = route[route.length - 1];
    let best = -1;
    let bestTime = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (durations[current][j] < bestTime) { bestTime = durations[current][j]; best = j; }
    }
    if (best === -1) break;
    route.push(best);
    visited.add(best);
  }

  return route;
}

export function nearestNeighborLinear(n: number, durations: number[][]): number[] {
  return nearestNeighborBase(n, 0, durations);
}

export function nearestNeighbor(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number[] {
  const n = points.length;
  const visited = new Set<number>([startIndex]);
  const route = [startIndex];

  while (route.length < n) {
    const current = route[route.length - 1];
    let minCost = Infinity;
    let nextIdx = -1;
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const cost = weightedCost(matrix.durations[current][i], matrix.distances[current][i], alpha, beta);
      if (cost < minCost) { minCost = cost; nextIdx = i; }
    }
    if (nextIdx === -1) break;
    route.push(nextIdx);
    visited.add(nextIdx);
  }

  return route;
}

// ─── 2-opt con delta incremental ─────────────────────────────────────────────

export function twoOptLinear(
  route: number[],
  durations: number[][],
  maxIterations = 500
): number[] {
  let best = [...route];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const a = best[i], b = best[i + 1];
        const c = best[j], d = j + 1 < best.length ? best[j + 1] : -1;

        const before = durations[a][b] + (d !== -1 ? durations[c][d] : 0);
        const after  = durations[a][c] + (d !== -1 ? durations[b][d] : 0);

        if (after < before - 0.001) {
          let lo = i + 1, hi = j;
          while (lo < hi) { [best[lo], best[hi]] = [best[hi], best[lo]]; lo++; hi--; }
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * 2-opt CIRCULAR — evalúa la arista de retorno al nodo 0 en cada swap.
 * Cuando j es el último índice de la ruta, la "arista siguiente" es el
 * retorno al inicio (durations[last][0]), no -1.
 */
export function twoOptCircular(
  route: number[],
  durations: number[][],
  maxIterations = 500
): number[] {
  let best = [...route];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const a = best[i], b = best[i + 1];
        const c = best[j];
        // En circular: si j es el último, la arista siguiente cierra el loop
        const d = j + 1 < best.length ? best[j + 1] : best[0];

        const before = durations[a][b] + durations[c][d];
        const after  = durations[a][c] + durations[b][d];

        if (after < before - 0.001) {
          let lo = i + 1, hi = j;
          while (lo < hi) { [best[lo], best[hi]] = [best[hi], best[lo]]; lo++; hi--; }
          improved = true;
        }
      }
    }
  }

  return best;
}

export function twoOpt(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
  maxIterations = 500
): number[] {
  let best = [...route];
  let improved = true;
  let iterations = 0;

  const ec = (f: number, t: number) =>
    weightedCost(matrix.durations[f][t], matrix.distances[f][t], alpha, beta);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < best.length - 2; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const a = best[i], b = best[i + 1];
        const c = best[j], d = j + 1 < best.length ? best[j + 1] : -1;

        const before = ec(a, b) + (d !== -1 ? ec(c, d) : 0);
        const after  = ec(a, c) + (d !== -1 ? ec(b, d) : 0);

        if (after < before - 0.001) {
          let lo = i + 1, hi = j;
          while (lo < hi) { [best[lo], best[hi]] = [best[hi], best[lo]]; lo++; hi--; }
          improved = true;
        }
      }
    }
  }

  return best;
}

// ─── Or-opt ───────────────────────────────────────────────────────────────────

export function orOptLinear(
  route: number[],
  durations: number[][],
  maxIterations = 300
): number[] {
  let best = [...route];
  let globalImproved = true;
  let iterations = 0;

  while (globalImproved && iterations < maxIterations) {
    globalImproved = false;
    iterations++;

    for (const segSize of [1, 2, 3]) {
      let improved = true;

      while (improved) {
        improved = false;
        const n = best.length;

        for (let i = 1; i <= n - segSize; i++) {
          const prev = best[i - 1];
          const segStart = best[i];
          const segEnd = best[i + segSize - 1];
          const next = i + segSize < n ? best[i + segSize] : -1;

          const removeCost =
            durations[prev][segStart] +
            (next !== -1 ? durations[segEnd][next] : 0) -
            (next !== -1 ? durations[prev][next] : 0);

          for (let j = 0; j < n - 1; j++) {
            if (j >= i - 1 && j < i + segSize) continue;

            const insertCost =
              durations[best[j]][segStart] +
              durations[segEnd][best[j + 1]] -
              durations[best[j]][best[j + 1]];

            if (insertCost - removeCost < -0.001) {
              const seg = best.splice(i, segSize);
              const insertIdx = j < i ? j + 1 : j + 1 - segSize;
              best.splice(insertIdx, 0, ...seg);
              improved = true;
              globalImproved = true;
              break;
            }
          }

          if (improved) break;
        }
      }
    }
  }

  return best;
}

export function orOpt(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
  maxIterations = 300
): number[] {
  let best = [...route];
  let globalImproved = true;
  let iterations = 0;

  const ec = (f: number, t: number) =>
    weightedCost(matrix.durations[f][t], matrix.distances[f][t], alpha, beta);

  while (globalImproved && iterations < maxIterations) {
    globalImproved = false;
    iterations++;

    for (const segSize of [1, 2, 3]) {
      let improved = true;

      while (improved) {
        improved = false;
        const n = best.length;

        for (let i = 0; i <= n - segSize; i++) {
          const prev = i > 0 ? best[i - 1] : -1;
          const segStart = best[i];
          const segEnd = best[i + segSize - 1];
          const next = i + segSize < n ? best[i + segSize] : -1;

          const removeCost =
            (prev !== -1 ? ec(prev, segStart) : 0) +
            (next !== -1 ? ec(segEnd, next) : 0) -
            (prev !== -1 && next !== -1 ? ec(prev, next) : 0);

          for (let j = 0; j < n - 1; j++) {
            if (j >= i - 1 && j < i + segSize) continue;

            const insertCost =
              ec(best[j], segStart) +
              ec(segEnd, best[j + 1]) -
              ec(best[j], best[j + 1]);

            if (insertCost - removeCost < -0.001) {
              const seg = best.splice(i, segSize);
              const insertIdx = j < i ? j + 1 : j + 1 - segSize;
              best.splice(insertIdx, 0, ...seg);
              improved = true;
              globalImproved = true;
              break;
            }
          }

          if (improved) break;
        }
      }
    }
  }

  return best;
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export function optimizeLinearPipeline(
  route: number[],
  durations: number[][],
  maxPasses?: number
): number[] {
  const n = route.length;
  const passes = maxPasses ?? (n <= 15 ? 5 : n <= 25 ? 4 : 3);
  let current = [...route];

  for (let pass = 0; pass < passes; pass++) {
    const after2opt  = twoOptLinear(current, durations);
    const afterOrOpt = orOptLinear(after2opt, durations);
    const costBefore = routeCostLinearFromDurations(current, durations);
    const costAfter  = routeCostLinearFromDurations(afterOrOpt, durations);
    current = afterOrOpt;
    if (costAfter >= costBefore - 0.001) break;
  }

  return current;
}

/**
 * Pipeline CIRCULAR — usa twoOptCircular y evalúa el costo incluyendo retorno.
 * La diferencia clave con el lineal: cada iteración considera la arista final→inicio.
 */
export function optimizeCircularPipeline(
  route: number[],
  durations: number[][],
  maxPasses?: number
): number[] {
  const n = route.length;
  const passes = maxPasses ?? (n <= 15 ? 5 : n <= 25 ? 4 : 3);
  let current = [...route];

  for (let pass = 0; pass < passes; pass++) {
    // 2-opt circular incluye la arista de retorno en cada evaluación
    const after2opt  = twoOptCircular(current, durations);
    const afterOrOpt = orOptLinear(after2opt, durations); // Or-opt aplica igualmente
    const costBefore = routeCostCircularFromDurations(current, durations);
    const costAfter  = routeCostCircularFromDurations(afterOrOpt, durations);
    current = afterOrOpt;
    if (costAfter >= costBefore - 0.001) break;
  }

  return current;
}

// ─── Optimización principal (usada por fallback local y modo circular) ────────

export function optimizeRoute(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number[] {
  const n = points.length;
  const startsToTry = n <= 25
    ? points.map((_, i) => i)
    : selectDispersedStarts(matrix.durations, Math.ceil(Math.sqrt(n)), 0, n);

  let bestRoute: number[] | null = null;
  let bestCost = Infinity;

  for (const sp of startsToTry) {
    const nn = nearestNeighbor(points, sp, matrix, alpha, beta);
    const optimized = twoOpt(nn, matrix, alpha, beta);
    const optimizedOrOpt = orOpt(optimized, matrix, alpha, beta);
    const cost = routeCost(optimizedOrOpt, matrix, alpha, beta);
    if (cost < bestCost) { bestCost = cost; bestRoute = optimizedOrOpt; }
  }

  return bestRoute!;
}

export function optimizeAndCalculate(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): RouteResult {
  const route = optimizeRoute(points, startIndex, matrix, alpha, beta);
  const stats = calculateRouteStats(route, matrix);
  const etas = calculateETAs(route, matrix);
  return { route, totalDuration: stats.totalDuration, totalDistance: stats.totalDistance, etas };
}

// ─── Linear y Circular con Google Distance Matrix ─────────────────────────────

/**
 * Optimiza con Distance Matrix real.
 * `circular`: si true, penaliza rutas que terminan lejos del inicio (índice 0).
 */
export async function optimizeRouteWithMatrix(
  points: Point[],
  startPoint: { lat: number; lng: number },
  circular = false
): Promise<RouteResult & { orderedPoints: Point[]; durations: number[][] }> {
  if (points.length === 0) {
    return { route: [], totalDuration: 0, totalDistance: 0, etas: [], orderedPoints: [], durations: [] };
  }

  const { getDurationMatrix } = await import('./google-maps');

  // Índice 0 = startPoint, índices 1..N = delivery points
  const coordinates: [number, number][] = [
    [startPoint.lat, startPoint.lng],
    ...points.map(p => [p.lat, p.lng] as [number, number]),
  ];

  const durations = await getDurationMatrix(coordinates);
  const n = coordinates.length;
  const deliveryCount = n - 1;

  const deliveryStarts = deliveryCount <= 25
    ? Array.from({ length: deliveryCount }, (_, i) => i + 1)
    : selectDispersedStarts(durations, Math.ceil(Math.sqrt(deliveryCount)), 1, n);

  const costFn = circular
    ? (r: number[]) => routeCostCircularFromDurations(r, durations)
    : (r: number[]) => routeCostLinearFromDurations(r, durations);

  const pipelineFn = circular
    ? (r: number[]) => optimizeCircularPipeline(r, durations)
    : (r: number[]) => optimizeLinearPipeline(r, durations);

  let bestRoute: number[] | null = null;
  let bestCost = Infinity;

  // Opción A: desde el depósito
  const nnFromDepot = nearestNeighborLinear(n, durations);
  const optimizedFromDepot = pipelineFn(nnFromDepot);
  const costFromDepot = costFn(optimizedFromDepot);
  bestRoute = optimizedFromDepot;
  bestCost = costFromDepot;

  // Opción B: desde cada start de delivery seleccionado
  for (const startIdx of deliveryStarts) {
    const nnFromHere = nearestNeighborBase(n, startIdx, durations, new Set([0]));
    const fullRoute = [0, ...nnFromHere];
    const optimized = pipelineFn(fullRoute);
    const cost = costFn(optimized);
    if (cost < bestCost) { bestCost = cost; bestRoute = optimized; }
  }

  const optimized = bestRoute!;

  let totalDuration = 0;
  const etas: number[] = [0];
  for (let i = 0; i < optimized.length - 1; i++) {
    const seg = durations[optimized[i]][optimized[i + 1]] / 60;
    totalDuration += seg;
    etas.push(etas[etas.length - 1] + seg);
  }

  const orderedPoints = optimized
    .filter(idx => idx !== 0)
    .map(idx => points[idx - 1]);

  const totalDistance = (totalDuration / 60) * 40;

  return { route: optimized, totalDuration, totalDistance, etas, orderedPoints, durations };
}

// Alias para compatibilidad con imports existentes
export async function optimizeRouteLinearWithMatrix(
  points: Point[],
  startPoint: { lat: number; lng: number }
) {
  return optimizeRouteWithMatrix(points, startPoint, false);
}

// ─── Fallbacks locales (Haversine) ────────────────────────────────────────────

export function buildLocalMatrix(
  points: Point[],
  startPoint?: { lat: number; lng: number }
): Matrix {
  const all = startPoint
    ? [{ id: 'start', lat: startPoint.lat, lng: startPoint.lng }, ...points]
    : points;

  const n = all.length;
  const distances = Array.from({ length: n }, () => new Array(n).fill(0));
  const durations = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dist = calculateDistance(all[i].lat, all[i].lng, all[j].lat, all[j].lng);
      distances[i][j] = dist;
      durations[i][j] = estimateDuration(dist);
    }
  }

  return { distances, durations };
}

export function optimizeRouteLocal(
  points: Point[],
  startPoint: { lat: number; lng: number }
): RouteResult {
  if (points.length === 0) return { route: [], totalDuration: 0, totalDistance: 0, etas: [] };
  const matrix = buildLocalMatrix(points, startPoint);
  const route = optimizeRoute(points, 1, matrix);
  const stats = calculateRouteStats(route, matrix);
  const etas = calculateETAs(route, matrix);
  return { route, totalDuration: stats.totalDuration, totalDistance: stats.totalDistance, etas };
}

export function optimizeRouteLinear(
  points: Point[],
  startPoint: { lat: number; lng: number }
): RouteResult {
  if (points.length === 0) return { route: [], totalDuration: 0, totalDistance: 0, etas: [] };
  const matrix = buildLocalMatrix(points, startPoint);
  const n = matrix.durations.length;
  const nnRoute  = nearestNeighborLinear(n, matrix.durations);
  const optimized = optimizeLinearPipeline(nnRoute, matrix.durations);
  const stats = calculateRouteStats(optimized, matrix);
  const etas  = calculateETAs(optimized, matrix);
  return { route: optimized, totalDuration: stats.totalDuration, totalDistance: stats.totalDistance, etas };
}

export function optimizeRouteCircular(
  points: Point[],
  startPoint: { lat: number; lng: number }
): RouteResult {
  if (points.length === 0) return { route: [], totalDuration: 0, totalDistance: 0, etas: [] };
  const matrix = buildLocalMatrix(points, startPoint);
  const n = matrix.durations.length;
  const nnRoute  = nearestNeighborLinear(n, matrix.durations);
  const optimized = optimizeCircularPipeline(nnRoute, matrix.durations);
  const stats = calculateRouteStats(optimized, matrix);
  const etas  = calculateETAs(optimized, matrix);
  return { route: optimized, totalDuration: stats.totalDuration, totalDistance: stats.totalDistance, etas };
}
