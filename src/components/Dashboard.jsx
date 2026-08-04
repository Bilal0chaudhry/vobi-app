import React from 'react';
import StatusBadge from './StatusBadge';
import CptBadge from './CptBadge';
import PageHeader from './PageHeader';
import { IconSignal, IconCheckCircle, IconZap, IconClock, IconArrowOut } from './icons';

const STATS = [
  { label: 'Active jobs',       value: '2',      Icon: IconSignal,      iconClass: 'text-brand-500' },
  { label: 'Verified today',    value: '14',     Icon: IconCheckCircle, iconClass: 'text-emerald-500' },
  { label: 'API fast-path rate',value: '38%',    Icon: IconZap,         iconClass: 'text-amber-500' },
  { label: 'Avg. call time',    value: '6m 12s', Icon: IconClock,       iconClass: 'text-blue-500' },
];

export default function Dashboard({ jobs, onOpenJob, onNewVerification }) {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Active and recent verification jobs"
        onNewVerification={onNewVerification}
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
            <h2 className="text-sm font-bold text-gray-900">Verification requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">Updated moments ago</p>
          </div>
          <button className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
            View all
            <IconArrowOut />
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Patient', 'Insurance', 'CPT', 'Submitted', 'Status', ''].map((col) => (
                <th
                  key={col}
                  className={`text-left text-xs font-semibold text-brand-600 py-3 ${col === '' ? 'px-4' : col === 'Patient' ? 'px-6' : 'px-4'}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, idx) => (
              <tr
                key={job.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-150"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <td className="px-6 py-3.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {job.patientFirstName} {job.patientLastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{job.memberId}</p>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{job.insurance}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {job.cptCodes.map((c) => (
                      <CptBadge key={c} code={c} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-500">{job.submitted}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3.5">
                  <button
                    id={`open-job-${job.id}`}
                    onClick={() => onOpenJob(job)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
