import React from 'react';
import { IconSpin } from './icons';

const SOURCE_BADGE = {
  SYSTEM: 'bg-status-warning text-status-warning-text',
  API:    'bg-status-info text-status-info-text',
  VOICE:  'bg-status-violet text-status-violet-text',
  IVR:    'bg-status-warning text-status-warning-text',
  DATA:   'bg-status-success text-status-success-text',
  VOBI:   'bg-accent-subtle text-accent',
  REP:    'bg-surface-inset text-text-secondary',
};

const BUBBLE_STYLE = {
  system: 'bg-status-warning border-[var(--color-warning-bg)] text-status-warning-text',
  ai:     'bg-accent-subtle border-[var(--color-accent-subtle)] text-text-primary',
  rep:    'bg-surface-inset border-border text-text-primary',
};

export default function LiveFeed({ logs, feedRef, title = 'Live call feed', showLiveIndicator = true }) {
  return (
    <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col min-h-0">
      <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {showLiveIndicator ? (
            <div className="w-2 h-2 rounded-full bg-status-danger-text animate-pulse-dot" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-text-tertiary" />
          )}
          <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        </div>
        <span className="text-xs text-text-tertiary">{logs.length} events</span>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-accent-subtle flex items-center justify-center">
                <IconSpin className="w-5 h-5 text-accent animate-spin" />
              </div>
              <p className="text-sm text-text-secondary">Initializing Vobi agent...</p>
            </div>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="log-entry flex gap-3">
            <span className="text-[10px] font-mono text-text-tertiary mt-2.5 flex-shrink-0 w-16">
              {log.timestamp}
            </span>

            <div className="flex-1">
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1 ${
                  SOURCE_BADGE[log.source] || SOURCE_BADGE.SYSTEM
                }`}
              >
                {log.source}
              </span>
              <div
                className={`px-4 py-2.5 rounded-xl border text-sm leading-relaxed ${
                  BUBBLE_STYLE[log.type] || BUBBLE_STYLE.system
                }`}
              >
                {log.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
