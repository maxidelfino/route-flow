/**
 * Local Routing - Type Definitions
 */

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
  geometry: {
    coordinates: number[][];
    type: string;
  };
  duration: number;
  distance: number;
  legs: Array<{
    duration: number;
    distance: number;
    steps: Array<{
      instruction: string;
      duration: number;
      distance: number;
    }>;
  }>;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface PlannedRoute {
  coordinates: number[][];
  totalDistance: number;
  totalDuration: number;
}
