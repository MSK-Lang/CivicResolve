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
    // 640px focused single-column for citizen submissions
    reading: 'max-w-xl mx-auto px-4 sm:px-6',
    // 1280px standard multi-column container
    standard: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    // Full width with edge padding for complex admin data grids
    full: 'w-full px-4 sm:px-6 lg:px-8',
  };

  return (
    <div className={`py-6 sm:py-8 ${sizeClasses[size]} ${className}`}>
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
    1: 'grid grid-cols-1 gap-6',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
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
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`bg-paper-card rounded-lg border border-border-subtle shadow-tactile ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  badge,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 ${className}`}>
      <div>
        {badge && <div className="mb-2">{badge}</div>}
        <h2 className="text-xl sm:text-2xl font-bold text-ink-primary tracking-tight font-serif">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-ink-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
