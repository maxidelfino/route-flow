import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, reverseGeocode, isGoogleMapsConfigured } from '@/lib/google-maps';
import { searchAddresses as nominatimSearch, reverseGeocode as nominatimReverse } from '@/lib/geocode';

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

    // Use Google Geocoding if available, otherwise fallback to Nominatim
    const useGoogle = isGoogleMapsConfigured();

    const results: GeocodeResponse['results'] = await Promise.all(
      limitedAddresses.map(async (address) => {
        try {
          if (useGoogle) {
            const geocoded = await geocodeAddress(address);
            return {
              input: address,
              lat: geocoded.lat,
              lng: geocoded.lng,
              displayName: geocoded.formattedAddress,
              success: true,
            };
          } else {
            // Fallback to Nominatim
            const { geocodeAddress: nomGeocode } = await import('@/lib/geocode');
            const geocoded = await nomGeocode(address);
            return {
              input: address,
              lat: geocoded.lat,
              lng: geocoded.lng,
              displayName: geocoded.displayName,
              success: true,
            };
          }
        } catch (error) {
          return {
            input: address,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({ results, _provider: useGoogle ? 'google' : 'nominatim' });
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
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // Handle reverse geocoding
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    try {
      const useGoogle = isGoogleMapsConfigured();
      
      if (useGoogle) {
        const result = await reverseGeocode(latNum, lngNum);
        return NextResponse.json({ 
          results: [{
            address: result.address,
            lat: latNum,
            lng: lngNum,
            placeId: result.placeId,
          }],
          _provider: 'google'
        });
      } else {
        // Fallback to Nominatim
        const address = await nominatimReverse(latNum, lngNum);
        return NextResponse.json({ 
          results: [{
            address,
            lat: latNum,
            lng: lngNum,
          }],
          _provider: 'nominatim'
        });
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return NextResponse.json(
        { error: 'Reverse geocoding failed' },
        { status: 500 }
      );
    }
  }

  // Handle search/autocomplete
  if (!query || query.length < 3) {
    return NextResponse.json(
      { results: [] }
    );
  }

  try {
    // Use Nominatim for search - it's reliable and free
    // Google Places API would give better results but requires additional setup
    const results = await nominatimSearch(query);
    return NextResponse.json({ results, _provider: 'nominatim' });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
