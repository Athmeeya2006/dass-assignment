import React from 'react';

/**
 * Full-page wrapper with dark background and noise grain.
 * Usage: <PageShell> ... </PageShell>
 */
const PageShell = ({ children, className = '', noPadding = false }) => (
  <div className={`min-h-screen bg-ink text-text-primary noise-overlay ${className}`}>
    <div className={noPadding ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
      {children}
    </div>
  </div>
);

export default PageShell;
