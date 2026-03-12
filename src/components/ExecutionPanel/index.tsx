'use client';

import { useEffect } from 'react';
import { useGPS, GPSPosition } from '@/hooks/useGPS';

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
    if (accuracy < 10) return 'text-green-600';
    if (accuracy < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      {/* GPS Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Position display */}
      {position && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Tu posición</p>
          <p className="text-sm font-mono text-gray-700">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onAddStop}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar parada
          </button>

          <button
            onClick={onComplete}
            className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
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
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Cancelar recorrido
        </button>
      )}
    </div>
  );
}
