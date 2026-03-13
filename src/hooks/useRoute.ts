'use client';

import { useState, useCallback } from 'react';
import { Address, addressStorage } from '@/lib/storage';

export type RouteStatus = 'idle' | 'loading' | 'ready' | 'executing' | 'completed';

export interface RoutePoint {
  id: string;
  address: string;
  lat: number;
  lng: number;
  status: 'pending' | 'current' | 'completed';
  eta?: number;
  distance?: number;
}

export interface RouteState {
  status: RouteStatus;
  startPoint: { lat: number; lng: number; address?: string } | null;
  points: RoutePoint[];
  route: string[]; // ordered point IDs
  totalDuration: number;
  totalDistance: number;
  currentIndex: number;
  error: string | null;
}

const initialState: RouteState = {
  status: 'idle',
  startPoint: null,
  points: [],
  route: [],
  totalDuration: 0,
  totalDistance: 0,
  currentIndex: 0,
  error: null,
};

export function useRoute() {
  const [state, setState] = useState<RouteState>(initialState);

  const setStartPoint = useCallback((lat: number, lng: number, address?: string) => {
    setState(prev => ({
      ...prev,
      startPoint: { lat, lng, address },
    }));
  }, []);

  const loadAddresses = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const addresses = await addressStorage.getAll();
      const geocoded = addresses.filter(a => a.lat && a.lng);

      const points: RoutePoint[] = geocoded.map(a => ({
        id: a.id,
        address: a.text,
        lat: a.lat!,
        lng: a.lng!,
        status: 'pending',
      }));

      setState(prev => ({
        ...prev,
        status: points.length > 0 ? 'ready' : 'idle',
        points,
        error: null,
      }));

      return points;
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'idle',
        error: 'Failed to load addresses',
      }));
      return [];
    }
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!state.startPoint || state.points.length === 0) {
      setState(prev => ({
        ...prev,
        error: 'No start point or addresses defined',
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch('/api/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [state.startPoint.lng, state.startPoint.lat],
          points: state.points.map(p => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Route calculation failed');
      }

      const result = await response.json();

      // Update points with ETAs
      const updatedPoints: RoutePoint[] = state.points.map((p, i) => ({
        ...p,
        eta: result.etas[i + 1], // +1 because start point is not in points
        status: (i === 0 ? 'current' : 'pending') as RoutePoint['status'],
      }));

      setState(prev => ({
        ...prev,
        status: 'ready',
        route: result.route,
        points: updatedPoints,
        totalDuration: result.totalDuration,
        totalDistance: result.totalDistance,
        currentIndex: 0,
        error: null,
      }));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Route calculation failed';
      setState(prev => ({
        ...prev,
        status: 'ready', // Keep ready to allow retry
        error: message,
      }));
      return null;
    }
  }, [state.startPoint, state.points]);

  const startExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'executing',
      currentIndex: 0,
      points: prev.points.map((p, i) => ({
        ...p,
        status: i === 0 ? 'current' : 'pending',
      })),
    }));
  }, []);

  const getRemainingPoints = useCallback(() => {
    return state.points.filter(p => p.status !== 'completed');
  }, [state.points]);

  const completeCurrentPoint = useCallback(async () => {
    setState(prev => {
      const newPoints = [...prev.points];
      newPoints[prev.currentIndex] = {
        ...newPoints[prev.currentIndex],
        status: 'completed',
      };

      const nextIndex = prev.currentIndex + 1;
      const isCompleted = nextIndex >= newPoints.length;

      if (!isCompleted) {
        newPoints[nextIndex] = {
          ...newPoints[nextIndex],
          status: 'current',
        };
      }

      return {
        ...prev,
        points: newPoints,
        currentIndex: nextIndex,
        status: isCompleted ? 'completed' : 'executing',
      };
    });

    // Recalculate route if there are remaining points
    const remaining = getRemainingPoints();
    if (remaining.length > 1) {
      await calculateRoute();
    }
  }, [calculateRoute, getRemainingPoints]);

  const addPoint = useCallback((address: string, lat: number, lng: number) => {
    const newPoint: RoutePoint = {
      id: `point-${Date.now()}`,
      address,
      lat,
      lng,
      status: 'pending',
    };

    setState(prev => ({
      ...prev,
      points: [...prev.points, newPoint],
      status: prev.status === 'executing' ? 'executing' : 'ready',
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setStartPoint,
    loadAddresses,
    calculateRoute,
    startExecution,
    completeCurrentPoint,
    getRemainingPoints,
    addPoint,
    reset,
  };
}
