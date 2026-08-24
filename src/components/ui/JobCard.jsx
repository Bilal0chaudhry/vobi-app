import React, { useState, useEffect, useRef } from 'react';
import { JobBadge, SourceBadge } from './Badge';
import CptBadge from './CptBadge';
import { IconTrash, IconCheck, IconX } from './icons';

import useClickOutside from '../../hooks/useClickOutside';
import useGlobalTimer from '../../hooks/useGlobalTimer';
import { timeAgo } from '../../utils/formatters';
import { isJobActive } from '../../utils/constants';

export default function JobCard({ job, onOpen, onDelete, index = 0 }) {
  useGlobalTimer();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef(null);

  useClickOutside(cardRef, () => setIsConfirmingDelete(false), isConfirmingDelete);

  const isActive = isJobActive(job);

  return (
    <div
      ref={cardRef}
      className={`group relative bg-white rounded-xl border overflow-hidden transition-all duration-300 animate-slide-up ${
        isConfirmingDelete ? 'cursor-default border-red-200 shadow-md shadow-red-500/5 bg-red-50/10' : 'cursor-pointer'
      } ${!isConfirmingDelete && isActive
          ? 'border-brand-200 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5'
          : !isConfirmingDelete ? 'border-gray-200 hover:border-gray-300 hover:shadow-md' : ''
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={(e) => {
        if (!isConfirmingDelete) {
          onOpen(job);
        }
      }}
    >
      {/* Active indicator strip */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-violet-500 rounded-l-xl" />
      )}

      <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Top/Left section: Source Icon + Patient Info */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
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
        </div>

        {/* Bottom/Right section: Status, CPT, Time, Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 pl-14 sm:pl-0">

        {/* CPT Codes */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {(job.cptCodes || []).slice(0, 3).map((c) => (
            <CptBadge key={c} code={c} />
          ))}
          {(job.cptCodes || []).length > 3 && (
            <span className="text-[10px] text-gray-400 font-medium">+{job.cptCodes.length - 3}</span>
          )}
        </div>

        {/* Time */}
        <div className="text-xs text-gray-400 font-medium shrink-0 hidden sm:block sm:w-16 sm:text-right">
          {timeAgo(job.createdAt)}
        </div>

        {/* Status */}
        <div className="shrink-0">
          <JobBadge status={job.status} />
        </div>

        {/* Actions */}
        <div className="relative shrink-0 flex items-center justify-end sm:w-24 h-10">
          {onDelete && (
            <div 
              className={`absolute right-0 flex items-center gap-1 transition-all duration-300 transform
                ${!isConfirmingDelete 
                  ? 'opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0' 
                  : 'opacity-0 translate-x-4 pointer-events-none'
                }`}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(true);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors outline-none"
                title="Delete request"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          )}

          <div 
            className={`absolute right-0 flex items-center gap-1.5 transition-all duration-300 transform origin-right
              ${isConfirmingDelete ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
            onClick={e => e.stopPropagation()}
          >
            <button 
              disabled={isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                await onDelete(job.id);
              }} 
              className={`w-8 h-8 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 ${isConfirmingDelete ? 'animate-pop-in-1' : ''}`}
              title="Confirm Delete"
            >
              {isDeleting ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconCheck className="w-3.5 h-3.5" />}
            </button>
            <button 
              disabled={isDeleting}
              onClick={() => setIsConfirmingDelete(false)} 
              className={`w-8 h-8 rounded-full bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-all shadow-sm active:scale-95 disabled:opacity-50 ${isConfirmingDelete ? 'animate-pop-in-2' : ''}`}
              title="Cancel"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
