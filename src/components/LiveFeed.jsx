import React from 'react';
import { IconSpin } from './icons';

/** Source badge color map */
const SOURCE_BADGE = {
  SYSTEM: 'bg-amber-100 text-amber-800',
  API:    'bg-orange-100 text-orange-800',
  VOICE:  'bg-purple-100 text-purple-800',
  IVR:    'bg-yellow-100 text-yellow-800',
  DATA:   'bg-teal-100 text-teal-800',
  VOBI:   'bg-brand-100 text-brand-800',
  REP:    'bg-gray-200 text-gray-700',
};

/** Bubble background/border styles by message type */
const BUBBLE_STYLE = {
  system: 'bg-amber-50 border-amber-200 text-amber-900',
  ai:     'bg-brand-50 border-brand-200 text-brand-900',
  rep:    'bg-gray-50 border-gray-200 text-gray-800',
};

/**
 * Live call feed panel — scrollable list of log entries.
 *
 * @param {object} props
 * @param {Array} props.logs
 * @param {React.RefObject} props.feedRef  - attached to the scroll container
 */
export default function LiveFeed({ logs, feedRef }) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
          <h2 className="text-sm font-bold text-gray-900">Live call feed</h2>
        </div>
        <span className="text-xs text-gray-400">{logs.length} events</span>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-brand-50 flex items-center justify-center">
                <IconSpin className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Initializing Vobi agent...</p>
            </div>
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="log-entry flex gap-3">
            {/* Timestamp */}
            <span className="text-[10px] font-mono text-gray-400 mt-2.5 flex-shrink-0 w-16">
              {log.timestamp}
            </span>

            {/* Bubble */}
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
