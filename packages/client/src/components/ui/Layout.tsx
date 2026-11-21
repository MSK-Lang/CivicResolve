import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  size?: 'reading' | 'standard' | 'full';
  className?: string;
}

export function PageContainer({
  children,
  size = 'standard',
  className = '',
}: PageContainerProps) {
  const sizeClasses = {
    reading: 'max-w-2xl mx-auto px-4 sm:px-6',
    standard: 'max-w-5xl mx-auto px-4 sm:px-6',
    full: 'w-full px-4 sm:px-6',
  };

  return (
    <div className={`py-6 sm:py-10 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
}

export interface ContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ContentGrid({
  children,
  columns = 3,
  className = '',
}: ContentGridProps) {
  const columnClasses = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  };

  return <div className={`${columnClasses[columns]} ${className}`}>{children}</div>;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Card({
  children,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`bg-surface rounded border border-border ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
