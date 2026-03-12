import { NextRequest, NextResponse } from 'next/server';
import { getMatrix } from '@/lib/ors';

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

    const matrix = await getMatrix(coordinates);

    return NextResponse.json(matrix);
  } catch (error) {
    console.error('Matrix API error:', error);
    
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
