'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Address, addressStorage, generateId } from '@/lib/storage';
import { useAutoGeocode } from '@/hooks/useAutoGeocode';

export interface AddressListRef {
  addAddress: (text: string, lat?: number, lng?: number) => Promise<void>;
}

interface AddressItemProps {
  address: Address;
  index: number;
  onDelete: (id: string) => void;
}

function SortableAddressItem({ address, index, onDelete }: AddressItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: address.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const statusConfig = {
    pending: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-800/50',
      dot: 'bg-amber-500',
      label: 'Pendiente'
    },
    geocoding: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/60 dark:border-blue-800/50',
      dot: 'bg-blue-500 animate-pulse',
      label: 'Procesando'
    },
    geocoded: {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-200/60 dark:border-teal-800/50',
      dot: 'bg-teal-500',
      label: 'Geocodificada'
    },
    completed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-800/50',
      dot: 'bg-emerald-500',
      label: 'Completada'
    },
  };

  const status = statusConfig[address.status] || statusConfig.pending;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-3 p-3.5
        bg-surface border border-border/40 
        rounded-xl shadow-sm hover:shadow-lg 
        transition-all duration-300 ease-out
        hover:border-primary/30 hover:bg-primary/[0.02]
        hover:-translate-y-0.5
        ${isDragging ? 'shadow-xl ring-2 ring-primary/40 scale-[1.02] bg-primary/[0.03] border-primary/50' : ''}
      `}
    >
      {/* Drag handle - More visible */}
      <div
        {...attributes}
        {...listeners}
        className={`
          cursor-grab active:cursor-grabbing 
          text-muted-foreground/40 hover:text-primary/70 
          transition-all duration-200 p-1 -m-1 touch-none
          hover:bg-primary/5 rounded-lg
          ${isDragging ? 'text-primary/80' : ''}
        `}
        aria-label="Reordenar dirección"
        role="button"
        tabIndex={0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Index number - Refined gradient circle with better hierarchy */}
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-primary-hover text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
        {index + 1}
      </div>

      {/* Address content - Better typography hierarchy */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium truncate">
          {address.text}
        </p>
        {address.lat && address.lng && (
          <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">
            {address.lat.toFixed(5)}, {address.lng.toFixed(5)}
          </p>
        )}
      </div>

      {/* Status badge - Minimal dot style */}
      <div className={`
        flex items-center gap-2 px-2.5 py-1 
        text-xs font-medium rounded-md border
        ${status.bg} ${status.text} ${status.border}
        transition-all duration-200
      `}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        <span className="hidden sm:inline">{status.label}</span>
      </div>

      {/* Delete button - Always visible on mobile, hover on desktop */}
      <button
        onClick={() => onDelete(address.id)}
        className="flex-shrink-0 p-2 text-muted-foreground hover:text-error hover:bg-error-light/30 rounded-lg transition-all duration-200 md:opacity-0 md:group-hover:opacity-100"
        aria-label={`Eliminar dirección ${address.text}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

interface AddressListProps {
  onAddressesChange?: (addresses: Address[]) => void;
  scrollable?: boolean;
}

