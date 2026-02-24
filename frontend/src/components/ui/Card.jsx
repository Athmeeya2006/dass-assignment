import React from 'react';

const Card = ({
  children,
  className = '',
  hover = false,
  glow = false,
  noPadding = false,
  onClick,
  ...props
}) => (
  <div
    onClick={onClick}
    className={`
      bg-surface border border-border
      ${hover ? 'card-hover cursor-pointer' : ''}
      ${glow ? 'shadow-[0_0_30px_rgba(232,255,0,0.04)]' : ''}
      ${noPadding ? '' : 'p-6'}
      ${onClick ? 'cursor-pointer' : ''}
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

/** Accent bar on left side */
const colorMap = {
  'accent-primary': 'border-l-accent-primary',
  'accent-secondary': 'border-l-accent-secondary',
  'accent-tertiary': 'border-l-accent-tertiary',
  'success': 'border-l-success',
  'error': 'border-l-error',
  'text-muted': 'border-l-text-muted',
};

export const AccentCard = ({ children, color = 'accent-primary', className = '', ...props }) => (
  <div
    className={`bg-surface border border-border border-l-[3px] ${colorMap[color] || 'border-l-accent-primary'} p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
);

/** Stat card - big number + label */
export const StatCard = ({ value, label, icon, className = '' }) => (
  <Card className={`flex items-start justify-between ${className}`}>
    <div>
      <div className="stat-number">{value}</div>
      <div className="stat-label mt-1">{label}</div>
    </div>
    {icon && <div className="text-text-muted">{icon}</div>}
  </Card>
);

export default Card;
