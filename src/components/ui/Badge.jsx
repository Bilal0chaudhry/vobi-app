import React from 'react';

const jobConfig = {
  'Agent on Call': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', animate: true },
  'On Hold': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', animate: true },
  'API Fast-Path': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', animate: false },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', animate: false },
  'Verified (Portal)': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', animate: false },
  'Portal Error': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', animate: false },
  'Call Error': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', animate: false },
};

export function JobBadge({ status }) {
  const config = jobConfig[status] || jobConfig['Completed'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse-dot' : ''}`} />
      {status}
    </span>
  );
}

const profileConfig = {
  'approved': 'bg-emerald-100 text-emerald-800',
  'pending': 'bg-amber-100 text-amber-800',
  'rejected': 'bg-red-100 text-red-800',
  'admin': 'bg-purple-100 text-purple-800',
};

export function ProfileBadge({ status, role = false }) {
  const colorClass = profileConfig[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {role ? 'Admin' : status}
    </span>
  );
}

const sourceConfig = {
  call: {
    label: 'Call',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 10.43a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.76a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  portal: {
    label: 'Portal',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
};

export function SourceBadge({ source }) {
  const config = sourceConfig[source] || sourceConfig.call;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text} border ${config.border}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
