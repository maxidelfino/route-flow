'use client';

import { useEffect, useState } from 'react';
import { isApiKeyConfigured } from '@/lib/ors';
import { Banner } from '@/components/Banner';

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

  return (
    <Banner isVisible={showWarning} variant="warning" className={className}>
      ⚠️ ORS API Key no configurada - usando cálculo local
    </Banner>
  );
}
