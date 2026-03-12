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

// Default weights: prioritize time over distance
const DEFAULT_ALPHA = 0.7; // time weight
const DEFAULT_BETA = 0.3;  // distance weight

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
 */
export function twoOpt(
  route: number[],
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
  maxIterations = 100
): number[] {
  let improved = true;
  let bestRoute = [...route];
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let j = i + 1; j < bestRoute.length; j++) {
        // Create new route by reversing segment between i and j
        const newRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, j + 1).reverse(),
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
 */
export function optimizeRoute(
  points: Point[],
  startIndex: number,
  matrix: Matrix,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA
): number[] {
  // Phase 1: Get initial route with Nearest Neighbor
  const nnRoute = nearestNeighbor(points, startIndex, matrix, alpha, beta);

  // Phase 2: Improve with 2-opt
  const optimizedRoute = twoOpt(nnRoute, matrix, alpha, beta);

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
