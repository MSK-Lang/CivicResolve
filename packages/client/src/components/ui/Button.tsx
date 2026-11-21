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
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded transition-all duration-150 ease-out select-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
    'active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
    'motion-reduce:transition-none motion-reduce:transform-none';

  const sizeClasses = {
    sm: 'text-xs min-h-[44px] min-w-[44px] px-3 py-1.5 gap-1.5',
    md: 'text-sm min-h-[44px] min-w-[44px] px-4 py-2 gap-2',
    lg: 'text-sm min-h-[44px] min-w-[44px] px-5 py-2.5 gap-2 font-medium',
  };

  const variantClasses = {
    primary: 'bg-[#242522] text-[#F6F5F0] hover:bg-[#111110] hover:shadow-subtle active:bg-black border border-transparent',
    action: 'bg-accent text-white hover:bg-accent-hover hover:shadow-subtle active:bg-[#4E362D] border border-transparent',
    secondary: 'bg-surface text-ink-primary border border-border hover:bg-surface-subtle hover:border-ink-secondary/30 active:bg-surface-muted',
    destructive: 'bg-[#8A2222] text-white hover:bg-[#6E1A1A] active:bg-[#521313] border border-transparent',
    ghost: 'bg-transparent text-ink-primary hover:bg-surface-subtle active:bg-surface-muted border border-transparent',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
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
