import React, { useRef } from 'react';
import LiveFeed from '../ui/LiveFeed';
import VerificationChecklist from '../ui/VerificationChecklist';
import { JobBadge, SourceBadge } from '../ui/Badge';
import Button from '../ui/Button';
import { IconArrowLeft, IconCheckCircle, IconAlertCircle } from '../ui/icons';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CallResultPage({ job, onBack }) {
  const feedRef = useRef(null);
  const logs = job.logs || [];
  const checklist = job.checklist || {};
  const isError = job.status === 'Call Error';
  const isCompleted = job.status === 'Completed';

  const checklistItems = [
    { key: 'eligibility', label: 'Eligibility Status' },
    { key: 'networkStatus', label: 'Network Status' },
    { key: 'deductible', label: 'Deductible' },
    { key: 'oopMax', label: 'Out-of-Pocket Max' },
    { key: 'cpt1', label: `CPT ${job.cptCodes?.[0] || '—'}` },
    ...(job.cptCodes?.length > 1 ? [{ key: 'cpt2', label: `CPT ${job.cptCodes[1]}` }] : []),
    { key: 'copay', label: 'Copay / Coinsurance' },
    { key: 'buyAndBill', label: 'Buy & Bill' },
    { key: 'priorAuth', label: 'Prior Authorization' },
    { key: 'referral', label: 'PCP Referral' },
    { key: 'formulary', label: 'Formulary / Preferred Drug' },
  ];

  const completedCount = Object.values(checklist).filter(v => v === 'complete').length;
  const totalCount = checklistItems.length;

  return (
    <div className="animate-fade-in h-[calc(100vh-32px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button id="btn-back-history" onClick={onBack} variant="ghost">
            <IconArrowLeft />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">
                {job.patientFirstName} {job.patientLastName}
              </h1>
              <SourceBadge source="call" />
            </div>
            <p className="text-xs text-gray-500">
              {job.insurance} · {job.memberId} · {timeAgo(job.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <JobBadge status={job.status} />
          {isCompleted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <IconCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">
                {completedCount}/{totalCount} verified
              </span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <IconAlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700">Call ended with error</span>
            </div>
          )}
        </div>
      </div>

      {/* Content — reuses same layout as LiveView */}
      <div className="flex gap-4 flex-1 min-h-0">
        <VerificationChecklist checklist={checklist} items={checklistItems} readOnly />
        <LiveFeed logs={logs} feedRef={feedRef} title="Call transcript" showLiveIndicator={false} />
      </div>
    </div>
  );
}
