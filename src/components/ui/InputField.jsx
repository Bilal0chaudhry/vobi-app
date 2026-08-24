import React from 'react';

export default function InputField({ id, label, type = 'text', value, onChange, placeholder, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 bg-surface-inset border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 transition-all ${
          error 
            ? 'border-status-danger focus:ring-status-danger focus:border-status-danger' 
            : 'border-border focus:ring-accent-subtle focus:border-accent'
        }`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-status-danger-text">{error}</p>}
    </div>
  );
}
