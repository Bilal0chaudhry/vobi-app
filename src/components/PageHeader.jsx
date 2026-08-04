import React from 'react';
import { IconPlus } from './icons';

export default function PageHeader({ title, subtitle, onNewVerification, buttonId = 'btn-new-verification' }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {onNewVerification && (
        <button
          id={buttonId}
          onClick={onNewVerification}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30 transition-all duration-200 active:scale-[0.97]"
        >
          <IconPlus />
          New Verification
        </button>
      )}
    </div>
  );
}
