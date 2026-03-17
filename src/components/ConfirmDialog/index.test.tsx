import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from './index';

describe('ConfirmDialog', () => {
  it('renders when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Hidden"
        message="Hidden message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows default labels', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('shows custom labels', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        message="Message"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        message="Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        message="Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        message="Message"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
