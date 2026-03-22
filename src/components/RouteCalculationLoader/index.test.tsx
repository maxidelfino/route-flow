import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteCalculationLoader } from './index';

describe('RouteCalculationLoader', () => {
  it('should not render when isVisible is false', () => {
    render(<RouteCalculationLoader isVisible={false} />);
    expect(screen.queryByText(/Calculando ruta óptima/)).not.toBeInTheDocument();
  });

  it('should render when isVisible is true', () => {
    render(<RouteCalculationLoader isVisible={true} />);
    expect(screen.getByText(/Calculando ruta óptima/)).toBeInTheDocument();
  });

  it('should show loading text', () => {
    render(<RouteCalculationLoader isVisible={true} />);
    expect(screen.getByText(/Calculando ruta óptima/)).toBeInTheDocument();
  });

  it('should show optimizing text', () => {
    render(<RouteCalculationLoader isVisible={true} />);
    expect(screen.getByText(/Optimizando orden de entregas/)).toBeInTheDocument();
  });
});
