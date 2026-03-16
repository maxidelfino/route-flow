'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useGPS } from '@/hooks/useGPS';
import { DeviationBanner } from '@/components/DeviationBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { compareRouteWithPosition } from '@/lib/routing/local/routeComparator';
import { calculateDistance } from '@/lib/routing/local/haversine';

interface ExecutionPanelProps {
  isActive: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onAddStop: () => void;
  route?: [number, number][];
  onPositionUpdate?: (position: { lat: number; lng: number }) => void;
  onRecalculate?: () => void;
  nextPoint?: { lat: number; lng: number } | null;
}

export function ExecutionPanel({
  isActive,
  onComplete,
  onCancel,
  onAddStop,
  route,
  onPositionUpdate,
  onRecalculate,
  nextPoint,
}: ExecutionPanelProps) {
  const { position, error, isTracking, startTracking, stopTracking, isSupported } = useGPS({
    enableHighAccuracy: true,
  });

  // Deviation detection state
  const [isDeviating, setIsDeviating] = useState(false);
  const [distanceToRoute, setDistanceToRoute] = useState(0);
  const [showAddStopConfirm, setShowAddStopConfirm] = useState(false);

  // Compare position with route to detect deviations
  const hasRecalculated = useRef(false);
  useEffect(() => {
    if (!position || !route || route.length < 2) {
      setIsDeviating(false);
      setDistanceToRoute(0);
      return;
    }

    // Convert GPS position from {lat, lng} to [lng, lat] format
    const currentPos: [number, number] = [position.lng, position.lat];
    
    // Use 50m threshold (0.05 km) for deviation detection
    const result = compareRouteWithPosition(currentPos, route, 0.05);
    
    setIsDeviating(result.isDeviating);
    setDistanceToRoute(result.distanceToRoute);

    // Check if we should recalculate: only when closer to next point than route
    // AND within reasonable distance (500m) - prevents excessive recalculations while driving
    if (onRecalculate && nextPoint && !hasRecalculated.current) {
      const distanceToNextPoint = calculateDistance(
        position.lat, position.lng,
        nextPoint.lat, nextPoint.lng
      );
      
      // Only recalculate if within 500m of next point and closer to it than route
      // This prevents constant recalculation while driving
      const MIN_DISTANCE_THRESHOLD_KM = 0.5; // 500 meters
      if (distanceToNextPoint < MIN_DISTANCE_THRESHOLD_KM && 
          distanceToNextPoint < result.distanceToRoute) {
        hasRecalculated.current = true;
        onRecalculate();
        
        // Reset the flag after a delay to allow recalculation to happen
        setTimeout(() => {
          hasRecalculated.current = false;
        }, 30000);
      }
    }
  }, [position, route, onRecalculate, nextPoint]);

  // Report position to parent component (for Map marker)
  useEffect(() => {
    if (position && onPositionUpdate) {
      onPositionUpdate({ lat: position.lat, lng: position.lng });
    }
  }, [position, onPositionUpdate]);

  // Start/stop GPS tracking based on active state
  useEffect(() => {
    if (isActive && !isTracking && isSupported) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive, isTracking, isSupported, startTracking, stopTracking]);

  // Format GPS accuracy
  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 10) return 'Excelente';
    if (accuracy < 30) return 'Buena';
    if (accuracy < 100) return 'Regular';
    return 'Baja';
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy < 10) return 'text-emerald-600 dark:text-emerald-400';
    if (accuracy < 30) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const handleAddStopClick = () => {
    setShowAddStopConfirm(true);
  };

  const handleAddStopConfirm = () => {
    setShowAddStopConfirm(false);
    onAddStop();
  };

  const handleAddStopCancel = () => {
    setShowAddStopConfirm(false);
  };

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-5 space-y-5 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* GPS Status - Modern pill style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium text-muted-foreground">
            {isTracking ? 'GPS activo' : 'GPS inactivo'}
          </span>
        </div>
        
        {position && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getAccuracyColor(position.accuracy)} bg-current/10`}>
            {formatAccuracy(position.accuracy)}
          </span>
        )}
      </div>

      {/* Error message - Modern style */}
      {error && (
        <div className="bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Deviation warning */}
      {isActive && (
        <DeviationBanner
          isVisible={isDeviating}
          distance={distanceToRoute}
        />
      )}

      {/* Position display - Modern card style */}
      {position && (
        <div className="bg-gradient-to-br from-surface-muted to-surface-elevated rounded-xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tu posición</p>
          </div>
          <p className="text-sm font-mono text-foreground">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Action buttons - Premium styling */}
      {isActive && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleAddStopClick}
              className="px-4 py-3.5 min-h-[52px] bg-surface border-2 border-border hover:border-secondary hover:bg-secondary-light text-foreground font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>

            <button
              onClick={onComplete}
              className="px-4 py-3.5 min-h-[52px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 hover-glow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completar
            </button>
          </div>
        </div>
      )}

      {/* Recalculate button - Premium styling */}
      {route && route.length > 0 && !isActive && (
        <button
          onClick={onRecalculate}
          className="w-full px-4 py-3.5 min-h-[52px] bg-gradient-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-semibold">Recalcular Ruta</span>
        </button>
      )}

      {/* Cancel button - Modern outline style */}
      {isActive && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-3 min-h-[48px] border-2 border-border text-muted-foreground font-medium rounded-xl hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:border-rose-800 dark:hover:text-rose-400 transition-all duration-200 text-sm"
        >
          Cancelar recorrido
        </button>
      )}

      {/* Add Stop Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showAddStopConfirm}
        title="Agregar nueva parada"
        message="Esto recalculará la ruta y puede tomar unos segundos."
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleAddStopConfirm}
        onCancel={handleAddStopCancel}
      />
    </div>
  );
}
