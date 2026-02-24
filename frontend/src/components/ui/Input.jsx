import React from 'react';

const Input = ({
  label,
  icon,
  error,
  className = '',
  containerClass = '',
  ...props
}) => (
  <div className={`relative ${containerClass}`}>
    {label && (
      <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-text-muted">
          {icon}
        </span>
      )}
      <input
        className={`
          input-brutal
          ${icon ? 'pl-7' : ''}
          ${error ? 'border-error' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
    {error && (
      <p className="mt-1 text-[11px] font-mono text-error">{error}</p>
    )}
  </div>
);

export const TextArea = ({ label, error, className = '', ...props }) => (
  <div>
    {label && (
      <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">
        {label}
      </label>
    )}
    <textarea
      className={`
        font-mono text-sm bg-transparent border-0 border-b-2 border-border
        text-text-primary w-full p-3 resize-none
        focus:outline-none focus:border-accent-primary transition-colors
        placeholder:text-text-muted
        ${error ? 'border-error' : ''}
        ${className}
      `}
      {...props}
    />
    {error && (
      <p className="mt-1 text-[11px] font-mono text-error">{error}</p>
    )}
  </div>
);

export const Select = ({ label, children, className = '', ...props }) => (
  <div>
    {label && (
      <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary mb-2">
        {label}
      </label>
    )}
    <select
      className={`
        font-mono text-sm bg-transparent border-b-2 border-border
        text-text-primary py-3 w-full
        focus:outline-none focus:border-accent-primary transition-colors
        appearance-none cursor-pointer
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  </div>
);

export default Input;
