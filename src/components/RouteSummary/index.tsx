'use client';

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
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green-600"
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
        <h2 className="text-2xl font-bold text-gray-900">¡Recorrido Completado!</h2>
        <p className="text-gray-500 mt-1">Todas las entregas fueron realizadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{completedCount}</p>
          <p className="text-sm text-gray-500">Entregas</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{formatDuration(totalDuration)}</p>
          <p className="text-sm text-gray-500">Tiempo total</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{formatDistance(totalDistance)}</p>
          <p className="text-sm text-gray-500">Distancia</p>
        </div>
      </div>

      {/* New Route Button */}
      <button
        onClick={onNewRoute}
        className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        Iniciar Nuevo Recorrido
      </button>
    </div>
  );
}
