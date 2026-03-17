import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorToast } from './index';

describe('ErrorToast', () => {
  it('renders error message', () => {
    render(<ErrorToast message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders without retry button when no handler provided', () => {
    render(<ErrorToast message="Error" />);
    expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
  });

  it('renders retry button when handler provided', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} />);
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorToast message="Error" onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows "Reintentando..." when isRetrying is true', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} isRetrying={true} />);
    expect(screen.getByText('Reintentando...')).toBeInTheDocument();
  });

  it('disables retry button when isRetrying is true', () => {
    render(<ErrorToast message="Error" onRetry={() => {}} isRetrying={true} />);
    const button = screen.getByText('Reintentando...').closest('button');
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(<ErrorToast message="Error" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
