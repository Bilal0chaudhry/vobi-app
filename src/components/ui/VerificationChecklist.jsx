import React from 'react';
import { IconCheck, IconX } from './icons';

export default function VerificationChecklist({ checklist, items, readOnly = false }) {
  const completedCount = Object.values(checklist).filter((v) => v === 'complete').length;
  const totalCount = items.length;

  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-surface rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-text-primary">Verification checklist</h2>
        <span className="text-xs font-semibold text-accent">
          {completedCount}/{totalCount}
        </span>
      </div>

      <div className="w-full h-1.5 bg-surface-inset rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="space-y-3 flex-1">
        {items.map(({ key, label }) => {
          const status = checklist[key];
          const isComplete = status === 'complete';
          const isNA = status === 'n/a';
          // In read-only mode (history), pending items are "not verified"
          const isNotVerified = readOnly && !isComplete && !isNA;

          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                isComplete ? 'bg-status-success' : isNotVerified ? 'bg-status-danger' : 'bg-surface-inset'
              }`}
            >
              {isComplete ? (
                <div className="w-5 h-5 rounded-full bg-[var(--color-success-text)] flex items-center justify-center check-complete">
                  <IconCheck className="w-3 h-3 text-white" />
                </div>
              ) : isNotVerified ? (
                <div className="w-5 h-5 rounded-full bg-[var(--color-danger-text)] flex items-center justify-center">
                  <IconX className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-text)] animate-pulse-dot" />
                </div>
              )}

              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isComplete ? 'text-status-success-text' : isNotVerified ? 'text-status-danger-text' : 'text-text-secondary'
                }`}
              >
                {label}
              </span>

              <span
                className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${
                  isComplete ? 'text-status-success-text' : isNotVerified ? 'text-status-danger-text' : 'text-status-warning-text'
                }`}
              >
                {isComplete ? 'Complete' : isNotVerified ? 'Not Verified' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
