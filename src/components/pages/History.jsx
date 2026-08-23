import React, { useState, useRef, useEffect } from 'react';
import { COMPLETED_STATUSES } from '../../utils/constants';
import PageHeader from '../ui/PageHeader';
import JobCard from '../ui/JobCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'portal', label: 'Portal' },
  { key: 'call', label: 'Call' },
];

export default function History({ jobs, onOpenJob, onNewVerification, onDeleteJob }) {
  const [activeTab, setActiveTab] = useState('all');
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef({});

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeTab]);

  const filteredJobs = activeTab === 'all'
    ? jobs
    : jobs.filter(j => j.source === activeTab);

  const activeJobs = jobs.filter(j => !COMPLETED_STATUSES.includes(j.status)).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="History"
        subtitle="All verification requests"
        onNewVerification={onNewVerification}
        buttonId="btn-new-verification-history"
        isAtCapacity={activeJobs >= 10}
      />

      {/* Animated Tab Bar */}
      <div className="relative mb-6">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 h-[calc(100%-8px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out"
            style={indicatorStyle}
          />

          {TABS.map(({ key, label }) => (
            <button
              key={key}
              ref={(el) => (tabRefs.current[key] = el)}
              onClick={() => setActiveTab(key)}
              className={`relative z-10 px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 ${
                activeTab === key
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {activeTab !== 'all' && key !== 'all' && key === activeTab && (
                <span className="ml-1.5 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                  {filteredJobs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Job List with Animated Transitions */}
      <div className="space-y-2" key={activeTab}>
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">No {activeTab !== 'all' ? activeTab : ''} requests yet</p>
            <p className="text-xs text-gray-500">New verification requests will appear here</p>
          </div>
        ) : (
          filteredJobs.map((job, idx) => (
            <JobCard key={job.id} job={job} onOpen={onOpenJob} onDelete={onDeleteJob} index={idx} />
          ))
        )}
      </div>
    </div>
  );
}
