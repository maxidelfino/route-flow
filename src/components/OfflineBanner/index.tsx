'use client';

import { Banner } from '@/components/Banner';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  return (
    <Banner variant="accent" className={className}>
      Sin conexión - algunas funciones limitadas
    </Banner>
  );
}
