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
  route?: [number, number][]; // Not used anymore - DirectionsRenderer handles it
  currentPosition?: { lat: number; lng: number } | null;
  onMarkerClick?: (id: string) => void;
}

// Config
const ROSARIO_CENTER = { lat: -32.9468, lng: -60.6393 };
const MAP_ID = 'route-flow-map';

interface DirectionsRendererProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints: Array<{ lat: number; lng: number }>;
}

function DirectionsRenderer({ origin, destination, waypoints }: DirectionsRendererProps) {
  const map = useMap();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create service and renderer
    const service = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true, // We handle our own markers
      preserveViewport: false,
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      waypoints: waypoints.map(wp => ({
        location: new google.maps.LatLng(wp.lat, wp.lng),
        stopover: true,
      })),
      optimizeWaypoints: false, // Already optimized by backend
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result);
      } else {
        console.error('Directions API error:', status);
      }
    });
  }, [directionsService, directionsRenderer, origin, destination, waypoints]);

  return null;
}

// Custom marker component using AdvancedMarker
function CustomMarker({ 
  marker, 
  index, 
  onClick 
}: { 
  marker: MapMarker; 
  index: number; 
  onClick?: () => void 
}) {
  const color = useMemo(() => {
    switch (marker.status) {
      case 'completed':
        return '#22c55e'; // green
      case 'active':
        return '#f59e0b'; // amber
      case 'start':
        return '#10b981'; // emerald
      default:
        return '#3b82f6'; // blue
    }
  }, [marker.status]);

  // Start point displays as 0, delivery points start at 1
  // index passed is based on markers array order: [startPoint, point0, point1, ...]
  const displayNumber = marker.status === 'start' ? 0 : index;

  return (
    <AdvancedMarker
      position={{ lat: marker.lat, lng: marker.lng }}
      onClick={onClick}
    >
      <div
        style={{
          backgroundColor: color,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '3px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {displayNumber}
      </div>
    </AdvancedMarker>
  );
}

// Current position marker
function CurrentPositionMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#0ea5e9',
          border: '3px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      />
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
  // Markers array: [startPoint?, point0, point1, point2, ...]
  const routeInfo = useMemo(() => {
    if (markers.length < 2) return null;

    // Find start marker (status='start') or use first marker
    const startMarker = markers.find(m => m.status === 'start') || markers[0];
    
    // Find the last marker (destination)
    const lastMarker = markers[markers.length - 1];
    
    // All markers between start and end are waypoints
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
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">Cargando mapa...</span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-center p-4">
          API de Google Maps no configurada.<br />
          Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local
        </span>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} solutionChannel="GMP_DevRel_creativersions_2025_03">
      <MapContent {...props} />
    </APIProvider>
  );
}