export const AddressList = forwardRef<AddressListRef, AddressListProps>(({ onAddressesChange, scrollable = false }, ref) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use refs to always have latest values
  const onAddressesChangeRef = useRef(onAddressesChange);
  const addressesRef = useRef(addresses);
  onAddressesChangeRef.current = onAddressesChange;
  addressesRef.current = addresses;
  
  // Auto-geocode pending addresses and refresh map when done
  const { isGeocoding, geocodedCount, failedCount, currentAddress, geocodePendingAddresses } = useAutoGeocode({
    onGeocodeComplete: () => {
      // Trigger the callback to refresh the map after geocoding completes
      // Use ref to get fresh addresses
      onAddressesChangeRef.current?.(addressesRef.current);
    },
  });

  // Configure sensors for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useImperativeHandle(ref, () => ({
    addAddress: async (text: string, lat?: number, lng?: number) => {
      // Get current length for order BEFORE updating
      const currentLength = addressesRef.current.length;
      
      const newAddress: Address = {
        id: generateId(),
        text,
        lat,
        lng,
        status: lat && lng ? 'geocoded' : 'pending',
        createdAt: Date.now(),
        order: currentLength,
      };
      
      // Add to storage first
      await addressStorage.add(newAddress);
      
      // Then update state
      setAddresses(prev => {
        const updated = [...prev, newAddress];
        onAddressesChange?.(updated);
        return updated;
      });
    },
  }));

  // Load addresses from storage on mount
  useEffect(() => {
    const loadAddresses = async () => {
      setIsLoading(true);
      try {
        const stored = await addressStorage.getAll();
        // Assign order if missing (for legacy data)
        const withOrder = stored.map((addr, idx) => ({
          ...addr,
          order: addr.order ?? idx,
        }));
        setAddresses(withOrder);
        onAddressesChange?.(withOrder);
      } catch (error) {
        console.error('Failed to load addresses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAddresses();
  }, [onAddressesChange]);

  const handleDelete = async (id: string) => {
    await addressStorage.delete(id);
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    onAddressesChange?.(updated);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = addresses.findIndex((addr) => addr.id === active.id);
      const newIndex = addresses.findIndex((addr) => addr.id === over.id);

      const newAddresses = arrayMove(addresses, oldIndex, newIndex).map((addr, idx) => ({
        ...addr,
        order: idx,
      }));

      // Update storage order
      for (const addr of newAddresses) {
        await addressStorage.update(addr.id, { order: addr.order });
      }

      setAddresses(newAddresses);
      onAddressesChange?.(newAddresses);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Skeleton loaders with shimmer - Refined */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3.5 bg-surface border border-border/30 rounded-xl"
          >
            {/* Drag handle skeleton */}
            <div className="w-5 h-5 bg-muted/50 rounded" />
            {/* Index number skeleton */}
            <div className="w-8 h-8 bg-muted/50 rounded-lg" />
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-3/4" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
            </div>
            {/* Status badge skeleton */}
            <div className="w-20 h-6 bg-muted/40 rounded-md" />
            {/* Delete button skeleton */}
            <div className="w-4 h-4 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${scrollable ? 'max-h-[calc(60vh-200px)] overflow-y-auto pr-1 -mr-1' : ''}`}>
      {/* Geocoding indicator - Refined style */}
      {isGeocoding && (
        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/40 rounded-xl text-sm">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="flex-1 text-amber-800 dark:text-amber-300">
            <span className="font-medium">Geocodificando:</span> <span className="text-amber-900 dark:text-amber-200">{currentAddress || '...'}</span>
          </span>
        </div>
      )}
      
      {/* Geocoding results summary - Subtle */}
      {!isGeocoding && (geocodedCount > 0 || failedCount > 0) && (
        <div className="flex items-center gap-4 p-3 text-sm bg-surface-muted/40 border border-border/30 rounded-xl">
          {geocodedCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {geocodedCount} geocodificada{geocodedCount > 1 ? 's' : ''}
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {failedCount} fallida{failedCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={geocodePendingAddresses}
            className="ml-auto text-primary/80 hover:text-primary text-xs font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center p-8 bg-gradient-to-b from-surface-muted/30 to-surface border border-border/30 rounded-2xl">
          {/* Enhanced empty state illustration */}
          <div className="w-24 h-24 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
            <div className="relative">
              {/* Animated ring */}
              <div className="absolute inset-0 w-16 h-16 border-2 border-primary/20 rounded-xl animate-ping" style={{ animationDuration: '3s' }} />
              {/* Main icon */}
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Friendly message */}
          <p className="text-foreground font-semibold text-lg mb-2">¿Sin direcciones todavía?</p>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">Agregá tu primera dirección para comenzar a planificar tu ruta</p>
          
          {/* Visual hint - subtle */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>Usá el formulario de arriba</span>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={addresses.map(a => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {addresses.map((address, index) => (
                <SortableAddressItem
                  key={address.id}
                  address={address}
                  index={index}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
});

AddressList.displayName = 'AddressList';
