/**
 * Google Polyline Decoder
 * Decodes Google's encoded polyline format to [lat, lng] coordinate arrays
 * 
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Decode an encoded polyline string into an array of [lat, lng] coordinates
 * @param encoded - The encoded polyline string from Google Directions API
 * @returns Array of [lat, lng] coordinate pairs
 */
export function decodePolyline(encoded: string): number[][] {
  if (!encoded || encoded.length === 0) {
    return [];
  }

  const poly: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Convert from fixed-point integer to decimal
    // Divide by 1e5 (100,000) to get the actual coordinate
    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

/**
 * Encode an array of [lat, lng] coordinates to a polyline string
 * @param coordinates - Array of [lat, lng] coordinate pairs
 * @returns Encoded polyline string
 */
export function encodePolyline(coordinates: number[][]): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    // Convert to fixed-point integers
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    // Calculate delta from previous point
    const dLat = latE5 - prevLat;
    const dLng = lngE5 - prevLng;

    // Encode with signed values
    encoded += encodeValue(dLat);
    encoded += encodeValue(dLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return encoded;
}

/**
 * Helper: Encode a single signed integer value
 */
function encodeValue(value: number): string {
  // Make negative values positive by inverting all bits + 1
  let v = value < 0 ? ~(value << 1) : value << 1;

  let result = '';
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);

  return result;
}

/**
 * Test known encoded polylines for validation
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export const POLYLINE_TESTS = {
  // Simple 2-point line: "_p~iF~ps|U_ulLnnqC" should decode to [(38.5, -120.2), (40.7, -120.95)]
  simpleEncoded: '_p~iF~ps|U_ulLnnqC',
  simpleDecoded: [[38.5, -120.2], [40.7, -120.95]] as number[][],
  
  // More complex: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" decodes to 3 points: [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
  complexEncoded: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  complexDecoded: [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453]
  ] as number[][],
};

/**
 * Validate polyline decoder with known test cases
 */
export function validatePolylineDecoder(): boolean {
  const simple = decodePolyline(POLYLINE_TESTS.simpleEncoded);
  const complex = decodePolyline(POLYLINE_TESTS.complexEncoded);
  
  const simpleMatch = simple.length === POLYLINE_TESTS.simpleDecoded.length &&
    simple.every((p, i) => 
      Math.abs(p[0] - POLYLINE_TESTS.simpleDecoded[i][0]) < 0.0001 &&
      Math.abs(p[1] - POLYLINE_TESTS.simpleDecoded[i][1]) < 0.0001
    );
    
  const complexMatch = complex.length === POLYLINE_TESTS.complexDecoded.length &&
    complex.every((p, i) => 
      Math.abs(p[0] - POLYLINE_TESTS.complexDecoded[i][0]) < 0.0001 &&
      Math.abs(p[1] - POLYLINE_TESTS.complexDecoded[i][1]) < 0.0001
    );
  
  return simpleMatch && complexMatch;
}
