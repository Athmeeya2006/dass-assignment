import React from 'react';

const colorMap = {
  primary: 'border-accent-primary text-accent-primary',
  secondary: 'border-accent-secondary text-accent-secondary',
  tertiary: 'border-accent-tertiary text-accent-tertiary',
  success: 'border-success text-success',
  error: 'border-error text-error',
  muted: 'border-text-muted text-text-muted',
  white: 'border-text-primary text-text-primary',
};

const Badge = ({ children, color = 'primary', className = '' }) => (
  <span
    className={`
      inline-flex items-center gap-1
      font-mono text-[10px] uppercase tracking-[0.15em]
      px-2.5 py-1 border-l-[3px] bg-surface
      ${colorMap[color] || colorMap.primary}
      ${className}
    `}
  >
    {children}
  </span>
);

/** Dot badge - small pill with a dot indicator */
export const DotBadge = ({ children, color = 'primary', className = '' }) => {
  const dotColors = {
    primary: 'bg-accent-primary',
    secondary: 'bg-accent-secondary',
    tertiary: 'bg-accent-tertiary',
    success: 'bg-success',
    error: 'bg-error',
    muted: 'bg-text-muted',
  };
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-mono text-[10px] uppercase tracking-[0.1em]
        px-2.5 py-1 bg-surface border border-border text-text-secondary
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] || dotColors.primary}`} />
      {children}
    </span>
  );
};

export default Badge;
