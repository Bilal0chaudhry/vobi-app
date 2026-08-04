import React from 'react';
import StatusBadge from './StatusBadge';
import { IconPlus } from './icons';

export default function CallHistory({ jobs, onNewVerification }) {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Call history</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completed and archived verifications</p>
        </div>
        <button
          id="btn-new-verification-history"
          onClick={onNewVerification}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-md shadow-brand-600/25 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/30 transition-all duration-200 active:scale-[0.97]"
        >
          <IconPlus />
          New Verification
        </button>
      </div>

      {/* Job cards */}
      <div className="space-y-2">
        {jobs.map((job, idx) => (
          <div
            key={job.id}
            className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between hover:shadow-md hover:border-gray-300 transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="min-w-[220px]">
              <p className="text-sm font-semibold text-gray-900">
                {job.patientFirstName} {job.patientLastName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {job.insurance} · {job.memberId}
              </p>
            </div>

            <div className="text-sm text-gray-600">
              CPT {job.cptCodes.join(', ')}
            </div>

            <div className="text-sm text-gray-500">{job.submitted}</div>

            <StatusBadge status={job.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
