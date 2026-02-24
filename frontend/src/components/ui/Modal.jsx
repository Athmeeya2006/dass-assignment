import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, className = '', wide = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal content */}
      <div
        className={`
          relative bg-surface border border-border
          ${wide ? 'max-w-2xl' : 'max-w-md'} w-full mx-4
          p-0 animate-slide-in z-10
          max-h-[85vh] overflow-y-auto
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <h3 className="font-heading text-lg text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
