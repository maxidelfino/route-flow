'use client';

import { useEffect } from 'react';
import { useGPS } from '@/hooks/useGPS';

interface ExecutionPanelProps {
  isActive: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onAddStop: () => void;
}

export function ExecutionPanel({
  isActive,
  onComplete,
  onCancel,
  onAddStop,
}: ExecutionPanelProps) {
  const { position, error, isTracking, startTracking, stopTracking, isSupported } = useGPS({
    enableHighAccuracy: true,
  });

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
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onAddStop}
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
    </div>
  );
}
