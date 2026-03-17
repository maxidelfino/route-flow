import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Overlay } from './index';

describe('Overlay', () => {
  it('renders children when open', () => {
    render(
      <Overlay isOpen={true}>
        <div>Overlay content</div>
      </Overlay>
    );
    expect(screen.getByText('Overlay content')).toBeInTheDocument();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <Overlay isOpen={false}>
        <div>Hidden content</div>
      </Overlay>
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Overlay isOpen={true} onClose={onClose}>
        <div>Press Escape</div>
      </Overlay>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside', async () => {
    const onClose = vi.fn();
    render(
      <Overlay isOpen={true} onClose={onClose}>
        <div data-testid="overlay-content">Inside</div>
      </Overlay>
    );
    
    // Click on the backdrop (first child of the overlay container)
    const backdrop = document.querySelector('.bg-black\\/50');
    if (backdrop) {
      fireEvent.mouseDown(backdrop);
    }
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not call onClose when clicking inside content', () => {
    const onClose = vi.fn();
    render(
      <Overlay isOpen={true} onClose={onClose}>
        <div data-testid="overlay-content">Inside</div>
      </Overlay>
    );
    
    fireEvent.mouseDown(screen.getByTestId('overlay-content'));
    
    expect(onClose).not.toHaveBeenCalled();
  });
});
