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
import { Address } from '@/lib/storage';
import { formatDuration } from '@/lib/format';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

type TabType = 'addresses' | 'ocr' | 'execution';

export default function Home() {
  const isOnline = useOnline();
  const { 
    state, 
    setStartPoint, 
    loadAddresses, 
    setPoints,
    calculateRoute, 
    startExecution, 
    completeCurrentPoint, 
    reset 
  } = useRoute();
  
  const [activeTab, setActiveTab] = useState<TabType>('addresses');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const addressListRef = useRef<AddressListRef>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routeMode, setRouteMode] = useState<'linear' | 'circular'>('circular');
  
  // Estimated times for both route modes
  const [routeTimes, setRouteTimes] = useState<{
    circular: { duration: number; distance: number } | null;
    linear: { duration: number; distance: number } | null;
  }>({ circular: null, linear: null });
  const [isCalculatingTimes, setIsCalculatingTimes] = useState(false);

  // Calculate route times for both modes
  const calculateBothRouteTimes = useCallback(async () => {
    if (!state.startPoint || state.points.length === 0) return;
    
    setIsCalculatingTimes(true);
    
    try {
      // Calculate both routes in parallel
      const [circularResult, linearResult] = await Promise.all([
        fetch('/api/route-optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: [state.startPoint!.lng, state.startPoint!.lat],
            points: state.points.map(p => ({ id: p.id, lat: p.lat, lng: p.lng })),
            mode: 'circular',
          }),
        }).then(r => r.json()).catch(() => null),
        fetch('/api/route-optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: [state.startPoint!.lng, state.startPoint!.lat],
            points: state.points.map(p => ({ id: p.id, lat: p.lat, lng: p.lng })),
            mode: 'linear',
          }),
        }).then(r => r.json()).catch(() => null),
      ]);
      
      setRouteTimes({
        circular: circularResult ? { 
          duration: circularResult.totalDuration, 
          distance: circularResult.totalDistance 
        } : null,
        linear: linearResult ? { 
          duration: linearResult.totalDuration, 
          distance: linearResult.totalDistance 
        } : null,
      });
    } catch (error) {
      console.error('Error calculating route times:', error);
    } finally {
      setIsCalculatingTimes(false);
    }
  }, [state.startPoint, state.points]);

  // Calculate times when route is ready and mode selector is shown
  useEffect(() => {
    if (state.status === 'ready' && state.startPoint && state.points.length > 0) {
      calculateBothRouteTimes();
    }
  }, [state.status, state.startPoint, state.points.length, calculateBothRouteTimes]);

  const handleAddressesChange = useCallback((_addresses: Address[]) => {
    setPoints(_addresses);
  }, [setPoints]);

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

  // Build route coordinates from polyline
  const routeCoords: [number, number][] = (state.polyline || []).map((coord) => {
    const [a, b] = coord;
    const aCouldBeLat = a >= -90 && a <= 90;
    const bCouldBeLat = b >= -90 && b <= 90;
    const aCouldBeLng = b >= -180 && b <= 180;
    
    if (!aCouldBeLat && aCouldBeLng && bCouldBeLat) {
      return [b, a] as [number, number];
    }
    return coord as [number, number];
  });
  
  // Fallback: build straight line route if no polyline available
  if (routeCoords.length === 0) {
    if (state.startPoint) {
      routeCoords.push([state.startPoint.lat, state.startPoint.lng]);
    }
    state.points.forEach(p => {
      routeCoords.push([p.lat, p.lng]);
    });
  }

  const mapCenter = state.startPoint 
    ? [state.startPoint.lat, state.startPoint.lng] as [number, number]
    : state.points.length > 0 
      ? [state.points[0].lat, state.points[0].lng] as [number, number]
      : undefined;

  const handleAddressSelect = async (address: string, lat?: number, lng?: number) => {
    try {
      await addressListRef.current?.addAddress(address, lat, lng);
      await loadAddresses();
      
      if (state.startPoint && state.points.length > 0 && state.status !== 'executing') {
        await calculateRoute(undefined, routeMode);
      }
    } catch {
      setError('Error al agregar dirección');
    }
  };

  const handleOCRTextExtracted = async (text: string, lat?: number, lng?: number) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Add each address from OCR text
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;
      
      // Use coordinates only for the first line (validated address)
      // For subsequent lines, coordinates need to be looked up separately
      const useCoords = i === 0 ? { lat, lng } : { lat: undefined, lng: undefined };
      
      try {
        if (!addressListRef.current) {
          setError('Error al agregar dirección: componente no disponible');
        } else {
          await addressListRef.current.addAddress(trimmedLine, useCoords.lat, useCoords.lng);
        }
      } catch (err) {
        console.error('[PAGE] Error adding OCR address:', err);
        setError('Error al agregar dirección');
      }
    }
    
    await loadAddresses();
    setActiveTab('addresses');
  };

  const handleCalculateRoute = async () => {
    if (!state.startPoint) {
      setError('⚠️ Selecciona un punto de inicio en el mapa');
      return;
    }
    if (state.points.length === 0) {
      setError('📍 Agrega al menos una dirección de destino');
      return;
    }
    setError(null);
    const result = await calculateRoute(undefined, routeMode);
    if (!result) {
      setError(state.error || '❌ Error al calcular la ruta. Verificá tu conexión e intentá de nuevo.');
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
    await completeCurrentPoint(currentPosition || undefined);
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    
    if (!state.startPoint) {
      setError('⚠️ Selecciona un punto de inicio en el mapa');
      setIsRetrying(false);
      return;
    }
    
    setIsRetrying(true);
    try {
      setError(null);
      const result = await calculateRoute(undefined, routeMode);
      if (!result) {
        setError(state.error || '❌ Error al calcular la ruta. Verificá tu conexión e intentá de nuevo.');
      }
    } catch {
      setError(state.error || '❌ Error al calcular la ruta. Verificá tu conexión e intentá de nuevo.');
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
      
      {/* Map Section - Modern rounded container */}
      <div className={`${isMobile ? 'h-[40vh]' : 'flex-1'} relative z-10 p-3 md:p-4`}>
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl border border-border/50">
          <Map
            center={mapCenter}
            zoom={14}
            markers={markers}
            route={routeCoords}
            currentPosition={currentPosition}
          />
        </div>
        
        {/* StartPointSelector overlay - desktop only */}
        {!isMobile && (
          <div className="absolute top-6 left-6 z-[1000] flex gap-3">
            <StartPointSelector
              onStartPointSelect={setStartPoint}
              initialPoint={state.startPoint || undefined}
            />
            <PWAInstallButton />
          </div>
        )}
      </div>

      {/* Control Panel - Glassmorphism */}
      <div className={`
        ${isMobile ? 'flex-1 flex flex-col' : 'w-[420px] flex flex-col overflow-y-auto'}
        glass-dark rounded-t-2xl md:rounded-none
        border-t-2 md:border-t-0 md:border-l border-border/30
        z-20
      `}>
        {/* Mobile: StartPointSelector at top */}
        {isMobile && (
          <div className="p-4 border-b border-border/30 bg-surface-muted/50">
            <StartPointSelector
              onStartPointSelect={setStartPoint}
              initialPoint={state.startPoint || undefined}
            />
          </div>
        )}

        {/* Error Toast with Retry */}
        {error && (
          <div className="p-4 pb-0">
            <ErrorToast
              message={error}
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          </div>
        )}

        {/* Mobile Tabs - Modern pill style */}
        {isMobile && (
          <div className="flex p-3 gap-2 bg-surface-muted/30 mx-4 mt-4 rounded-xl">
            <button
              onClick={() => setActiveTab('addresses')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'addresses' 
                  ? 'bg-gradient-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              Direcciones
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'ocr' 
                  ? 'bg-gradient-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              OCR
            </button>
            <button
              onClick={() => setActiveTab('execution')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'execution' 
                  ? 'bg-gradient-primary text-white shadow-md' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              }`}
            >
              Ejecutar
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className={`${isMobile ? 'h-[calc(60vh-140px)] min-h-0' : 'flex-1'} ${isMobile ? 'flex flex-col' : ''} ${isMobile ? 'overflow-hidden' : 'overflow-y-auto'} p-4 md:p-6`}>
          {/* Desktop: Always show all components in stacked layout */}
          {/* Mobile: Show only active tab */}
          
          <div className={`space-y-5 overflow-visible animate-slide-in ${isMobile && activeTab !== 'addresses' ? 'hidden' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Direcciones
                </h2>
                <p className="text-xs text-muted-foreground">
                  Agrega los puntos de entrega
                </p>
              </div>
            </div>
            
            <AddressInput
              onAddressSelect={handleAddressSelect}
              placeholder="Buscar dirección..."
            />

            {/* Always render AddressList so ref is available for OCR - hide on mobile when not active */}
            {/* Mobile: scrollable list to preserve map space */}
            <div className={isMobile ? 'flex-1 min-h-0 overflow-hidden' : ''}>
              <AddressList
                ref={addressListRef}
                onAddressesChange={handleAddressesChange}
                scrollable={isMobile}
                hasStartPoint={!!state.startPoint}
              />
            </div>
          </div>

          {(!isMobile || activeTab === 'ocr') && (
            <div className={`mt-8 animate-slide-in ${isMobile ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    OCR
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Escanear direcciones
                  </p>
                </div>
              </div>
              <OCRUploader onTextExtracted={handleOCRTextExtracted} />
            </div>
          )}

          {(state.status === 'completed') && (
            <div className="mt-8 animate-slide-in">
              <RouteSummary
                totalDuration={state.totalDuration}
                totalDistance={state.totalDistance}
                completedCount={state.points.length}
                onNewRoute={handleCancel}
              />
            </div>
          )}

          {(!isMobile || activeTab === 'execution') && showExecutionPanel && state.status !== 'completed' && (
            <div className={`mt-8 space-y-5 animate-slide-in ${isMobile ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-success flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Ejecutar
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Seguimiento en tiempo real
                  </p>
                </div>
              </div>

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
                route={routeCoords}
                onPositionUpdate={setCurrentPosition}
                onRecalculate={() => calculateRoute(undefined, routeMode)}
                nextPoint={state.points[state.currentIndex + 1] || null}
                routeMode={routeMode}
                onRouteModeChange={setRouteMode}
                routeTimes={routeTimes}
                isCalculatingTimes={isCalculatingTimes}
              />
            </div>
          )}
        </div>

        {/* Calculate Route Button - Premium styling */}
        {/* Only show on execution tab for mobile */}
        {(isMobile ? (activeTab === 'execution' && state.status === 'ready') : state.status === 'ready') && (
          <div className="p-4 md:p-6 border-t border-border/30 bg-surface-muted/30">
            <button
              onClick={handleStartExecution}
              className="w-full py-4 min-h-[56px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-teal-500/25 hover-glow flex items-center justify-center gap-3 text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Iniciar Recorrido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
