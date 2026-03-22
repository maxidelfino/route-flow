'use client';

import { useState, useEffect } from 'react';
import { AddressInput } from '@/components/AddressInput';
import { reverseGeocode } from '@/lib/geocode';

export interface StartPointSelectorProps {
  onStartPointSelect: (lat: number, lng: number, address?: string) => void;
  initialPoint?: { lat: number; lng: number; address?: string };
  isOpen?: boolean;
}

export function StartPointSelector({ onStartPointSelect, initialPoint, isOpen }: StartPointSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (isOpen !== undefined) {
      setShowSelector(isOpen);
    }
  }, [isOpen]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'gps' | 'search' | 'manual'>('gps');

  const simplifyAddress = (fullAddress: string): string => {
    if (!fullAddress) return 'Ubicación actual';
    
    const parts = fullAddress.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length === 0) return 'Ubicación actual';
    
    const firstPart = parts[0];
    
    if (/^\d+$/.test(firstPart) && parts[1]) {
      return `${parts[1]}, ${firstPart}`;
    }
    
    return firstPart;
  };

  const handleUseCurrentLocation = async () => {
    setGpsError(null);
    setIsLoadingAddress(true);
    
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización. Usa ingreso manual.');
      setIsLoadingAddress(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        let address = 'Ubicación actual';
        try {
          const reverseAddress = await reverseGeocode(lat, lng);
          address = simplifyAddress(reverseAddress);
        } catch (error) {
          console.warn('Reverse geocoding failed, using fallback:', error);
        }
        
        onStartPointSelect(lat, lng, address);
        setShowSelector(false);
        setIsLoadingAddress(false);
      },
      (error) => {
        setIsLoadingAddress(false);
        
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor habilita el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'No se pudo obtener tu ubicación. Intenta de nuevo o usa ingreso manual.';
            break;
          case error.TIMEOUT:
            errorMessage = 'La ubicación tomó demasiado tiempo. Intenta de nuevo o usa ingreso manual.';
            break;
          default:
            if (error.message) {
              errorMessage = `Error al obtener ubicación: ${error.message}`;
            } else {
              errorMessage = 'Error al obtener ubicación. Intenta de nuevo o usa ingreso manual.';
            }
        }
        
        setGpsError(errorMessage);
        console.warn('Geolocation error:', error.message, 'code:', error.code);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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

  const handleManualSubmit = async () => {
    if (validateManualInput()) {
      setIsLoadingAddress(true);
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      
      let address = 'Coordenadas manuales';
      try {
        const reverseAddress = await reverseGeocode(lat, lng);
        address = simplifyAddress(reverseAddress);
      } catch (error) {
        console.warn('Reverse geocoding failed, using fallback:', error);
      }
      
      onStartPointSelect(lat, lng, address);
      setManualLat('');
      setManualLng('');
      setShowSelector(false);
      setShowManualInput(false);
      setIsLoadingAddress(false);
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

  const handleButtonClick = () => {
    setShowSelector(!showSelector);
  };

  console.log({initialPoint})

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2.5 px-5 py-3 min-h-[52px] bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-teal-500/25 hover-glow text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="max-w-[150px] truncate">
          {initialPoint?.address || 'Punto de inicio'}
        </span>
      </button>

      {showSelector && (
        <div className="absolute top-full left-0 mt-3 w-96 bg-popover rounded-2xl shadow-2xl border border-border/50 p-4 z-50 animate-scale-in overflow-visible">
          {/* Modern header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Punto de inicio</h3>
              <p className="text-xs text-muted-foreground">Selecciona cómo definir tu ubicación</p>
            </div>
          </div>

          {/* Modern tabs */}
          <div className="flex bg-surface-muted p-1 rounded-xl mb-4">
            <button
              onClick={() => setActiveTab('gps')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'gps'
                  ? 'bg-gradient-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              GPS
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'search'
                  ? 'bg-gradient-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Buscar
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'manual'
                  ? 'bg-gradient-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual
            </button>
          </div>

          {/* GPS Tab */}
          {activeTab === 'gps' && (
            <div className="space-y-4">
              <button
                onClick={handleUseCurrentLocation}
                className="w-full flex items-center gap-4 p-4 text-left bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all duration-200"
                disabled={isLoadingAddress}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  {isLoadingAddress ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {isLoadingAddress ? 'Obteniendo dirección...' : 'Ubicación actual'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingAddress ? 'Revirtiendo coordenadas' : 'Usar GPS del dispositivo'}
                  </p>
                </div>
              </button>

              {gpsError && (
                <div className="p-4 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{gpsError}</p>
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
            <div className="space-y-4">
              <div>
                <label htmlFor="manual-lat" className="block text-xs font-semibold text-foreground mb-2">
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
                  className="w-full px-4 py-3 text-sm border border-border bg-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="manual-lng" className="block text-xs font-semibold text-foreground mb-2">
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
                  className="w-full px-4 py-3 text-sm border border-border bg-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {manualError && (
                <div className="p-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{manualError}</p>
                </div>
              )}

              <button
                onClick={handleManualSubmit}
                disabled={isLoadingAddress}
                className="w-full px-4 py-3 min-h-[48px] bg-gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 disabled:opacity-50"
              >
                {isLoadingAddress ? 'Obteniendo dirección...' : 'Confirmar coordenadas'}
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={closeSelector}
            className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
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
