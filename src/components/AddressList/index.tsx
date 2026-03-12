'use client';

import { useState, useEffect } from 'react';
import { Address, addressStorage, generateId } from '@/lib/storage';

interface AddressItemProps {
  address: Address;
  index: number;
  onDelete: (id: string) => void;
}

function AddressItem({ address, index, onDelete }: AddressItemProps) {
  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    geocoding: 'bg-yellow-100 text-yellow-700',
    geocoded: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Drag handle */}
      <div className="cursor-grab text-gray-400 hover:text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Index number */}
      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Address content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {address.text}
        </p>
        {address.lat && address.lng && (
          <p className="text-xs text-gray-500">
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
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
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

export function AddressList({ onAddressesChange }: AddressListProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const newAddresses = [...addresses];
    const [removed] = newAddresses.splice(fromIndex, 1);
    newAddresses.splice(toIndex, 0, removed);
    
    // Update storage order
    for (const addr of newAddresses) {
      await addressStorage.update(addr.id, addr);
    }
    
    setAddresses(newAddresses);
    onAddressesChange?.(newAddresses);
  };

  const addAddress = async (text: string, lat?: number, lng?: number) => {
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addresses.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No hay direcciones cargadas</p>
          <p className="text-sm mt-1">Agrega una dirección manualmente o con OCR</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((address, index) => (
            <AddressItem
              key={address.id}
              address={address}
              index={index}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
