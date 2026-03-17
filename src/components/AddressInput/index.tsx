'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAddressSearch, type SearchResult } from '@/hooks/useAddressSearch';

interface AddressInputProps {
  onAddressSelect: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

export function AddressInput({ 
  onAddressSelect, 
  placeholder = 'Ingresa una dirección...' 
}: AddressInputProps) {
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((result: SearchResult) => {
    onAddressSelect(result.displayName, result.lat, result.lng);
  }, [onAddressSelect]);

  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    selectedResult,
    setSelectedResult,
  } = useAddressSearch({
    minChars: 3,
    debounceMs: 300,
  });

  const handleResultClick = (result: SearchResult) => {
    handleSelect(result);
    setQuery('');
    setShowResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onAddressSelect(query.trim());
      setQuery('');
      setShowResults(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full overflow-visible">
      <div className="relative overflow-visible">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedResult(null);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 text-base border-2 border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-200 hover:border-border"
        />
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border/50 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.placeId}
              onClick={() => handleResultClick(result)}
              className="px-4 py-3.5 cursor-pointer hover:bg-primary/5 border-b border-border/30 last:border-b-0 transition-colors duration-150"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <p className="text-sm text-foreground line-clamp-2">
                  {result.displayName}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showResults && query.length >= 3 && !isLoading && results.length === 0 && !error && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 p-4 bg-popover border border-border/50 rounded-xl shadow-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">No se encontraron direcciones</p>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 p-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        </div>
      )}
    </form>
  );
}
