'use client';

import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Enable hover effect with shadow */
  hoverable?: boolean;
  /** Additional padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Reusable Card component with consistent styling
 */
export function Card({ 
  children, 
  className = '', 
  hoverable = false,
  padding = 'md' 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-card rounded-lg border border-border/50 shadow-sm
        ${hoverable ? 'hover:shadow-lg transition-all duration-200 cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Card header component
 */
export function CardHeader({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card title component
 */
export function CardTitle({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <h3 className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </h3>
  );
}

/**
 * Card description component
 */
export function CardDescription({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <p className={`text-sm text-muted-foreground mt-1 ${className}`}>
      {children}
    </p>
  );
}

/**
 * Card content component
 */
export function CardContent({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Card footer component
 */
export function CardFooter({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`mt-4 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
}
