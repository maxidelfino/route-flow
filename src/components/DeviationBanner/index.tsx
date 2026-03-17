'use client';

import { formatDistanceCompact } from '@/lib/format';
import { Banner } from '@/components/Banner';

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

interface DeviationBannerProps {
  isVisible: boolean;
  distance?: number;
  className?: string;
}

export function DeviationBanner({ isVisible, distance, className = '' }: DeviationBannerProps) {
  const distanceText = distance ? formatDistanceCompact(distance) : '';

  return (
    <Banner isVisible={isVisible} variant="warning" icon={<WarningIcon />} className={className}>
      Te has desviado de la ruta {distanceText ? `(${distanceText})` : ''}
    </Banner>
  );
}
