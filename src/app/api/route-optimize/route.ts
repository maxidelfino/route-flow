import { NextRequest, NextResponse } from 'next/server';
import { getMatrix, getRoute, isApiKeyConfigured } from '@/lib/ors';
import { optimizeAndCalculate, optimizeRouteLocal, Point, Matrix } from '@/lib/tsp';

export interface OptimizeRequest {
  start: [number, number]; // [lng, lat]
  points: Array<{ id: string; lat: number; lng: number }>;
  alpha?: number;
  beta?: number;
}

export interface OptimizeResponse {
  route: string[]; // ordered point IDs
  polyline?: number[][];
  totalDuration: number; // minutes
  totalDistance: number; // km
  etas: number[]; // minutes to each point
  steps?: Array<{
    instruction: string;
    duration: number;
    distance: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json();
    const { start, points, alpha = 0.7, beta = 0.3 } = body;

    if (!start || !points || points.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: start and points required' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (points.length > 50) {
      return NextResponse.json(
        { error: 'Too many points. Maximum 50 for optimization.' },
        { status: 400 }
      );
    }

    // Build coordinates array: start point + all delivery points
    const coordinates: number[][] = [
      start,
      ...points.map(p => [p.lng, p.lat] as [number, number])
    ];

    // Convert to TSP format
    const tspPoints: Point[] = points.map((p, i) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
    }));

    let result: ReturnType<typeof optimizeAndCalculate>;
    let polyline: number[][] | undefined;
    let steps: OptimizeResponse['steps'] | undefined;

    // Check if ORS API key is available
    if (isApiKeyConfigured()) {
      try {
        // Use ORS for optimized routing
        const matrix = await getMatrix(coordinates);
        result = optimizeAndCalculate(tspPoints, 0, matrix, alpha, beta);

        // Get detailed route for polyline
        try {
          const routeCoords = result.route.map(i => coordinates[i]);
          const routeResult = await getRoute(routeCoords);
          polyline = routeResult.geometry.coordinates;
          steps = routeResult.legs.flatMap(leg => leg.steps);
        } catch (routeError) {
          console.warn('Could not get route details:', routeError);
        }
      } catch (orsError) {
        console.warn('ORS API failed, falling back to local optimization:', orsError);
        // Fall through to local optimization
        result = optimizeRouteLocal(tspPoints, { lat: start[1], lng: start[0] });
      }
    } else {
      // Use local optimization with Haversine distances
      console.log('Using local route optimization (no ORS API key)');
      result = optimizeRouteLocal(tspPoints, { lat: start[1], lng: start[0] });
    }

    // Map route indices back to point IDs
    const orderedIds = result.route.map(i => {
      if (i === 0) return 'start';
      return points[i - 1].id;
    });

    const response: OptimizeResponse = {
      route: orderedIds,
      polyline,
      totalDuration: result.totalDuration,
      totalDistance: result.totalDistance,
      etas: result.etas,
      steps,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Route optimization error:', error);
    
    if (error instanceof Error && error.message.includes('API key not configured')) {
      return NextResponse.json(
        { error: 'ORS API key not configured. Please set NEXT_PUBLIC_ORS_API_KEY in .env.local' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
