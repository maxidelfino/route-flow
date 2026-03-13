import { NextRequest, NextResponse } from 'next/server';
import { getMatrix, isApiKeyConfigured } from '@/lib/ors';
import { buildLocalMatrix } from '@/lib/routing/local';

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

    // Check if ORS API key is available
    if (!isApiKeyConfigured()) {
      // Use local fallback with Haversine
      console.log('ORS API key not configured - using local fallback (Haversine)');
      const matrix = buildLocalMatrix(coordinates);
      return NextResponse.json({
        ...matrix,
        _fallback: {
          used: true,
          method: 'haversine',
          message: 'ORS API Key no configurada - usando fallback local con Haversine',
        },
      });
    }

    try {
      const matrix = await getMatrix(coordinates);
      return NextResponse.json(matrix);
    } catch (orsError) {
      console.warn('ORS API failed, falling back to local calculation:', orsError);
      // Fallback when ORS API fails
      const matrix = buildLocalMatrix(coordinates);
      return NextResponse.json({
        ...matrix,
        _fallback: {
          used: true,
          method: 'haversine',
          message: 'ORS API error - usando fallback local con Haversine',
        },
      });
    }
  } catch (error) {
    console.error('Matrix API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
