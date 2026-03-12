'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGPSResult {
  position: GPSPosition | null;
  error: string | null;
  isSupported: boolean;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useGPS(options: UseGPSOptions = {}): UseGPSResult {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
  } = options;

  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const startTracking = useCallback(() => {
    if (!isSupported) {
      setError('GPS no disponible en este dispositivo');
      return;
    }

    if (watchId !== null) {
      return; // Already tracking
    }

    setError(null);
    
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [isSupported, watchId, enableHighAccuracy, timeout, maximumAge]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    position,
    error,
    isSupported,
    isTracking,
    startTracking,
    stopTracking,
  };
}
