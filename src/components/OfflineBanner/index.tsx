'use client';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  return (
    <div
      className={`bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium fixed top-0 left-0 right-0 z-[9999] ${className}`}
    >
      Sin conexión - algunas funciones limitadas
    </div>
  );
}
