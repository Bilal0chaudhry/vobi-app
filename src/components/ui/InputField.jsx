import React from 'react';

export default function InputField({ id, label, type = 'text', value, onChange, placeholder, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
          error 
            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
            : 'border-gray-200 focus:ring-brand-500/20 focus:border-brand-400'
        }`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
