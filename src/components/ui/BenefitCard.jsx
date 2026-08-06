import React from 'react';

export default function BenefitCard({ benefit }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 mb-2 last:mb-0">
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{benefit.name || 'Benefit'}</p>
      {benefit.coverageLevel && (
        <p className="text-[11px] text-gray-500">Level: {benefit.coverageLevel}</p>
      )}
      {benefit.amount != null && (
        <p className="text-[11px] text-gray-500">Amount: ${benefit.amount}</p>
      )}
      {benefit.percent != null && (
        <p className="text-[11px] text-gray-500">Percent: {benefit.percent}%</p>
      )}
      {benefit.inNetwork != null && (
        <p className="text-[11px] text-gray-500">
          Network: {benefit.inNetwork ? 'In-Network' : 'Out-of-Network'}
        </p>
      )}
    </div>
  );
}
