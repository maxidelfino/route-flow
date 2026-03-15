import { NextRequest, NextResponse } from 'next/server';
import { getDistanceMatrix, isGoogleMapsConfigured } from '@/lib/google-maps';
import { buildLocalMatrix } from '@/lib/routing/local';

/**
 * Google Distance Matrix API has limits:
 * - Max 25 origins x 25 destinations = 625 elements per request
 * This function batches requests for larger matrices
 */
async function getMatrixBatched(
  coordinates: number[][],
  apiKey: string
): Promise<{ durations: number[][]; distances: number[][] }> {
  const n = coordinates.length;
  const maxPerRequest = 25;
  
  // For small matrices, no batching needed
  if (n <= maxPerRequest) {
    const origins = coordinates.map(c => [c[1], c[0]] as [number, number]); // [lat, lng]
    const destinations = coordinates.map(c => [c[1], c[0]] as [number, number]);
    
    const result = await getDistanceMatrix(origins, destinations);
    
    // Extract durations and distances from response
    const durations: number[][] = [];
    const distances: number[][] = [];
    
    for (let i = 0; i < result.rows.length; i++) {
      const rowDurations: number[] = [];
      const rowDistances: number[] = [];
      
      for (let j = 0; j < result.rows[i].elements.length; j++) {
        const element = result.rows[i].elements[j];
        
        if (element.status !== 'OK') {
          rowDurations.push(Infinity);
          rowDistances.push(Infinity);
        } else {
          rowDurations.push(element.duration?.value ?? Infinity);
          rowDistances.push(element.distance?.value ?? Infinity);
        }
      }
      
      durations.push(rowDurations);
      distances.push(rowDistances);
    }
    
    return { durations, distances };
  }
  
  // For larger matrices, use batching
  console.log(`[Matrix API] Batching ${n}x${n} matrix (${n * n} elements)`);
  
  // Initialize result matrices
  const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  const distances: number[][] = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  
  // Process in batches
  for (let i = 0; i < n; i += maxPerRequest) {
    const iEnd = Math.min(i + maxPerRequest, n);
    const originBatch = coordinates.slice(i, iEnd).map(c => [c[1], c[0]] as [number, number]);
    
    for (let j = 0; j < n; j += maxPerRequest) {
      const jEnd = Math.min(j + maxPerRequest, n);
      const destBatch = coordinates.slice(j, jEnd).map(c => [c[1], c[0]] as [number, number]);
      
      try {
        const result = await getDistanceMatrix(originBatch, destBatch);
        
        // Fill in the results
        for (let ii = 0; ii < result.rows.length; ii++) {
          for (let jj = 0; jj < result.rows[ii].elements.length; jj++) {
            const element = result.rows[ii].elements[jj];
            const globalI = i + ii;
            const globalJ = j + jj;
            
            if (element.status === 'OK') {
              durations[globalI][globalJ] = element.duration?.value ?? Infinity;
              distances[globalI][globalJ] = element.distance?.value ?? Infinity;
            }
          }
        }
      } catch (batchError) {
        console.error(`[Matrix API] Batch error at origins ${i}-${iEnd}, destinations ${j}-${jEnd}:`, batchError);
        // Leave as Infinity (unreachable)
      }
    }
  }
  
  return { durations, distances };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coordinates } = body;

    if (!coordinates || !Array.isArray(coordinates)) {
      return NextResponse.json(
        { error: 'Invalid request: coordinates array required' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse and respect API limits
    if (coordinates.length > 50) {
      return NextResponse.json(
        { error: 'Too many coordinates. Maximum 50 for matrix calculation.' },
        { status: 400 }
      );
    }

    // Try Google Distance Matrix API first (preferred)
    if (isGoogleMapsConfigured()) {
      try {
        const matrix = await getMatrixBatched(coordinates, process.env.GOOGLE_MAPS_API_KEY!);
        
        // Check for any Infinity values (unreachable)
        const hasUnreachable = matrix.durations.some(row => row.some(v => v === Infinity));
        if (hasUnreachable) {
          console.warn('[Matrix API] Some routes are unreachable');
        }
        
        return NextResponse.json({
          ...matrix,
          _provider: 'google',
        });
      } catch (googleError) {
        console.warn('Google Distance Matrix API failed, falling back to local:', googleError);
        // Fall through to local fallback
      }
    }

    // Final fallback: local Haversine calculation
    const matrix = buildLocalMatrix(coordinates);
    return NextResponse.json({
      ...matrix,
      _fallback: {
        used: true,
        method: 'haversine',
        message: 'No routing service available - using local Haversine calculation',
      },
      _provider: 'local',
    });
  } catch (error) {
    console.error('Matrix API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
