import React from 'react';

export default function Select({ id, label, value, onChange, options }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>}
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2.5 bg-surface-inset border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent transition-all appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        }}
      >
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    </div>
  );
}
