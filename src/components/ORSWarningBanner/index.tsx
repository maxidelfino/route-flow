'use client';

import { useEffect, useState } from 'react';
import { isApiKeyConfigured } from '@/lib/ors';

interface ORSWarningBannerProps {
  className?: string;
}

export function ORSWarningBanner({ className = '' }: ORSWarningBannerProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Check on mount if ORS is configured
    const checkORS = () => {
      const configured = isApiKeyConfigured();
      if (!configured) {
        setShowWarning(true);
      }
    };
    
    checkORS();
  }, []);

  if (!showWarning) {
    return null;
  }

  return (
    <div
      className={`bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium fixed top-0 left-0 right-0 z-[9999] ${className}`}
    >
      ⚠️ ORS API Key no configurada - usando cálculo local
    </div>
  );
}
