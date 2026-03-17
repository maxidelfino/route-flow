import { NextRequest, NextResponse } from 'next/server';
import { getDirections, decodePolyline, isGoogleMapsConfigured } from '@/lib/google-maps';
import { optimizeAndCalculate, optimizeRouteLocal, optimizeRouteLinear, Point } from '@/lib/tsp';
import { createStraightLinePolyline } from '@/lib/routing/local';

export type OptimizeMode = 'linear' | 'circular';

export interface OptimizeRequest {
  start: [number, number]; // [lng, lat]
  points: Array<{ id: string; lat: number; lng: number }>;
  alpha?: number;
  beta?: number;
  mode?: OptimizeMode; // 'linear' = open path (no return to start), 'circular' = closed loop
}

export interface OptimizeResponse {
  route: string[]; // ordered point IDs
  polyline?: number[][];
  totalDuration: number; // minutes
  totalDistance: number; // km
  etas: number[]; // minutes to each point
  mode: OptimizeMode; // 'linear' or 'circular'
  steps?: Array<{
    instruction: string;
    duration: number;
    distance: number;
  }>;
  _fallback?: {
    used: boolean;
    method?: string;
    message?: string;
  };
  _googleMaps?: {
    used: boolean;
    optimized: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json();
    const { start, points, alpha = 0.7, beta = 0.3, mode = 'circular' } = body;

    if (!start || !points || points.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: start and points required' },
        { status: 400 }
      );
    }

    // Validate mode
    if (mode !== 'linear' && mode !== 'circular') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "linear" or "circular"' },
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
    let isFallback = false;
    let googleMapsUsed = false;
    let googleOptimized = false;

    // Check if Google Maps API key is available
    // Note: Google Directions always returns a circular route (returns to start)
    // For linear mode, we use local optimization instead
    if (isGoogleMapsConfigured() && mode === 'circular') {
      try {
        // Build waypoints from ALL delivery points
        // For proper TSP optimization with round-trip, we use the START point as both
        // origin AND destination (round trip), and pass all delivery points as waypoints
        const waypoints = points.map(p => ({
          location: [p.lat, p.lng] as [number, number], // [lat, lng] for Google
          stopover: true,
        }));

        // Use Google Directions API with optimizeWaypoints for TSP
        // IMPORTANT: Use start point as BOTH origin and destination for round-trip optimization
        // This ensures Google optimizes ALL waypoints in the optimal order
        const directionsResponse = await getDirections(
          [start[1], start[0]] as [number, number], // [lat, lng] for Google (start is [lng, lat])
          [start[1], start[0]] as [number, number], // Same as origin for round trip
          waypoints,
          { optimize: true }
        );

        const route = directionsResponse.routes[0];
        googleMapsUsed = true;
        googleOptimized = true;

        // Get optimized waypoint order from Google
        const optimizedOrder = route.waypoint_order;
        
        // Map route indices back to point IDs using Google's order
        const orderedIds: string[] = ['start'];
        for (const idx of optimizedOrder) {
          orderedIds.push(points[idx].id);
        }

        // Decode polyline from Google's encoded polyline
        polyline = decodePolyline(route.overview_polyline.points);

        // Calculate totals from legs
        let totalDuration = 0;
        let totalDistance = 0;
        const etas: number[] = [];

        for (const leg of route.legs) {
          totalDuration += Math.round(leg.duration.value / 60); // seconds to minutes
          totalDistance += leg.distance.value / 1000; // meters to km
          etas.push(Math.round(leg.duration.value / 60));
        }

        // Parse steps for navigation instructions
        steps = route.legs.flatMap((leg: { steps: Array<{ html_instructions: string; duration: { value: number }; distance: { value: number } }> }) => 
          leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
            duration: Math.round(step.duration.value / 60),
            distance: step.distance.value / 1000,
          }))
        );

        // Create result in the format expected by the frontend
        result = {
          route: [0, ...optimizedOrder.map(i => i + 1)],
          totalDuration,
          totalDistance,
          etas,
        };

        const response: OptimizeResponse = {
          route: orderedIds,
          polyline,
          totalDuration: result.totalDuration,
          totalDistance: result.totalDistance,
          etas: result.etas,
          mode: 'circular', // Google Maps always returns circular
          steps,
          _googleMaps: {
            used: true,
            optimized: googleOptimized,
          },
        };

        return NextResponse.json(response);
      } catch (googleError) {
        console.warn('Google Maps API failed, falling back to local:', googleError);
        // Fall through to local fallback
      }
    }

    // Fallback to local optimization with Haversine distances
    isFallback = true;
    
    // Use linear or circular based on mode
    if (mode === 'linear') {
      result = optimizeRouteLinear(tspPoints, { lat: start[1], lng: start[0] });
    } else {
      result = optimizeRouteLocal(tspPoints, { lat: start[1], lng: start[0] });
    }
    
    const lineResult = createStraightLinePolyline(coordinates);
    polyline = lineResult.coordinates;

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
      mode,
      steps,
      _fallback: isFallback ? {
        used: true,
        method: 'haversine',
        message: 'No routing service available - using fallback local with Haversine',
      } : undefined,
      _googleMaps: {
        used: false,
        optimized: false,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Route optimization error:', error);
    
    if (error instanceof Error && error.message.includes('API key not configured')) {
      return NextResponse.json(
        { error: 'No routing API key configured. Please set GOOGLE_MAPS_API_KEY in .env.local' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
