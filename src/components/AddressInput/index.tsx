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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
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
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.placeId}
              onClick={() => handleSelect(result)}
              className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <p className="text-sm text-gray-800 line-clamp-2">
                {result.displayName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {showResults && query.length >= 3 && !isLoading && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 p-4 bg-white border border-gray-200 rounded-lg shadow-lg text-center text-gray-500 text-sm">
          No se encontraron direcciones
        </div>
      )}
    </form>
  );
}
