import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './index';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('renders with medium size', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-6', 'h-6');
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });
});
