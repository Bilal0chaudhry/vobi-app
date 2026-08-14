import React from 'react';
import { JobBadge } from './ui/Badge';
import PageHeader from './PageHeader';

export default function CallHistory({ jobs, onNewVerification }) {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Call history"
        subtitle="Completed and archived verifications"
        onNewVerification={onNewVerification}
        buttonId="btn-new-verification-history"
      />

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

            <JobBadge status={job.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
