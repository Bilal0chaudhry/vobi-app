import React from 'react';
import { JobBadge } from '../ui/Badge';
import CptBadge from '../ui/CptBadge';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import { IconSignal, IconCheckCircle, IconZap, IconClock, IconArrowOut } from '../ui/icons';

export default function Dashboard({ jobs, onOpenJob, onNewVerification }) {
  const activeJobs = jobs.filter(j => j.status !== 'Completed').length;
  const verifiedJobs = jobs.filter(j => j.status === 'Completed').length;
  
  const STATS = [
    { label: 'Active jobs',       value: activeJobs.toString(),      Icon: IconSignal,      iconClass: 'text-brand-500' },
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
          <Button variant="ghost" className="text-brand-600 hover:text-brand-700">
            View all
            <IconArrowOut />
          </Button>
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
                  <JobBadge status={job.status} />
                </td>
                <td className="px-4 py-3.5">
                  <Button
                    id={`open-job-${job.id}`}
                    onClick={() => onOpenJob(job)}
                    variant="ghost"
                    size="sm"
                    className="text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
