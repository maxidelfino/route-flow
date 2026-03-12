import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, searchAddresses, GeocodeResult } from '@/lib/geocode';

export interface GeocodeRequest {
  addresses: string[];
}

export interface GeocodeResponse {
  results: Array<{
    input: string;
    lat?: number;
    lng?: number;
    displayName?: string;
    success: boolean;
    error?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GeocodeRequest = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Invalid request: addresses array required' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    const limitedAddresses = addresses.slice(0, 100);

    const results: GeocodeResponse['results'] = await Promise.all(
      limitedAddresses.map(async (address) => {
        try {
          const geocoded: GeocodeResult = await geocodeAddress(address);
          return {
            input: address,
            lat: geocoded.lat,
            lng: geocoded.lng,
            displayName: geocoded.displayName,
            success: true,
          };
        } catch (error) {
          return {
            input: address,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json(
      { results: [] }
    );
  }

  try {
    const results = await searchAddresses(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
