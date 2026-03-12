'use client';

import { useState, useRef } from 'react';
import { extractText, extractAddressesFromText } from '@/lib/ocr';

interface OCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

export function OCRUploader({ onTextExtracted }: OCRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setExtractedText(text);
      
      // Try to extract addresses automatically
      const addresses = extractAddressesFromText(text);
      if (addresses.length > 0) {
        setExtractedText(addresses.join('\n'));
      }
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
      onTextExtracted(extractedText.trim());
      handleReset();
    }
  };

  const handleReset = () => {
    setExtractedText('');
    setImagePreview(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg border border-gray-200">
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
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tomar foto / Elegir imagen
          </button>
          <p className="mt-2 text-sm text-gray-500">
            Saca una foto de la dirección en la planilla
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
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
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Extracted text */}
          {extractedText && !isProcessing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto extraído (editable):
              </label>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Edita la dirección si es necesario..."
              />
            </div>
          )}

          {/* Actions */}
          {!isProcessing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!extractedText.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
