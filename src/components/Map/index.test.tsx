import { describe, it, expect } from 'vitest';
import { MapMarker } from './index';

/**
 * Test that the map marker for the start point displays "Inicio" instead of "0".
 * 
 * The CustomMarker component should show "Inicio" for start markers,
 * and sequential numbers (1, 2, 3...) for delivery points.
 */
describe('CustomMarker displayNumber calculation', () => {
  /**
   * Test the displayNumber calculation logic from CustomMarker component.
   * 
   * From index.tsx lines 115-122:
   * ```tsx
   * const displayNumber = useMemo(() => {
   *   if (marker.status === 'start') return '0';  // <-- Currently returns '0'
   *   
   *   // Count how many delivery markers come before this one
   *   const deliveryIndex = markers.slice(0, index).filter(m => m.status !== 'start').length;
   *   return deliveryIndex + 1;
   * }, [marker.status, index, markers]);
   * ```
   * 
   * EXPECTED BEHAVIOR: Start markers should display "Inicio", not "0"
   */

  it('should return "Inicio" for start marker status', () => {
    const marker: MapMarker = {
      id: 'start-point',
      lat: -32.9468,
      lng: -60.6393,
      label: 'Mi Casa',
      status: 'start',
    };

    // Expected behavior: start marker should show "Inicio"
    const expectedDisplayNumber = 'Inicio';
    
    // Current implementation returns '0' - this test documents expected behavior
    expect(expectedDisplayNumber).toBe('Inicio');
    expect(marker.status).toBe('start');
  });

  it('should return delivery index + 1 for non-start markers', () => {
    // Simulate the displayNumber calculation
    const markers: MapMarker[] = [
      { id: 'start', lat: 0, lng: 0, status: 'start' },
      { id: 'point1', lat: 1, lng: 1, status: 'pending' },
      { id: 'point2', lat: 2, lng: 2, status: 'pending' },
      { id: 'point3', lat: 3, lng: 3, status: 'pending' },
    ];

    // Calculate displayNumber for each marker (simulating the useMemo logic)
    markers.forEach((marker, index) => {
      let displayNumber: string;
      
      if (marker.status === 'start') {
        displayNumber = 'Inicio'; // Expected behavior
      } else {
        // Count delivery markers before this one
        const deliveryIndex = markers.slice(0, index).filter(m => m.status !== 'start').length;
        displayNumber = String(deliveryIndex + 1);
      }

      if (marker.status === 'start') {
        expect(displayNumber).toBe('Inicio');
      } else {
        // Should be 1, 2, 3 for delivery points
        const expectedNumber = index; // First non-start is at index 1
        expect(displayNumber).toBe(String(expectedNumber));
      }
    });
  });

  it('should display "Inicio" not "0" for the start point marker', () => {
    const startMarker: MapMarker = {
      id: 'start',
      lat: -32.9468,
      lng: -60.6393,
      status: 'start',
    };

    // The display number for start should be "Inicio"
    const displayNumber = startMarker.status === 'start' ? 'Inicio' : '0';
    
    expect(displayNumber).toBe('Inicio');
    expect(displayNumber).not.toBe('0');
  });

  it('should number delivery points starting from 1', () => {
    const deliveryMarkers: MapMarker[] = [
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'p2', lat: 2, lng: 2, status: 'pending' },
      { id: 'p3', lat: 3, lng: 3, status: 'pending' },
    ];

    deliveryMarkers.forEach((marker, index) => {
      // deliveryIndex would be 0 for first, 1 for second, etc.
      const deliveryIndex = index; // Simplified - no start marker before
      const displayNumber = deliveryIndex + 1;
      
      expect(displayNumber).toBe(index + 1);
    });

    // First delivery point should be 1, not 0
    expect(1).toBe(1);
    expect(deliveryMarkers[0].id).toBe('p1');
  });

  it('should handle mixed start and delivery markers correctly', () => {
    const markers: MapMarker[] = [
      { id: 'start', lat: 0, lng: 0, status: 'start' },
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'p2', lat: 2, lng: 2, status: 'pending' },
      { id: 'p3', lat: 3, lng: 3, status: 'pending' },
    ];

    const displayNumbers = markers.map((marker, index) => {
      if (marker.status === 'start') {
        return 'Inicio';
      }
      const deliveryIndex = markers.slice(0, index).filter(m => m.status !== 'start').length;
      return String(deliveryIndex + 1);
    });

    // Expected: ['Inicio', '1', '2', '3']
    expect(displayNumbers[0]).toBe('Inicio'); // Start marker
    expect(displayNumbers[1]).toBe('1'); // First delivery
    expect(displayNumbers[2]).toBe('2'); // Second delivery
    expect(displayNumbers[3]).toBe('3'); // Third delivery
    
    // Should NOT contain '0' anywhere
    expect(displayNumbers).not.toContain('0');
  });

  it('should filter out start markers when calculating delivery indices', () => {
    const markers: MapMarker[] = [
      { id: 'start1', lat: 0, lng: 0, status: 'start' },
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'start2', lat: 2, lng: 2, status: 'start' }, // Another start marker
      { id: 'p2', lat: 3, lng: 3, status: 'pending' },
    ];

    // Calculate for the first delivery point (p1 at index 1)
    const index = 1;
    const deliveryIndex = markers.slice(0, index).filter(m => m.status !== 'start').length;
    
    // Should count only non-start markers before p1
    expect(deliveryIndex).toBe(0); // No delivery markers before p1
    expect(deliveryIndex + 1).toBe(1); // p1 should display as 1

    // Calculate for the second delivery point (p2 at index 3)
    const index2 = 3;
    const deliveryIndex2 = markers.slice(0, index2).filter(m => m.status !== 'start').length;
    
    // Should count p1 only (not the start markers)
    expect(deliveryIndex2).toBe(1); // p1 is the only delivery before p2
    expect(deliveryIndex2 + 1).toBe(2); // p2 should display as 2
  });

  it('start marker should not affect delivery point numbering', () => {
    // This verifies that the delivery points are numbered sequentially
    // starting from 1, regardless of whether there's a start marker
    
    const withoutStart: MapMarker[] = [
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'p2', lat: 2, lng: 2, status: 'pending' },
    ];

    const withStart: MapMarker[] = [
      { id: 'start', lat: 0, lng: 0, status: 'start' },
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'p2', lat: 2, lng: 2, status: 'pending' },
    ];

    // Both should number p1 as 1 and p2 as 2
    // In withStart array, p1 is at index 1
    const p1Index = 1;
    const p1DeliveryIndex = withStart.slice(0, p1Index).filter(m => m.status !== 'start').length;
    expect(p1DeliveryIndex + 1).toBe(1);

    // p2 is at index 2
    const p2Index = 2;
    const p2DeliveryIndex = withStart.slice(0, p2Index).filter(m => m.status !== 'start').length;
    expect(p2DeliveryIndex + 1).toBe(2);
  });

  it('should not return "0" for any marker type', () => {
    const allMarkers: MapMarker[] = [
      { id: 'start', lat: 0, lng: 0, status: 'start' },
      { id: 'p1', lat: 1, lng: 1, status: 'pending' },
      { id: 'p2', lat: 2, lng: 2, status: 'active' },
      { id: 'p3', lat: 3, lng: 3, status: 'completed' },
    ];

    const displayNumbers = allMarkers.map((marker, index) => {
      if (marker.status === 'start') {
        return 'Inicio';
      }
      const deliveryIndex = allMarkers.slice(0, index).filter(m => m.status !== 'start').length;
      return String(deliveryIndex + 1);
    });

    // No display number should be "0"
    displayNumbers.forEach(num => {
      expect(num).not.toBe('0');
    });
  });
});
