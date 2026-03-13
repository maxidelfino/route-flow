'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
}

interface AddressInputProps {
  onAddressSelect: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

export function AddressInput({ 
  onAddressSelect, 
  placeholder = 'Ingresa una dirección...' 
}: AddressInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
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
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Error al buscar direcciones');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAddresses]);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.displayName);
    setShowResults(false);
    onAddressSelect(result.displayName, result.lat, result.lng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onAddressSelect(query.trim());
      setQuery('');
      setResults([]);
      setShowResults(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setError(null);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-foreground placeholder:text-muted-foreground"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className="px-4 py-3 cursor-pointer hover:bg-muted border-b border-border last:border-b-0"
            >
              <p className="text-sm text-foreground line-clamp-2">
                {result.displayName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {showResults && query.length >= 3 && !isLoading && results.length === 0 && !error && (
        <div className="absolute z-10 w-full mt-1 p-4 bg-popover border border-border rounded-lg shadow-lg text-center text-muted-foreground text-sm">
          No se encontraron direcciones
        </div>
      )}

      {error && (
        <div className="absolute z-10 w-full mt-1 p-3 bg-error-light border border-error rounded-lg text-sm text-error">
          {error}
        </div>
      )}
    </form>
  );
}
