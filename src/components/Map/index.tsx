'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Types
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  status?: 'pending' | 'active' | 'completed';
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  route?: [number, number][];
  onMarkerClick?: (id: string) => void;
}

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function MapComponent({
  center = [-34.6037, -58.3816], // Buenos Aires default
  zoom = 12,
  markers = [],
  route = [],
  onMarkerClick,
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Fix Leaflet default icon issue
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500">Cargando mapa...</span>
      </div>
    );
  }

  // Custom marker colors based on status
  const getMarkerColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e'; // green
      case 'active':
        return '#f59e0b'; // amber
      default:
        return '#3b82f6'; // blue
    }
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Route polyline */}
      {route.length > 1 && (
        <Polyline
          positions={route}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
          }}
        />
      )}
      
      {/* Markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(marker.id),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{marker.label || marker.id}</p>
              <p className="text-xs text-gray-500 capitalize">{marker.status || 'pendiente'}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
