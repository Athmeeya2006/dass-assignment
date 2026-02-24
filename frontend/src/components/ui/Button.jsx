import React from 'react';

const variants = {
  primary:
    'bg-accent-primary text-ink hover:shadow-[0_0_20px_rgba(232,255,0,0.4)]',
  ghost:
    'bg-transparent text-text-secondary border border-border hover:border-accent-primary hover:text-accent-primary',
  danger:
    'bg-transparent text-error border border-error/30 hover:bg-error/10 hover:border-error',
  secondary:
    'bg-surface text-text-primary border border-border hover:border-text-muted',
  accent:
    'bg-accent-secondary text-white hover:shadow-[0_0_20px_rgba(255,60,172,0.4)]',
  tertiary:
    'bg-accent-tertiary text-ink hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]',
};

const sizes = {
  xs: 'px-3 py-1.5 text-[10px]',
  sm: 'px-4 py-2 text-[11px]',
  md: 'px-6 py-3 text-[13px]',
  lg: 'px-8 py-4 text-sm',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center gap-2
        font-mono font-semibold uppercase tracking-wider
        transition-all duration-200 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export default Button;
