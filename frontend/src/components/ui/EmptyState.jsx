import React from 'react';

const EmptyState = ({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
    {Icon && (
      <div className="mb-4 text-text-muted/30">
        <Icon size={56} strokeWidth={1} />
      </div>
    )}
    <h3 className="font-heading text-lg text-text-secondary mb-1">{title}</h3>
    {description && (
      <p className="font-mono text-[12px] text-text-muted max-w-xs">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
