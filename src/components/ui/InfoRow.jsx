import React from 'react';

export default function InfoRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 text-right font-medium">{String(value)}</span>
    </div>
  );
}
