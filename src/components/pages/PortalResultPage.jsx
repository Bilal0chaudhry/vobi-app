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
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Portal Verification Result"
          subtitle={`Reference: ${job.id}`}
        />
        <Button variant="secondary" onClick={onBack}>
          Close
        </Button>
      </div>

      <div className="flex gap-6 items-start">
        <div className="w-64 shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Request Summary</h3>
            <div className="space-y-4">
              <div>
                <span className="text-gray-400 text-xs">Patient</span>
                <p className="font-semibold text-gray-800">{job.patientFirstName} {job.patientLastName}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">DOB</span>
                <p className="font-medium text-gray-800">{job.dob}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Payer</span>
                <p className="font-medium text-gray-800">{job.insurance}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Member ID</span>
                <p className="font-medium text-gray-800">{job.memberId}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Provider Org</span>
                <p className="font-medium text-gray-800">{job.providerOrgName || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5">
          {isError ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-0.5">Portal Lookup Failed</p>
                  <p className="text-xs text-red-600 mb-3">
                    The electronic clearinghouse (Stedi) could not complete the verification. This might be due to mismatched patient details or payer downtime.
                  </p>
                  <Button variant="secondary" onClick={() => onRetry(job)}>
                    <IconRefresh className="w-4 h-4 mr-2" />
                    Retry Verification
                  </Button>
                </div>
              </div>
            </div>
          ) : !hasResult ? (
            <div className="p-12 text-center bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">No portal results available for this request.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                <IconCheckCircleSolid className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    {coverage.status || 'Active Coverage'}
                  </p>
                  {coverage.planType && (
                    <p className="text-xs font-medium text-emerald-600 mt-0.5">
                      {coverage.planType}
                    </p>
                  )}
                </div>
              </div>

              <PatientDetails 
                patient={patient} 
                subscriber={patient} 
                fallbackJob={job} 
              />

              <Section title="Coverage Overview" icon={<IconShield />}>
                <InfoRow label="Plan Type" value={coverage.planType} />
                <InfoRow label="Effective Date" value={coverage.effectiveDate} />
                <InfoRow label="General Copay" value={coverage.copay != null ? `$${coverage.copay}` : undefined} />
                <InfoRow label="In-Network Deductible (Ind.)" value={coverage.deductibleInNetwork != null ? `$${coverage.deductibleInNetwork}` : undefined} />
                <InfoRow label="Family Deductible" value={coverage.familyDeductible != null ? `$${coverage.familyDeductible}` : undefined} />
                <InfoRow label="Out-of-Pocket Max (Ind.)" value={coverage.oopMaxIndividual != null ? `$${coverage.oopMaxIndividual}` : undefined} />
                <InfoRow label="Out-of-Pocket Max (Fam.)" value={coverage.oopMaxFamily != null ? `$${coverage.oopMaxFamily}` : undefined} />
                <InfoRow label="Coinsurance" value={coverage.coinsurance != null ? `${coverage.coinsurance}%` : undefined} />
              </Section>

              {benefits.length > 0 && (
                <Section title={`Detailed Benefits (${benefits.length})`} icon={<IconFileText />}>
                  <div className="py-2">
                    {benefits.map((b, i) => (
                      <BenefitCard key={i} benefit={b} />
                    ))}
                  </div>
                </Section>
              )}

              {job.cptCodes && job.cptCodes.length > 0 && (
                <Section title="CPT Codes Requested" icon={<IconClipboardCheck />}>
                  <div className="py-2 flex flex-wrap gap-2">
                    {job.cptCodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold border border-brand-100 shadow-sm"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
