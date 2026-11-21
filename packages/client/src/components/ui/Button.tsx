import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'action' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  // Base classes enforce minimum 44px touch target, visible focus ring, and reduced motion safety
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors select-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-800 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none';

  const sizeClasses = {
    sm: 'text-xs min-h-[44px] min-w-[44px] px-3 py-2 gap-1.5',
    md: 'text-sm min-h-[44px] min-w-[44px] px-4 py-2.5 gap-2',
    lg: 'text-base min-h-[48px] min-w-[48px] px-6 py-3 gap-2.5 font-semibold',
  };

  const variantClasses = {
    // Primary: Deep civic green (10.5:1 contrast against warm paper)
    primary: 'bg-civic-800 text-white hover:bg-civic-700 active:bg-civic-900 border border-transparent',
    // Action: High-contrast terracotta (6.5:1 contrast against warm paper)
    action: 'bg-terracotta-700 text-white hover:bg-terracotta-600 active:bg-terracotta-800 border border-transparent shadow-tactile',
    // Secondary: Warm paper surface with strong border
    secondary: 'bg-paper-subtle text-ink-primary border border-border-strong hover:bg-paper-muted active:bg-paper-subtle',
    // Destructive: Solid high-contrast red
    destructive: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-transparent',
    // Ghost: Transparent with deep green text
    ghost: 'bg-transparent text-civic-800 hover:bg-civic-50 active:bg-civic-100 border border-transparent',
  };

  const isActuallyDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      disabled={isActuallyDisabled}
      aria-busy={isLoading ? true : undefined}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <Loader2
          className="w-4 h-4 animate-spin text-current motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
