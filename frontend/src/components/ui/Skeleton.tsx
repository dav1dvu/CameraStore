import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClasses = 'bg-vintage-sepia-200 animate-pulse';
  const variantClasses = 
    variant === 'circle' ? 'rounded-full' :
    variant === 'text' ? 'rounded h-4 w-3/4 my-2' :
    'rounded-xl';

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${className}`}
      data-testid="skeleton"
    />
  );
};
