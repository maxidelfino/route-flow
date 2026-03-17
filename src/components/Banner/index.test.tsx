import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Banner } from './index';

describe('Banner', () => {
  it('renders children when visible', () => {
    render(
      <Banner isVisible={true}>
        Test message
      </Banner>
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('returns null when not visible', () => {
    const { container } = render(
      <Banner isVisible={false}>
        Hidden message
      </Banner>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with default variant (info)', () => {
    const { container } = render(
      <Banner>Info message</Banner>
    );
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });

  it('renders with warning variant', () => {
    const { container } = render(
      <Banner variant="warning">Warning</Banner>
    );
    expect(container.firstChild).toHaveClass('bg-amber-500');
  });

  it('renders with error variant', () => {
    const { container } = render(
      <Banner variant="error">Error</Banner>
    );
    expect(container.firstChild).toHaveClass('bg-error-light');
  });

  it('renders with accent variant', () => {
    const { container } = render(
      <Banner variant="accent">Accent</Banner>
    );
    expect(container.firstChild).toHaveClass('bg-accent');
  });

  it('renders with icon when provided', () => {
    render(
      <Banner icon={<span data-testid="icon">⚠️</span>}>
        With icon
      </Banner>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Banner className="custom-class">Custom</Banner>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
