import React from 'react';

export default function CptBadge({ code }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
      {code}
    </span>
  );
}
