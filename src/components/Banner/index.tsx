'use client';

import { ReactNode } from 'react';

export type BannerVariant = 'info' | 'warning' | 'error' | 'success' | 'accent';

export interface BannerProps {
  /** Whether the banner is visible */
  isVisible?: boolean;
  /** Banner content */
  children: ReactNode;
  /** Visual variant of the banner */
  variant?: BannerVariant;
  /** Optional icon */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base Banner component with common styling for all banners
 * Use for: OfflineBanner, ORSWarningBanner, DeviationBanner, etc.
 */
export function Banner({
  isVisible = true,
  children,
  variant = 'info',
  icon,
  className = '',
}: BannerProps) {
  if (!isVisible) {
    return null;
  }

  const variantClasses: Record<BannerVariant, string> = {
    info: 'bg-blue-500 text-white',
    warning: 'bg-amber-500 text-white',
    error: 'bg-error-light border border-error text-error',
    success: 'bg-success-light text-success',
    accent: 'bg-accent text-accent-foreground',
  };

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 ${variantClasses[variant]} ${className}`}
    >
      {icon}
      {children}
    </div>
  );
}
