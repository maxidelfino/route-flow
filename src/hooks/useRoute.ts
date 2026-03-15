'use client';

import { useState, useCallback } from 'react';
import { addressStorage } from '@/lib/storage';

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
  polyline: [number, number][] | null; // real route from ORS
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
  polyline: null,
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

  const calculateRoute = useCallback(async (fromPosition?: { lat: number; lng: number }) => {
    const startPoint = fromPosition || state.startPoint;
    
    if (!startPoint) {
      setState(prev => ({
        ...prev,
        error: 'No start point or addresses defined',
      }));
      return null;
    }

    if (state.points.length === 0) {
      setState(prev => ({
        ...prev,
        error: 'No addresses defined',
      }));
      return null;
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await fetch('/api/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [startPoint.lng, startPoint.lat],
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

      // Reorder points based on optimized route IDs
      // result.route contains point IDs: ["start", "point-id-1", "point-id-2", ...]
      const pointIdMap = new Map(state.points.map(p => [p.id, p]));
      const reorderedPoints: RoutePoint[] = result.route
        .slice(1) // Skip 'start' (first item)
        .map((pointId: string): RoutePoint | undefined => {
          return pointIdMap.get(pointId);
        })
        .filter((p: RoutePoint | undefined): p is RoutePoint => p !== undefined);

      // Update points with ETAs in the new order
      const updatedPoints: RoutePoint[] = reorderedPoints.map((p, i) => ({
        ...p,
        eta: result.etas[i + 1], // +1 because start point is not in points
        status: (i === 0 ? 'current' : 'pending') as RoutePoint['status'],
      }));

      setState(prev => ({
        ...prev,
        status: 'ready',
        route: result.route,
        polyline: result.polyline as [number, number][] | null,
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

  const completeCurrentPoint = useCallback(async (fromPosition?: { lat: number; lng: number }) => {
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
  }, []);

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
