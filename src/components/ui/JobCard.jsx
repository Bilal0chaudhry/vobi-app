import React from 'react';
import { JobBadge, SourceBadge } from './Badge';
import CptBadge from './CptBadge';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JobCard({ job, onOpen, index = 0 }) {
  const isActive = job.status !== 'Completed' && job.status !== 'Verified (Portal)' && job.status !== 'Portal Error';

  return (
    <div
      className={`group relative bg-white rounded-xl border overflow-hidden transition-all duration-300 animate-slide-up cursor-pointer
        ${isActive
          ? 'border-brand-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onOpen(job)}
    >
      {/* Active indicator strip */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-violet-500 rounded-l-xl" />
      )}

      <div className="px-5 py-4 flex items-center gap-4">
        {/* Source Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${
          job.source === 'portal'
            ? 'bg-sky-50 text-sky-600'
            : 'bg-violet-50 text-violet-600'
        }`}>
          {job.source === 'portal' ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 10.43a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.76a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
          )}
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-gray-900 truncate">
              {job.patientFirstName} {job.patientLastName}
            </p>
            <SourceBadge source={job.source} />
          </div>
          <p className="text-xs text-gray-500 truncate">
            {job.insurance} · {job.memberId}
          </p>
        </div>

        {/* CPT Codes */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {(job.cptCodes || []).slice(0, 3).map((c) => (
            <CptBadge key={c} code={c} />
          ))}
          {(job.cptCodes || []).length > 3 && (
            <span className="text-[10px] text-gray-400 font-medium">+{job.cptCodes.length - 3}</span>
          )}
        </div>

        {/* Time */}
        <div className="text-xs text-gray-400 font-medium shrink-0 w-16 text-right">
          {timeAgo(job.createdAt)}
        </div>

        {/* Status */}
        <div className="shrink-0">
          <JobBadge status={job.status} />
        </div>

        {/* Open Arrow */}
        <div className="shrink-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
