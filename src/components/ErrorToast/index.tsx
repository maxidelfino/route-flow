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
    <div className={`mx-3 mt-3 p-3 bg-error-light border border-error rounded-lg ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-error flex-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-3 py-1 min-h-[32px] bg-error text-error-foreground text-xs font-medium rounded hover:bg-error-hover transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap cursor-pointer"
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
