'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRoute } from '@/hooks/useRoute';
import { useOnline } from '@/hooks/useOnline';
import { AddressInput } from '@/components/AddressInput';
import { AddressList, AddressListRef } from '@/components/AddressList';
import { OCRUploader } from '@/components/OCRUploader';
import { ExecutionPanel } from '@/components/ExecutionPanel';
import { RouteInfo } from '@/components/RouteInfo';
import { StartPointSelector } from '@/components/StartPointSelector';
import { MapMarker } from '@/components/Map';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorToast } from '@/components/ErrorToast';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { RouteSummary } from '@/components/RouteSummary';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

type TabType = 'addresses' | 'ocr' | 'execution';

export default function Home() {
  const isOnline = useOnline();
  const { 
    state, 
    setStartPoint, 
    loadAddresses, 
    calculateRoute, 
    startExecution, 
    completeCurrentPoint, 
    reset 
  } = useRoute();
  
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const addressListRef = useRef<AddressListRef>(null);

  const handleAddressesChange = useCallback(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Build markers array: start point first, then delivery points
  const markers: MapMarker[] = [
    // Start point marker (if set)
    ...(state.startPoint ? [{
      id: 'start-point',
      lat: state.startPoint.lat,
      lng: state.startPoint.lng,
      label: state.startPoint.address || 'Punto 0',
      status: 'start' as const,
    }] : []),
    // Delivery point markers
    ...state.points.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      label: p.address,
      status: p.status === 'completed' ? 'completed' as const : p.status === 'current' ? 'active' as const : 'pending' as const,
    })),
  ];

  // Build route coordinates from startPoint + points in order (straight lines)
  const routeCoords: [number, number][] = [];
  
  // Add start point first if exists
  if (state.startPoint) {
    routeCoords.push([state.startPoint.lng, state.startPoint.lat]);
  }
  
  // Add each point in order
  state.points.forEach(p => {
    routeCoords.push([p.lng, p.lat]);
  });

  const mapCenter = state.startPoint 
    ? [state.startPoint.lat, state.startPoint.lng] as [number, number]
    : state.points.length > 0 
      ? [state.points[0].lat, state.points[0].lng] as [number, number]
      : undefined;

  const handleAddressSelect = async (address: string, lat?: number, lng?: number) => {
    try {
      await addressListRef.current?.addAddress(address, lat, lng);
      await loadAddresses();
    } catch {
      setError('Error al agregar dirección');
    }
  };

  const handleOCRTextExtracted = async (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        await addressListRef.current?.addAddress(line.trim());
      } catch {
        console.error('Error adding OCR address');
      }
    }
    await loadAddresses();
    setActiveTab('addresses');
  };

  const handleCalculateRoute = async () => {
    if (!state.startPoint) {
      setError('Selecciona un punto de inicio');
      return;
    }
    setError(null);
    const result = await calculateRoute();
    if (!result) {
      setError(state.error || 'Error al calcular ruta');
    }
  };

  const handleStartExecution = () => {
    startExecution();
    setActiveTab('execution');
  };

  const handleCancel = () => {
    reset();
    setActiveTab('addresses');
    loadAddresses();
  };

  const handleComplete = async () => {
    await completeCurrentPoint();
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      await loadAddresses();
      setError(null);
    } catch {
      // Error will be set by loadAddresses
    } finally {
      setIsRetrying(false);
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showExecutionPanel = state.status !== 'idle' && state.status !== 'loading';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}
      
      {/* Map Section */}
      <div className={`${isMobile ? 'h-[40vh]' : 'flex-1'} relative`}>
        <Map
          center={mapCenter}
          zoom={14}
          markers={markers}
          route={routeCoords}
        />
        
        {/* StartPointSelector overlay - desktop only */}
        {!isMobile && (
          <div className="absolute top-4 left-4 z-[1000] flex gap-2">
            <StartPointSelector
              onStartPointSelect={setStartPoint}
              initialPoint={state.startPoint || undefined}
            />
            <PWAInstallButton />
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className={`
        ${isMobile ? 'flex-1 flex flex-col' : 'w-96 flex flex-col'}
        bg-surface border-l border-border
      `}>
        {/* Mobile: StartPointSelector at top */}
        {isMobile && (
          <div className="p-3 border-b border-border">
            <StartPointSelector
              onStartPointSelect={setStartPoint}
              initialPoint={state.startPoint || undefined}
            />
          </div>
        )}

        {/* Error Toast with Retry */}
        {error && (
          <ErrorToast
            message={error}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        )}

        {/* Mobile Tabs */}
        {isMobile && (
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('addresses')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'addresses' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              Direcciones
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'ocr' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              OCR
            </button>
            <button
              onClick={() => setActiveTab('execution')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'execution' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              Ejecutar
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Desktop: Always show all components in stacked layout */}
          {/* Mobile: Show only active tab */}
          
          {(!isMobile || activeTab === 'addresses') && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Agregar Direcciones
              </h2>
              
              <AddressInput
                onAddressSelect={handleAddressSelect}
                placeholder="Buscar dirección..."
              />

              <AddressList
                ref={addressListRef}
                onAddressesChange={handleAddressesChange}
              />
            </div>
          )}

          {(!isMobile || activeTab === 'ocr') && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                OCR
              </h2>
              <OCRUploader onTextExtracted={handleOCRTextExtracted} />
            </div>
          )}

          {(state.status === 'completed') && (
            <div className="mt-6">
              <RouteSummary
                totalDuration={state.totalDuration}
                totalDistance={state.totalDistance}
                completedCount={state.points.length}
                onNewRoute={handleCancel}
              />
            </div>
          )}

          {(!isMobile || activeTab === 'execution') && showExecutionPanel && state.status !== 'completed' && (
            <div className="mt-6 space-y-4">
              <RouteInfo
                currentPoint={state.points[state.currentIndex] || null}
                nextPoint={state.points[state.currentIndex + 1] || null}
                totalDuration={state.totalDuration}
                totalDistance={state.totalDistance}
                completedCount={state.currentIndex}
                totalCount={state.points.length}
              />

              <ExecutionPanel
                isActive={state.status === 'executing'}
                onComplete={handleComplete}
                onCancel={handleCancel}
                onAddStop={() => setActiveTab('addresses')}
              />
            </div>
          )}
        </div>

        {/* Calculate Route Button */}
        {state.status === 'ready' && (
          <div className="p-4 border-t border-border">
            <button
              onClick={handleStartExecution}
              className="w-full py-3 min-h-[44px] bg-success text-success-foreground font-medium rounded-lg hover:bg-success-hover transition-colors"
            >
              Iniciar Recorrido
            </button>
          </div>
        )}

        {state.points.length > 0 && state.status !== 'ready' && state.status !== 'executing' && state.status !== 'completed' && (
          <div className="p-4 border-t border-border">
            <button
              onClick={handleCalculateRoute}
              disabled={state.status === 'loading'}
              className="w-full py-3 min-h-[44px] bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {state.status === 'loading' ? (
                <>
                  <LoadingSpinner size="sm" />
                  Calculando ruta...
                </>
              ) : (
                'Calcular Ruta'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
