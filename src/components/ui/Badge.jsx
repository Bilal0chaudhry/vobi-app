import React from 'react';

const jobConfig = {
  'Agent on Call': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', animate: true },
  'On Hold': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', animate: true },
  'API Fast-Path': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', animate: false },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', animate: false },
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
