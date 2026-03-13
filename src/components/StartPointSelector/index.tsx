'use client';

import { useState } from 'react';
import { AddressInput } from '@/components/AddressInput';

export interface StartPointSelectorProps {
  onStartPointSelect: (lat: number, lng: number, address?: string) => void;
  initialPoint?: { lat: number; lng: number; address?: string };
}

export function StartPointSelector({ onStartPointSelect, initialPoint }: StartPointSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'gps' | 'search' | 'manual'>('gps');

  const handleUseCurrentLocation = () => {
    setGpsError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onStartPointSelect(
            position.coords.latitude,
            position.coords.longitude,
            'Ubicación actual'
          );
          setShowSelector(false);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setGpsError('Permiso de ubicación denegado. Por favor habilita el acceso a tu ubicación en la configuración del navegador.');
              break;
            case error.POSITION_UNAVAILABLE:
              setGpsError('No se pudo obtener tu ubicación. Intenta de nuevo o usa ingreso manual.');
              break;
            case error.TIMEOUT:
              setGpsError('La ubicación tomó demasiado tiempo. Intenta de nuevo o usa ingreso manual.');
              break;
            default:
              setGpsError('Error al obtener ubicación. Intenta de nuevo o usa ingreso manual.');
          }
        }
      );
    } else {
      setGpsError('Tu navegador no soporta geolocalización. Usa ingreso manual.');
    }
  };

  const validateManualInput = (): boolean => {
    if (!manualLat.trim() || !manualLng.trim()) {
      setManualError('Ingresa latitud y longitud');
      return false;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat)) {
      setManualError('Latitud debe ser un número');
      return false;
    }
    if (isNaN(lng)) {
      setManualError('Longitud debe ser un número');
      return false;
    }
    if (lat < -90 || lat > 90) {
      setManualError('Latitud inválida. Debe estar entre -90 y 90.');
      return false;
    }
    if (lng < -180 || lng > 180) {
      setManualError('Longitud inválida. Debe estar entre -180 y 180.');
      return false;
    }

    setManualError(null);
    return true;
  };

  const handleManualSubmit = () => {
    if (validateManualInput()) {
      onStartPointSelect(
        parseFloat(manualLat),
        parseFloat(manualLng),
        'Coordenadas manuales'
      );
      setManualLat('');
      setManualLng('');
      setShowSelector(false);
      setShowManualInput(false);
    }
  };

  const handleAddressSelect = (address: string, lat?: number, lng?: number) => {
    if (lat !== undefined && lng !== undefined) {
      onStartPointSelect(lat, lng, address);
      setShowSelector(false);
    }
  };

  const closeSelector = () => {
    setShowSelector(false);
    setGpsError(null);
    setManualError(null);
    setShowManualInput(false);
    setActiveTab('gps');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowSelector(!showSelector)}
        className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {initialPoint?.address || 'Punto de inicio'}
      </button>

      {showSelector && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-popover rounded-lg shadow-lg border border-border p-3 z-50">
          {/* Tabs */}
          <div className="flex border-b border-border mb-3">
            <button
              onClick={() => setActiveTab('gps')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'gps'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              GPS
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Buscar
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual
            </button>
          </div>

          {/* GPS Tab */}
          {activeTab === 'gps' && (
            <div className="space-y-3">
              <button
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-success-light rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ubicación actual</p>
                  <p className="text-xs text-muted-foreground">Usar GPS</p>
                </div>
              </button>

              {gpsError && (
                <div className="p-3 bg-error-light border border-error rounded-lg text-sm text-error">
                  {gpsError}
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div>
              <AddressInput
                onAddressSelect={handleAddressSelect}
                placeholder="Buscar punto de inicio..."
              />
            </div>
          )}

          {/* Manual Tab */}
          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="manual-lat" className="block text-xs font-medium text-foreground mb-1">
                  Latitud (-90 a 90)
                </label>
                <input
                  id="manual-lat"
                  type="text"
                  value={manualLat}
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setManualError(null);
                  }}
                  placeholder="Ej: -34.6037"
                  className="w-full px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="manual-lng" className="block text-xs font-medium text-foreground mb-1">
                  Longitud (-180 a 180)
                </label>
                <input
                  id="manual-lng"
                  type="text"
                  value={manualLng}
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setManualError(null);
                  }}
                  placeholder="Ej: -58.3816"
                  className="w-full px-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {manualError && (
                <div className="p-2 bg-error-light border border-error rounded-lg text-sm text-error">
                  {manualError}
                </div>
              )}

              <button
                onClick={handleManualSubmit}
                className="w-full px-4 py-2 min-h-[44px] bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                Confirmar
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={closeSelector}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
