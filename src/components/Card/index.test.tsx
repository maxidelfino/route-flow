import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './index';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding', () => {
    const { container } = render(<Card>Test</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('applies custom padding', () => {
    const { container } = render(<Card padding="lg">Test</Card>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('applies no padding', () => {
    const { container } = render(<Card padding="none">Test</Card>);
    expect(container.firstChild).not.toHaveClass('p-');
  });

  it('applies hoverable styles', () => {
    const { container } = render(<Card hoverable>Test</Card>);
    expect(container.firstChild).toHaveClass('hover:shadow-lg');
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });
});

describe('CardTitle', () => {
  it('renders with heading styles', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    expect(container.firstChild).toHaveClass('text-lg');
    expect(container.firstChild).toHaveClass('font-semibold');
  });
});

describe('CardDescription', () => {
  it('renders with muted text styles', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    expect(container.firstChild).toHaveClass('text-sm');
    expect(container.firstChild).toHaveClass('text-muted-foreground');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders with border', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    expect(container.firstChild).toHaveClass('border-t');
  });
});
