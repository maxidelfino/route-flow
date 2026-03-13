'use client';

import { useEffect, useState, useCallback } from 'react';
import { addressStorage } from '@/lib/storage';
import { geocodeAddressWithFallback } from '@/lib/geocode';

const GEOCODE_DELAY_MS = 1000; // Rate limiting for Nominatim

interface UseAutoGeocodeOptions {
  /** Maximum number of addresses to geocode in one batch */
  maxBatchSize?: number;
  /** Delay between geocode requests (ms) */
  delayMs?: number;
}

interface UseAutoGeocodeState {
  isGeocoding: boolean;
  geocodedCount: number;
  failedCount: number;
  currentAddress: string | null;
}

/**
 * Hook to automatically geocode pending addresses with rate limiting
 */
export function useAutoGeocode(options: UseAutoGeocodeOptions = {}) {
  const { maxBatchSize = 5, delayMs = GEOCODE_DELAY_MS } = options;
  
  const [state, setState] = useState<UseAutoGeocodeState>({
    isGeocoding: false,
    geocodedCount: 0,
    failedCount: 0,
    currentAddress: null,
  });

  const geocodePendingAddresses = useCallback(async () => {
    // Get pending addresses
    const pending = await addressStorage.getByStatus('pending');
    
    if (pending.length === 0) {
      return;
    }

    // Limit batch size
    const toGeocode = pending.slice(0, maxBatchSize);
    
    setState(prev => ({
      ...prev,
      isGeocoding: true,
      geocodedCount: 0,
      failedCount: 0,
    }));

    let geocodedCount = 0;
    let failedCount = 0;

    for (const address of toGeocode) {
      try {
        // Update status to geocoding
        await addressStorage.update(address.id, { status: 'geocoding' });
        
        setState(prev => ({
          ...prev,
          currentAddress: address.text,
        }));

        // Try to geocode with fallback formats
        const result = await geocodeAddressWithFallback(address.text);
        
        // Success - update with coordinates
        await addressStorage.update(address.id, {
          status: 'geocoded',
          lat: result.lat,
          lng: result.lng,
        });
        
        geocodedCount++;
      } catch (error) {
        console.error(`Failed to geocode "${address.text}":`, error);
        
        // Mark as pending (failed) - user can retry manually
        await addressStorage.update(address.id, { status: 'pending' });
        
        failedCount++;
      }

      // Rate limiting delay
      if (toGeocode.indexOf(address) < toGeocode.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    setState(prev => ({
      ...prev,
      isGeocoding: false,
      geocodedCount: prev.geocodedCount + geocodedCount,
      failedCount: prev.failedCount + failedCount,
      currentAddress: null,
    }));
  }, [maxBatchSize, delayMs]);

  // Auto-geocode on mount and when new pending addresses are added
  useEffect(() => {
    // Small delay to let the component mount first
    const timeoutId = setTimeout(() => {
      geocodePendingAddresses();
    }, 500);

    // Poll for new pending addresses every 3 seconds
    const intervalId = setInterval(() => {
      geocodePendingAddresses();
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [geocodePendingAddresses]);

  return {
    ...state,
    geocodePendingAddresses,
  };
}
