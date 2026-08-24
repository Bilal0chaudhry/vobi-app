import React from 'react';
import PageHeader from '../ui/PageHeader';
import JobCard from '../ui/JobCard';
import { IconSignal, IconCheckCircle, IconZap, IconClock } from '../ui/icons';
import { COMPLETED_STATUSES } from '../../utils/constants';

export default function Dashboard({ jobs = [], onOpenJob, onNewVerification }) {
  const activeJobsList = jobs.filter(j => !COMPLETED_STATUSES.includes(j.status));
  const activeJobs = activeJobsList.length;
  const verifiedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 'Verified (Portal)').length;
  
  const STATS = [
    { label: 'Active jobs',       value: activeJobs.toString(),       Icon: IconSignal,      iconClass: 'text-accent' },
    { label: 'Verified today',    value: verifiedJobs.toString(),     Icon: IconCheckCircle, iconClass: 'text-status-success-text' },
    { label: 'API fast-path rate',value: '0%',    Icon: IconZap,         iconClass: 'text-status-warning-text' },
    { label: 'Avg. call time',    value: '0m 0s', Icon: IconClock,       iconClass: 'text-status-info-text' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Active and recent verification jobs"
        onNewVerification={onNewVerification}
        isAtCapacity={activeJobs >= 10}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, Icon, iconClass }) => (
          <div
            key={label}
            className="bg-surface rounded-xl border border-border px-5 py-4 hover:shadow-md hover:border-border-subtle transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-text-secondary">{label}</p>
              <Icon className={`w-5 h-5 ${iconClass}`} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Active requests</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Currently processing (Max 10)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              activeJobs >= 10 
                ? 'bg-status-danger text-status-danger-text border-status-danger' 
                : 'bg-accent-subtle text-accent border-accent-subtle'
            }`}>
              {activeJobs} / 10 Capacity
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {activeJobsList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-text-secondary">No active verification requests</p>
              <p className="text-xs text-text-tertiary mt-1">Click "New Verification" to start processing</p>
            </div>
          ) : (
            activeJobsList.map((job, idx) => (
              <JobCard key={job.id} job={job} onOpen={onOpenJob} index={idx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
