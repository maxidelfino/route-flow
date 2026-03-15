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

    // Check if distance to next point < distance to route (recalculate condition)
    if (onRecalculate && nextPoint && !hasRecalculated.current) {
      const distanceToNextPoint = calculateDistance(
        position.lat, position.lng,
        nextPoint.lat, nextPoint.lng
      );
      
      // If closer to next point than to route, trigger recalculation
      if (distanceToNextPoint < result.distanceToRoute) {
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
    if (accuracy < 10) return 'text-success';
    if (accuracy < 30) return 'text-warning';
    return 'text-error';
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
    <div className="bg-card rounded-lg shadow-md p-4 space-y-4">
      {/* GPS Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm text-muted-foreground">
            {isTracking ? 'GPS activo' : 'GPS inactivo'}
          </span>
        </div>
        
        {position && (
          <span className={`text-xs font-medium ${getAccuracyColor(position.accuracy)}`}>
            Precisión: {formatAccuracy(position.accuracy)}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-error-light border border-error rounded-lg p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Deviation warning */}
      {isActive && (
        <DeviationBanner
          isVisible={isDeviating}
          distance={distanceToRoute}
        />
      )}

      {/* Position display */}
      {position && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Tu posición</p>
          <p className="text-sm font-mono text-foreground">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {isActive && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleAddStopClick}
              className="px-4 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar parada
            </button>

            <button
              onClick={onComplete}
              className="px-4 py-3 min-h-[44px] bg-success text-success-foreground rounded-lg hover:bg-success-hover transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completar entrega
            </button>
          </div>
        </div>
      )}

      {/* Recalculate button - show when not executing but has route */}
      {route && route.length > 0 && !isActive && (
        <button
          onClick={onRecalculate}
          className="w-full px-4 py-3 min-h-[44px] bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-medium">Recalcular Ruta</span>
        </button>
      )}

      {/* Cancel button */}
      {isActive && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 min-h-[44px] border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm"
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
