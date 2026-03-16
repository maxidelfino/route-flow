'use client';

import { useState, useRef, useEffect } from 'react';
import { extractText, extractAddressesFromText } from '@/lib/ocr';
import { useAddressSearch, type SearchResult } from '@/hooks/useAddressSearch';

interface OCRUploaderProps {
  onTextExtracted: (text: string, lat?: number, lng?: number) => void;
}

export function OCRUploader({ onTextExtracted }: OCRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use unified address search hook
  // For OCR, we want faster response so use shorter debounce
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: suggestions,
    isLoading: isSearching,
    error: searchError,
    selectedResult,
    setSelectedResult,
  } = useAddressSearch({
    minChars: 3,
    debounceMs: 300, // Faster response for OCR
  });

  // Sync extracted text with search query for suggestions
  useEffect(() => {
    if (extractedText.trim().length >= 3) {
      setSearchQuery(extractedText.trim());
      setShowSuggestions(true);
    } else {
      setSearchQuery('');
      setShowSuggestions(false);
    }
  }, [extractedText, setSearchQuery]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process OCR
    setIsProcessing(true);
    setProgress(0);

    try {
      const text = await extractText(file);
      
      // Try to extract addresses automatically
      const addresses = extractAddressesFromText(text);
      const finalText = addresses.length > 0 ? addresses.join('\n') : text;
      
      // Set the text and trigger search immediately
      setExtractedText(finalText);
      setSearchQuery(finalText.trim());
      setShowSuggestions(true);
    } catch (error) {
      console.error('OCR failed:', error);
      setExtractedText('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleConfirm = () => {
    if (extractedText.trim()) {
      // If user selected a suggestion, use its coordinates
      if (selectedResult) {
        onTextExtracted(selectedResult.displayName, selectedResult.lat, selectedResult.lng);
      } else {
        // Manual entry - no coordinates
        onTextExtracted(extractedText.trim());
      }
      handleReset();
    }
  };

  const handleSelectSuggestion = (suggestion: SearchResult) => {
    setSelectedResult(suggestion);
    setExtractedText(suggestion.displayName);
    setShowSuggestions(false);
  };

  const handleReset = () => {
    setExtractedText('');
    setImagePreview(null);
    setProgress(0);
    setShowSuggestions(false);
    setSelectedResult(null);
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full p-4 bg-card rounded-lg border border-border">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!imagePreview ? (
        <div className="text-center">
          <button
            type="button"
            onClick={handleTakePhoto}
            className="px-6 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tomar foto / Elegir imagen
          </button>
          <p className="mt-2 text-sm text-muted-foreground">
            Saca una foto de la dirección en la planilla
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img
              src={imagePreview}
              alt="Captured"
              className="w-full h-48 object-contain"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Procesando OCR...</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="w-full bg-muted-foreground/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Extracted text */}
          {extractedText && !isProcessing && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Texto extraído (editable):
              </label>
              <textarea
                value={extractedText}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setExtractedText(newValue);
                  // Only clear selectedResult if user actually typed something different
                  // This prevents clearing the selection when clicking to position cursor
                  if (newValue !== selectedResult?.displayName) {
                    setSelectedResult(null);
                  }
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
                placeholder="Edita la dirección si es necesario..."
              />
            </div>
          )}

          {/* Address suggestions */}
          {showSuggestions && extractedText.trim().length >= 3 && !isProcessing && (
            <div className="relative">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Buscando direcciones...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <ul className="bg-popover border border-border/50 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.placeId}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`px-4 py-3 cursor-pointer hover:bg-primary/5 border-b border-border/30 last:border-b-0 transition-colors ${
                        selectedResult?.placeId === suggestion.placeId ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {suggestion.displayName}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : extractedText.trim().length >= 3 && !isSearching && !searchError ? (
                <div className="p-4 text-center text-muted-foreground bg-popover border border-border/50 rounded-xl">
                  <p className="text-sm">No se encontraron direcciones</p>
                  <p className="text-xs mt-1">Podés agregar la dirección manualmente</p>
                </div>
              ) : null}

              {/* Error display */}
              {searchError && (
                <div className="p-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-rose-700 dark:text-rose-300">{searchError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected result indicator */}
          {selectedResult && (
            <div className="flex items-center gap-2 p-2 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-teal-700 dark:text-teal-300">Dirección validada</p>
            </div>
          )}

          {/* Actions */}
          {!isProcessing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-2 min-h-[44px] border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!extractedText.trim()}
                className="flex-1 px-4 py-2 min-h-[44px] bg-success text-success-foreground rounded-lg hover:bg-success-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar dirección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
