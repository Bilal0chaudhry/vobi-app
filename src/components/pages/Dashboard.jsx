import React from 'react';
import PageHeader from '../ui/PageHeader';
import JobCard from '../ui/JobCard';
import { IconSignal, IconCheckCircle, IconZap, IconClock } from '../ui/icons';

export default function Dashboard({ jobs, onOpenJob, onNewVerification }) {
  const activeJobsList = jobs.filter(j => !['Completed', 'Verified (Portal)', 'Portal Error', 'Call Error'].includes(j.status));
  const activeJobs = activeJobsList.length;
  const verifiedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 'Verified (Portal)').length;
  
  const STATS = [
    { label: 'Active jobs',       value: activeJobs.toString(),       Icon: IconSignal,      iconClass: 'text-brand-500' },
    { label: 'Verified today',    value: verifiedJobs.toString(),     Icon: IconCheckCircle, iconClass: 'text-emerald-500' },
    { label: 'API fast-path rate',value: '0%',    Icon: IconZap,         iconClass: 'text-amber-500' },
    { label: 'Avg. call time',    value: '0m 0s', Icon: IconClock,       iconClass: 'text-blue-500' },
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
            className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-md hover:border-gray-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <Icon className={`w-5 h-5 ${iconClass}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Active requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">Currently processing (Max 10)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              activeJobs >= 10 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-brand-50 text-brand-700 border-brand-200'
            }`}>
              {activeJobs} / 10 Capacity
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {activeJobsList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No active verification requests</p>
              <p className="text-xs text-gray-400 mt-1">Click "New Verification" to start processing</p>
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
