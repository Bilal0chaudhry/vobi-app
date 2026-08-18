import React from 'react';
import InfoRow from '../ui/InfoRow';
import Section from '../ui/Section';
import BenefitCard from '../ui/BenefitCard';
import PatientDetails from '../ui/PatientDetails';
import Button from '../ui/Button';
import { SourceBadge, JobBadge } from '../ui/Badge';
import {
  IconChevronLeft,
  IconAlertCircle,
  IconCheckCircleSolid,
  IconRefresh,
  IconShield,
  IconFileText,
  IconClipboardCheck,
} from '../ui/icons';

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

export default function PortalResultPage({ job, onBack, onRetry }) {
  const hasResult = !!job.availityResult && typeof job.availityResult === 'object' && Object.keys(job.availityResult).length > 0;
  const isError = job.status === 'Portal Error' || !hasResult;

  const result = hasResult ? job.availityResult : null;
  const patient = result?.patient || {};
  const subscriber = result?.subscriber || {};
  const coverage = result?.coverage || {};
  const benefits = result?.benefits || [];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={onBack}
          className="mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          title="Back to History"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {job.patientFirstName} {job.patientLastName}
            </h1>
            <SourceBadge source="portal" />
            <JobBadge status={job.status} />
          </div>
          <p className="text-xs text-gray-500">
            {job.insurance} · Member #{job.memberId} · NPI {job.npi} · {timeAgo(job.createdAt)}
          </p>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center py-10 px-6 bg-red-50 border border-red-200 rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <IconAlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-red-700 mb-1">Portal Lookup Failed</h2>
            <p className="text-sm text-red-600 mb-1">
              The eligibility API was unable to return results for this request.
            </p>
            <p className="text-xs text-red-400">
              No data was stored. You can retry with the same patient details below.
            </p>
          </div>

          {/* Patient Details that were submitted */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Original Request Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-400 text-xs">Patient</span><p className="font-semibold text-gray-800">{job.patientFirstName} {job.patientLastName}</p></div>
              <div><span className="text-gray-400 text-xs">Insurance</span><p className="font-semibold text-gray-800">{job.insurance}</p></div>
              <div><span className="text-gray-400 text-xs">Member ID</span><p className="font-mono font-semibold text-gray-800">{job.memberId}</p></div>
              <div><span className="text-gray-400 text-xs">NPI</span><p className="font-mono font-semibold text-gray-800">{job.npi}</p></div>
              {job.cptCodes?.length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-400 text-xs">CPT Codes</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.cptCodes.map(c => (
                      <span key={c} className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md text-xs font-semibold border border-brand-100">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={onRetry}
            variant="primary"
            fullWidth
          >
            <IconRefresh className="w-4 h-4" />
            Retry with Same Details
          </Button>
        </div>
      )}

      {/* Success State */}
      {!isError && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <IconCheckCircleSolid className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {result.eligibilityStatus || 'Active Coverage Confirmed'}
              </p>
              {result.planName && (
                <p className="text-xs text-emerald-600">Plan: {result.planName}</p>
              )}
            </div>
          </div>

          <PatientDetails
            patient={patient}
            subscriber={subscriber}
            fallbackJob={job}
          />

          <Section title="Coverage" icon={<IconShield />}>
            <InfoRow label="Plan Name" value={coverage.planName || result.planName} />
            <InfoRow label="Plan Type" value={coverage.planType} />
            <InfoRow label="Effective Date" value={coverage.effectiveDate} />
            <InfoRow label="Term Date" value={coverage.termDate} />
            <InfoRow label="In-Network Deductible" value={coverage.deductibleInNetwork != null ? `$${coverage.deductibleInNetwork}` : undefined} />
            <InfoRow label="Deductible Met" value={coverage.deductibleMet != null ? `$${coverage.deductibleMet}` : undefined} />
            <InfoRow label="Out-of-Pocket Max" value={coverage.oopMax != null ? `$${coverage.oopMax}` : undefined} />
            <InfoRow label="Coinsurance" value={coverage.coinsurance != null ? `${coverage.coinsurance}%` : undefined} />
            <InfoRow label="Copay" value={coverage.copay != null ? `$${coverage.copay}` : undefined} />
          </Section>

          {benefits.length > 0 && (
            <Section title={`Benefits (${benefits.length})`} icon={<IconFileText />}>
              <div className="py-2">
                {benefits.map((b, i) => (
                  <BenefitCard key={i} benefit={b} />
                ))}
              </div>
            </Section>
          )}

          <Section title="CPT Codes Verified" icon={<IconClipboardCheck />}>
            <div className="py-2 flex flex-wrap gap-2">
              {job.cptCodes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold border border-brand-100"
                >
                  {code}
                </span>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
