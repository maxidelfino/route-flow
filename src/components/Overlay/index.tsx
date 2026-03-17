'use client';

import { ReactNode, useEffect, useRef, useCallback } from 'react';

export interface OverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Content to render inside the overlay */
  children: ReactNode;
  /** Callback when overlay is closed (click outside or Escape) */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable Overlay component for modals and dialogs
 * Handles:
 * - Click outside to close
 * - Escape key to close
 * - Focus management
 */
export function Overlay({
  isOpen,
  children,
  onClose,
  className = '',
}: OverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || !onClose) return;

    if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, onClose]);

  // Handle click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!isOpen || !onClose || !overlayRef.current) return;

    if (!overlayRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleKeyDown, handleClickOutside]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Content */}
      <div ref={overlayRef} className={className}>
        {children}
      </div>
    </div>
  );
}
