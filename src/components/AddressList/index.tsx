'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const statusColors = {
    pending: 'bg-muted text-muted-foreground',
    geocoding: 'bg-warning-light text-warning',
    geocoded: 'bg-success-light text-success',
    completed: 'bg-primary-light text-primary',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:bg-muted"
    >
      {/* Drag handle with accessibility */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none p-2 -m-2"
        aria-label="Reordenar dirección"
        role="button"
        tabIndex={0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Index number */}
      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Address content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate">
          {address.text}
        </p>
        {address.lat && address.lng && (
          <p className="text-xs text-muted-foreground">
            {address.lat.toFixed(4)}, {address.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[address.status]}`}>
        {address.status === 'pending' && 'Pendiente'}
        {address.status === 'geocoding' && 'Geocodificando'}
        {address.status === 'geocoded' && 'Geocodificada'}
        {address.status === 'completed' && 'Completada'}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(address.id)}
        className="flex-shrink-0 p-1 text-muted-foreground hover:text-error transition-colors"
        aria-label={`Eliminar dirección ${address.text}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface AddressListProps {
  onAddressesChange?: (addresses: Address[]) => void;
}

export const AddressList = forwardRef<AddressListRef, AddressListProps>(({ onAddressesChange }, ref) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-geocode pending addresses
  const { isGeocoding, geocodedCount, failedCount, currentAddress, geocodePendingAddresses } = useAutoGeocode();

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
      const newAddress: Address = {
        id: generateId(),
        text,
        lat,
        lng,
        status: lat && lng ? 'geocoded' : 'pending',
        createdAt: Date.now(),
      };

      await addressStorage.add(newAddress);
      const updated = [...addresses, newAddress];
      setAddresses(updated);
      onAddressesChange?.(updated);
    },
  }));

  // Load addresses from storage on mount
  useEffect(() => {
    const loadAddresses = async () => {
      setIsLoading(true);
      try {
        const stored = await addressStorage.getAll();
        setAddresses(stored);
        onAddressesChange?.(stored);
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

      const newAddresses = arrayMove(addresses, oldIndex, newIndex);

      // Update storage order
      for (const addr of newAddresses) {
        await addressStorage.update(addr.id, addr);
      }

      setAddresses(newAddresses);
      onAddressesChange?.(newAddresses);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Geocoding indicator */}
      {isGeocoding && (
        <div className="flex items-center gap-2 p-2 bg-warning-light border border-warning rounded-lg text-sm text-warning">
          <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
          <span className="flex-1">
            Geocodificando: {currentAddress || '...'}
          </span>
        </div>
      )}
      
      {/* Geocoding results summary */}
      {!isGeocoding && (geocodedCount > 0 || failedCount > 0) && (
        <div className="flex items-center gap-2 p-2 text-sm">
          {geocodedCount > 0 && (
            <span className="text-success">
              ✓ {geocodedCount} geocodificada{geocodedCount > 1 ? 's' : ''}
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-error">
              ✗ {failedCount} fallida{failedCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={geocodePendingAddresses}
            className="ml-auto text-primary hover:text-primary-hover text-xs underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No hay direcciones cargadas</p>
          <p className="text-sm mt-1">Agrega una dirección manualmente o con OCR</p>
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
            <div className="space-y-2">
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
