'use client';

import { RoutePoint } from '@/hooks/useRoute';
import { calculateDistance } from '@/lib/routing/local/haversine';

interface RouteInfoProps {
  currentPoint: RoutePoint | null;
  nextPoint: RoutePoint | null;
  totalDuration: number;
  totalDistance: number;
  completedCount: number;
  totalCount: number;
}

// Average speed for ETA calculation: 30 km/h = 0.5 km/min
const AVG_SPEED_KM_PER_MIN = 0.5;

export function RouteInfo({
  currentPoint,
  nextPoint,
  totalDuration,
  totalDistance,
  completedCount,
  totalCount,
}: RouteInfoProps) {
  if (!currentPoint) {
    return (
      <div className="bg-card rounded-lg shadow-md p-4 text-center text-muted-foreground hover:shadow-lg transition-all duration-200">
        <p>No hay recorrido activo</p>
        <p className="text-sm mt-1">Calculá una ruta para comenzar</p>
      </div>
    );
  }

  // Format duration from minutes to hours/minutes
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Format distance
  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Header with progress */}
      <div className="bg-primary text-primary-foreground p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">
            Entrega {completedCount + 1} de {totalCount}
          </span>
          <span className="text-sm bg-primary-hover px-2 py-1 rounded">
            {formatDuration(totalDuration - (currentPoint.eta || 0))} restantes
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-primary-hover rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Current delivery info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Location icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-accent-light rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Dirección actual</p>
            <p className="font-medium text-foreground truncate">
              {currentPoint.address}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Tiempo estimado</p>
            <p className="text-lg font-semibold text-foreground">
              {Number.isFinite(totalDuration) ? formatDuration(totalDuration) : '--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Distancia</p>
            <p className="text-lg font-semibold text-foreground">
              {Number.isFinite(totalDistance) ? formatDistance(totalDistance) : '--'}
            </p>
          </div>
        </div>

        {/* Next delivery preview */}
        {nextPoint && (() => {
          // Calculate segment distance and ETA from current to next point
          const segmentDistance = calculateDistance(
            currentPoint.lat,
            currentPoint.lng,
            nextPoint.lat,
            nextPoint.lng
          );
          const segmentETA = segmentDistance / AVG_SPEED_KM_PER_MIN;
          
          return (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Siguiente entrega</p>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <p className="text-sm text-muted-foreground truncate">{nextPoint.address}</p>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{formatDistance(segmentDistance)}</span>
                <span>•</span>
                <span>~{formatDuration(segmentETA)}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
