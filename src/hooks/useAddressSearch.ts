'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SearchResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
}

export interface UseAddressSearchOptions {
  /** Minimum characters before search (default: 3) */
  minChars?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Callback when address is selected */
  onSelect?: (result: SearchResult) => void;
}

export interface UseAddressSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  isSearching: boolean;
  selectedResult: SearchResult | null;
  setSelectedResult: (result: SearchResult | null) => void;
  clearResults: () => void;
}

/**
 * Unified hook for address search functionality
 * Handles debounced API calls to /api/geocode with Rosario context
 * Used by AddressInput, StartPointSelector, and OCRUploader
 */
export function useAddressSearch(options: UseAddressSearchOptions = {}): UseAddressSearchReturn {
  const {
    minChars = 3,
    debounceMs = 300,
    onSelect,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        setError('Error al buscar direcciones');
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Address search failed:', err);
      setError('Error al buscar direcciones');
      setResults([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [minChars]);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAddresses, debounceMs]);

  const handleSelect = useCallback((result: SearchResult) => {
    setSelectedResult(result);
    setResults([]);
    onSelect?.(result);
  }, [onSelect]);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedResult(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    isSearching,
    selectedResult,
    setSelectedResult,
    clearResults,
  };
}
