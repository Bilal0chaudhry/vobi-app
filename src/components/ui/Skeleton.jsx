import React from 'react';

export default function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-10 bg-surface-inset" />
          <div className="px-4 py-3 space-y-2">
            <div className="h-3 bg-surface-inset rounded w-3/4" />
            <div className="h-3 bg-surface-inset rounded w-1/2" />
            <div className="h-3 bg-surface-inset rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
