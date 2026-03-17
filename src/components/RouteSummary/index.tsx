'use client';

import { formatDistance, formatDuration } from '@/lib/format';

interface RouteSummaryProps {
  totalDuration: number;
  totalDistance: number;
  completedCount: number;
  onNewRoute: () => void;
}

export function RouteSummary({
  totalDuration,
  totalDistance,
  completedCount,
  onNewRoute,
}: RouteSummaryProps) {
  return (
    <div className="bg-card rounded-lg shadow-md p-6 space-y-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">¡Recorrido Completado!</h2>
        <p className="text-muted-foreground mt-1">Todas las entregas fueron realizadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-primary">{completedCount}</p>
          <p className="text-sm text-muted-foreground">Entregas</p>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-primary">{formatDuration(totalDuration)}</p>
          <p className="text-sm text-muted-foreground">Tiempo total</p>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-primary">{formatDistance(totalDistance)}</p>
          <p className="text-sm text-muted-foreground">Distancia</p>
        </div>
      </div>

      {/* New Route Button */}
      <button
        onClick={onNewRoute}
        className="w-full py-3 min-h-[44px] bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Iniciar Nuevo Recorrido
      </button>
    </div>
  );
}
