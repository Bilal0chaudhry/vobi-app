import React from 'react';

export default function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-brand-600">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}
