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

/**
 * Calculate weighted cost from duration and distance
 */
export function weightedCost(
  duration: number,
  distance: number,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number {
  return alpha * duration + beta * distance;
}

/**
 * Calculate total cost of a route
 */
export function routeCost(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number {
  let cost = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    cost += weightedCost(
      matrix.durations[from][to],
      matrix.distances[from][to],
      alpha,
      beta
    );
  }
  return cost;
}

/**
 * Nearest Neighbor heuristic for TSP
 * Starts from startIndex and always goes to the nearest unvisited point
 */
export function nearestNeighbor(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number[] {
  const n = points.length;
  const visited = new Set<number>();
  const route = [startIndex];
  visited.add(startIndex);

  while (route.length < n) {
    const current = route[route.length - 1];
    let minCost = Infinity;
    let nextIdx = -1;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;

      const cost = weightedCost(
        matrix.durations[current][i],
        matrix.distances[current][i],
        alpha,
        beta
      );

      if (cost < minCost) {
        minCost = cost;
        nextIdx = i;
      }
    }

    if (nextIdx !== -1) {
      route.push(nextIdx);
      visited.add(nextIdx);
    } else {
      break; // Should not happen if matrix is complete
    }
  }

  return route;
}

/**
 * 2-opt local search improvement
 * Swaps pairs of edges to reduce total cost
 * Fixed: includes segment from start (i=0)
 */
export function twoOpt(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
  maxIterations = 500
): number[] {
  let improved = true;
  let bestRoute = [...route];
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let j = i + 2; j < bestRoute.length; j++) {
        // Create new route by reversing segment between i and j
        const newRoute = [
          ...bestRoute.slice(0, i + 1),
          ...bestRoute.slice(i + 1, j + 1).reverse(),
          ...bestRoute.slice(j + 1),
        ];

        if (routeCost(newRoute, matrix, alpha, beta) < routeCost(bestRoute, matrix, alpha, beta)) {
          bestRoute = newRoute;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Main optimization function: Nearest Neighbor + 2-opt
 * Tests multiple starting points for better results
 */
export function optimizeRoute(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number[] {
  // Phase 1: Try Nearest Neighbor from multiple starting points
  // This helps escape local minima that depend on initial selection
  let bestRoute: number[] | null = null;
  let bestCost = Infinity;

  const startPointsToTry = points.length <= 10 
    ? points.map((_, i) => i)  // Try all points as start if small
    : [startIndex, ...Array.from({ length: Math.min(3, points.length) }, () => Math.floor(Math.random() * points.length))];

  for (const sp of startPointsToTry) {
    const nnRoute = nearestNeighbor(points, sp, matrix, alpha, beta);
    const cost = routeCost(nnRoute, matrix, alpha, beta);
    
    if (cost < bestCost) {
      bestCost = cost;
      bestRoute = nnRoute;
    }
  }

  if (!bestRoute) {
    bestRoute = nearestNeighbor(points, startIndex, matrix, alpha, beta);
  }

  // Phase 2: Improve with 2-opt
  const optimizedRoute = twoOpt(bestRoute, matrix, alpha, beta);

  // Phase 3: Try 2-opt from other starting points to escape local optima
  // Only for small instances where it's worth the extra computation
  if (points.length <= 15) {
    const finalCost = routeCost(optimizedRoute, matrix, alpha, beta);
    
    for (let i = 0; i < points.length; i++) {
      if (i === startIndex) continue;
      
      const altRoute = nearestNeighbor(points, i, matrix, alpha, beta);
      const altOptimized = twoOpt(altRoute, matrix, alpha, beta);
      const altCost = routeCost(altOptimized, matrix, alpha, beta);
      
      if (altCost < finalCost) {
        return altOptimized;
      }
    }
  }

  return optimizedRoute;
}

/**
 * Calculate cumulative ETAs (in minutes) for each point in route
 */
export function calculateETAs(route: number[], matrix: Matrix): number[] {
  const etas: number[] = [0]; // First point is start (0 minutes)

  for (let i = 1; i < route.length; i++) {
    const previous = route[i - 1];
    const current = route[i];
    // Duration is in seconds from ORS, convert to minutes
    const segmentDuration = matrix.durations[previous][current] / 60;
    const previousETA = etas[i - 1];
    etas.push(previousETA + segmentDuration);
  }

  return etas;
}

/**
 * Calculate total duration and distance of a route
 */
export function calculateRouteStats(
  route: number[],
  matrix: Matrix
): { totalDuration: number; totalDistance: number } {
  let totalDuration = 0;
  let totalDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    totalDuration += matrix.durations[from][to];
    totalDistance += matrix.distances[from][to];
  }

  return {
    // Convert to minutes
    totalDuration: totalDuration / 60,
    // Distance is already in km from ORS
    totalDistance,
  };
}

/**
 * Full route optimization with stats
 */
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

  return {
    route,
    totalDuration: stats.totalDuration,
    totalDistance: stats.totalDistance,
    etas,
  };
}

// ============================================
// LOCAL OPTIMIZATION (without API - uses Haversine)
// ============================================

/**
 * Build a local matrix using Haversine distances
 */
function buildLocalMatrix(points: Point[], startPoint?: { lat: number; lng: number }): Matrix {
  const allPoints = startPoint
    ? [{ id: 'start', lat: startPoint.lat, lng: startPoint.lng }, ...points]
    : points;

  const n = allPoints.length;
  const distances: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));
  const durations: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        durations[i][j] = 0;
      } else {
        const dist = calculateDistance(
          allPoints[i].lat,
          allPoints[i].lng,
          allPoints[j].lat,
          allPoints[j].lng
        );
        distances[i][j] = dist;
        durations[i][j] = estimateDuration(dist);
      }
    }
  }

  return { distances, durations };
}

/**
 * Local route optimization using Haversine distances
 * (without needing ORS API)
 */
export function optimizeRouteLocal(
  points: Point[],
  startPoint: { lat: number; lng: number }
): RouteResult {
  if (points.length === 0) {
    return { route: [], totalDuration: 0, totalDistance: 0, etas: [] };
  }

  // Build local matrix with Haversine
  const matrix = buildLocalMatrix(points, startPoint);

  // Start from point 1 (which corresponds to points[0] in the matrix, since index 0 is startPoint)
  const route = optimizeRoute(points, 1, matrix);
  const stats = calculateRouteStats(route, matrix);
  const etas = calculateETAs(route, matrix);

  return {
    route,
    totalDuration: stats.totalDuration,
    totalDistance: stats.totalDistance,
    etas,
  };
}