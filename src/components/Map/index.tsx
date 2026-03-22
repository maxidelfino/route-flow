/// <reference types="google.maps" />
'use client';

import { useEffect, useState, useMemo } from 'react';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';

// Types
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  status?: 'pending' | 'active' | 'completed' | 'start';
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  route?: [number, number][];
  currentPosition?: { lat: number; lng: number } | null;
  onMarkerClick?: (id: string) => void;
}

// Config
const ROSARIO_CENTER = { lat: -32.9468, lng: -60.6393 };
const MAP_ID = 'route-flow-map';

const MAX_WAYPOINTS_PER_SEGMENT = 23;
const ROUTE_COLOR = '#14b8a6';

interface DirectionsRendererProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints: Array<{ lat: number; lng: number }>;
}

function splitIntoSegments(
  points: Array<{ lat: number; lng: number }>
): Array<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; waypoints: Array<{ lat: number; lng: number }> }> {
  if (points.length <= 2) {
    return [];
  }

  if (points.length <= MAX_WAYPOINTS_PER_SEGMENT) {
    return [{ origin: points[0], destination: points[points.length - 1], waypoints: points.slice(1, -1) }];
  }

  const segments: Array<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; waypoints: Array<{ lat: number; lng: number }> }> = [];
  let currentIndex = 0;

  while (currentIndex < points.length) {
    const remainingPoints = points.length - currentIndex;
    const segmentSize = Math.min(MAX_WAYPOINTS_PER_SEGMENT + 1, remainingPoints);
    
    const segmentPoints = points.slice(currentIndex, currentIndex + segmentSize);
    
    if (segmentPoints.length < 2) {
      break;
    }
    
    const origin = segmentPoints[0];
    const destination = segmentPoints[segmentPoints.length - 1];
    const waypoints = segmentPoints.slice(1, -1);

    if (segmentPoints.length === 2) {
      segments.push({ origin, destination, waypoints: [] });
    } else {
      segments.push({ origin, destination, waypoints });
    }
    
    // Move forward by (segmentSize - 1) to create overlap: next segment starts at last point of current
    // This ensures consecutive segments share an endpoint, allowing polylines to connect smoothly
    currentIndex += segmentSize - 1;
  }

  return segments;
}

function DirectionsRenderer({ origin, destination, waypoints }: DirectionsRendererProps) {
  const map = useMap();
  const [polylines, setPolylines] = useState<google.maps.Polyline[]>([]);
  const [error, setError] = useState<string | null>(null);

  const segments = useMemo(() => {
    if (!origin || !destination) return [];
    return splitIntoSegments([origin, ...waypoints, destination]);
  }, [origin, destination, waypoints]);

  useEffect(() => {
    if (!map) return;

    polylines.forEach(pl => pl.setMap(null));
    setPolylines([]);
    setError(null);

    if (!origin || !destination || segments.length === 0) return;

    const service = new google.maps.DirectionsService();
    const newPolylines: google.maps.Polyline[] = [];
    let pendingRequests = 0;

    segments.forEach((segment, segmentIndex) => {
      if (segment.waypoints.length === 0) {
        const directPolyline = new google.maps.Polyline({
          path: [segment.origin, segment.destination],
          strokeColor: ROUTE_COLOR,
          strokeWeight: 5,
          strokeOpacity: 0.9,
          map,
        });
        newPolylines.push(directPolyline);
        return;
      }

      pendingRequests++;
      service.route({
        origin: new google.maps.LatLng(segment.origin.lat, segment.origin.lng),
        destination: new google.maps.LatLng(segment.destination.lat, segment.destination.lng),
        waypoints: segment.waypoints.map(wp => ({
          location: new google.maps.LatLng(wp.lat, wp.lng),
          stopover: true,
        })),
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        pendingRequests--;

        if (status === 'OK' && result) {
          const route = result.routes[0];
          const polyline = new google.maps.Polyline({
            path: route.overview_path,
            strokeColor: ROUTE_COLOR,
            strokeWeight: 5,
            strokeOpacity: 0.9,
            map,
          });
          newPolylines.push(polyline);
        } else {
          console.error(`Directions API error for segment ${segmentIndex}:`, status);
          if (status === 'MAX_WAYPOINTS_EXCEEDED') {
            setError(`Too many waypoints in segment ${segmentIndex + 1}`);
          }
        }

        if (pendingRequests === 0) {
          setPolylines(newPolylines);
        }
      });
    });

    if (pendingRequests === 0 && segments.length > 0) {
      setPolylines(newPolylines);
    }

    return () => {
      newPolylines.forEach(pl => pl.setMap(null));
    };
  }, [map, origin, destination, segments]);

  return error ? (
    <div className="absolute top-4 left-4 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-lg text-sm">
      {error}
    </div>
  ) : null;
}

