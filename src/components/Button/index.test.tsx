import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './index';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders with default variant (primary)', () => {
    const { container } = render(<Button>Test</Button>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('renders with secondary variant', () => {
    const { container } = render(<Button variant="secondary">Test</Button>);
    expect(container.firstChild).toHaveClass('bg-secondary');
  });

  it('renders with outline variant', () => {
    const { container } = render(<Button variant="outline">Test</Button>);
    expect(container.firstChild).toHaveClass('border');
  });

  it('renders with danger variant', () => {
    const { container } = render(<Button variant="danger">Test</Button>);
    expect(container.firstChild).toHaveClass('bg-error');
  });

  it('renders with success variant', () => {
    const { container } = render(<Button variant="success">Test</Button>);
    expect(container.firstChild).toHaveClass('bg-success');
  });

  it('renders with small size', () => {
    const { container } = render(<Button size="sm">Test</Button>);
    expect(container.firstChild).toHaveClass('min-h-[36px]');
  });

  it('renders with large size', () => {
    const { container } = render(<Button size="lg">Test</Button>);
    expect(container.firstChild).toHaveClass('min-h-[52px]');
  });

  it('disables button when disabled', () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when loading', () => {
    render(<Button isLoading>Test</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button isLoading>Test</Button>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
