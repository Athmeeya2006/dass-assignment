import React from 'react';

const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-1 overflow-x-auto scrollbar-hide ${className}`}>
    {tabs.map(({ key, label, icon: Icon, count }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`tab-pill flex items-center gap-1.5 whitespace-nowrap ${active === key ? 'active' : ''}`}
      >
        {Icon && <Icon size={12} />}
        {label}
        {count !== undefined && (
          <span className={`ml-1 text-[9px] px-1.5 py-0.5 ${
            active === key ? 'bg-ink/20 text-ink' : 'bg-border text-text-muted'
          }`}>
            {count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default Tabs;