// Custom marker component using AdvancedMarker with modern styling
function CustomMarker({ 
  marker, 
  index, 
  markers,
  onClick 
}: { 
  marker: MapMarker; 
  index: number;
  markers: MapMarker[];
  onClick?: () => void 
}) {
  const color = useMemo(() => {
    switch (marker.status) {
      case 'completed':
        return '#10b981'; // emerald-500
      case 'active':
        return '#f59e0b'; // amber-500
      case 'start':
        return '#14b8a6'; // teal-500
      default:
        return '#64748b'; // slate-500
    }
  }, [marker.status]);

  // Calculate correct display number: count non-start markers before this one
  const displayNumber = useMemo(() => {
    if (marker.status === 'start') return '0';
    
    // Count how many delivery markers come before this one
    const deliveryIndex = markers.slice(0, index).filter(m => m.status !== 'start').length;
    return deliveryIndex + 1;
  }, [marker.status, index, markers]);

  return (
    <AdvancedMarker
      position={{ lat: marker.lat, lng: marker.lng }}
      onClick={onClick}
    >
      <div
        style={{
          backgroundColor: color,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '3px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.3)',
          cursor: 'pointer',
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
        }}
      >
        {displayNumber}
      </div>
    </AdvancedMarker>
  );
}

// Current position marker - Pulsing blue dot
function CurrentPositionMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
        }}
      >
        {/* Pulse effect */}
        <div
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#0ea5e9',
            opacity: 0.4,
            animation: 'pulse 2s ease-out infinite',
          }}
        />
        {/* Inner dot */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: '3px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: '#0ea5e9',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        />
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.4; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      </div>
    </AdvancedMarker>
  );
}

// Main map container
function MapContent({
  center,
  zoom = 14,
  markers = [],
  currentPosition,
  onMarkerClick,
}: MapProps) {
  // Determine route origin and destination for DirectionsRenderer
  const routeInfo = useMemo(() => {
    if (markers.length < 2) return null;

    const startMarker = markers.find(m => m.status === 'start') || markers[0];
    const lastMarker = markers[markers.length - 1];
    const waypointMarkers = markers.slice(1, -1);

    if (!lastMarker || startMarker.id === lastMarker.id) return null;

    return {
      origin: { lat: startMarker.lat, lng: startMarker.lng },
      destination: { lat: lastMarker.lat, lng: lastMarker.lng },
      waypoints: waypointMarkers.map(m => ({ lat: m.lat, lng: m.lng })),
    };
  }, [markers]);

  const mapCenter = center 
    ? { lat: center[0], lng: center[1] } 
    : ROSARIO_CENTER;

  return (
    <Map
      mapId={MAP_ID}
      defaultCenter={mapCenter}
      defaultZoom={zoom}
      style={{ height: '100%', width: '100%' }}
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl={true}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={true}
    >
      {/* Directions route */}
      {routeInfo && (
        <DirectionsRenderer
          origin={routeInfo.origin}
          destination={routeInfo.destination}
          waypoints={routeInfo.waypoints}
        />
      )}

      {/* Markers */}
      {markers.map((marker, index) => (
        <CustomMarker
          key={marker.id}
          marker={marker}
          index={index}
          markers={markers}
          onClick={() => onMarkerClick?.(marker.id)}
        />
      ))}

      {/* Current position */}
      {currentPosition && (
        <CurrentPositionMarker position={currentPosition} />
      )}
    </Map>
  );
}

// Export the main component with APIProvider wrapper
export default function MapComponent(props: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-surface-muted to-surface-elevated flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground">Cargando mapa...</span>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-surface-muted to-surface-elevated flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="text-foreground font-medium block mb-2">API de Google Maps no configurada</span>
          <span className="text-muted-foreground text-sm">
            Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local
          </span>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} solutionChannel="GMP_DevRel_creativersions_2025_03">
      <MapContent {...props} />
    </APIProvider>
  );
}
