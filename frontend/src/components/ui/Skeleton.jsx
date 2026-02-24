import React from 'react';

const Skeleton = ({ className = '', lines = 1, variant = 'text' }) => {
  if (variant === 'card') {
    return (
      <div className={`skeleton bg-surface border border-border p-6 ${className}`}>
        <div className="h-4 bg-border/50 w-3/4 mb-4" />
        <div className="h-3 bg-border/50 w-1/2 mb-3" />
        <div className="h-3 bg-border/50 w-full mb-3" />
        <div className="h-8 bg-border/50 w-1/3 mt-4" />
      </div>
    );
  }
  if (variant === 'avatar') {
    return <div className={`skeleton w-10 h-10 rounded-full bg-surface ${className}`} />;
  }
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 bg-surface"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

/** Full-page loading state */
export const PageLoader = () => (
  <div className="min-h-screen bg-ink flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">Loading</p>
    </div>
  </div>
);

/** Card skeleton grid */
export const CardSkeletonGrid = ({ count = 6, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="card" />
    ))}
  </div>
);

export default Skeleton;
