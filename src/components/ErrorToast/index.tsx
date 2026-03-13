'use client';

import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ErrorToastProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorToast({
  message,
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorToastProps) {
  return (
    <div className={`mx-3 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-red-600 flex-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
          >
            {isRetrying ? (
              <>
                <LoadingSpinner size="sm" />
                Reintentando...
              </>
            ) : (
              'Reintentar'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
