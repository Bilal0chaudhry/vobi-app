import React from 'react';
import Button from '../ui/Button';
import { SourceBadge, JobBadge } from '../ui/Badge';
import {
  IconChevronLeft,
  IconShield,
  IconFileText,
  IconClipboardCheck,
  IconCheckCircleSolid,
  IconAlertCircle,
  IconRefresh,
  IconUser,
} from '../ui/icons';
import { timeAgo } from '../../utils/formatters';

// Inline label/value cell — keeps the eye moving left-to-right fast
function StatCell({ label, value, accent }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${accent ?? 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

// A card shell that matches the app's existing Section/Dashboard card look
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
      <span className="text-brand-600">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

export default function PortalResultPage({ job, onBack, onRetry }) {
  const hasResult =
    !!job.stediResult &&
    typeof job.stediResult === 'object' &&
    Object.keys(job.stediResult).length > 0;
  const isError = job.status === 'Portal Error' || !hasResult;

  const result = hasResult ? job.stediResult : null;
  const patient = result?.patient || {};
  const coverage = result?.coverage || {};
  const benefits = result?.benefits || [];

  // Partition benefits: in-network vs out-of-network for cleaner display
  const inNetworkBenefits = benefits.filter((b) => b.inNetwork !== false);
  const outNetworkBenefits = benefits.filter((b) => b.inNetwork === false);

  return (
    <div className="animate-fade-in w-full">
      {/* ── Header bar ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={onBack}
          className="mt-1 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
          title="Back to History"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-lg font-bold text-gray-900">
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

      {/* ── Error state ──────────────────────────────────────────────── */}
      {isError ? (
        <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 rounded-xl">
          <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 mb-1">Portal Lookup Failed</p>
            <p className="text-xs text-red-600 mb-3">
              The electronic clearinghouse (Stedi) could not complete the verification. This might
              be due to mismatched patient details or payer downtime.
            </p>
            <Button variant="secondary" onClick={() => onRetry(job)}>
              <IconRefresh className="w-4 h-4 mr-2" />
              Retry Verification
            </Button>
          </div>
        </div>
      ) : !hasResult ? (
        <div className="p-12 text-center bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">No portal results available for this request.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Hero status banner ──────────────────────────────────── */}
          <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
            <IconCheckCircleSolid className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-emerald-800">
                {coverage.status || 'Active Coverage Confirmed'}
              </p>
              {coverage.planType && (
                <p className="text-xs font-medium text-emerald-600 mt-0.5">{coverage.planType}</p>
              )}
            </div>
            {coverage.effectiveDate && (
              <div className="text-right shrink-0">
                <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide block">Effective</span>
                <span className="text-sm font-semibold text-emerald-800">{coverage.effectiveDate}</span>
              </div>
            )}
          </div>

          {/* ── Two-column main grid ─────────────────────────────────── */}
          {/*   Left: patient + request meta                               */}
          {/*   Right: coverage financials                                  */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient & request info */}
            <Card>
              <CardHeader icon={<IconUser />} title="Patient" />
              <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                <StatCell
                  label="Name"
                  value={patient.name || `${job.patientFirstName || ''} ${job.patientLastName || ''}`.trim()}
                />
                <StatCell label="Date of Birth" value={patient.dob || job.dob} />
                <StatCell
                  label="Member ID"
                  value={patient.memberId || job.memberId}
                />
                {patient.groupNumber && (
                  <StatCell label="Group #" value={patient.groupNumber} />
                )}
                <StatCell label="Gender" value={patient.gender} />
                <StatCell label="Payer" value={job.insurance} />
                <StatCell label="Provider" value={job.providerOrgName} />
                <StatCell label="NPI" value={job.npi} />
              </div>
            </Card>

            {/* Coverage financials */}
            <Card>
              <CardHeader icon={<IconShield />} title="Coverage" />
              <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                <StatCell label="Plan Type" value={coverage.planType} />
                <StatCell
                  label="Co-Pay"
                  value={coverage.copay != null ? `$${coverage.copay}` : undefined}
                  accent="text-brand-700"
                />
                <StatCell
                  label="Deductible (Ind.)"
                  value={coverage.deductibleInNetwork != null ? `$${coverage.deductibleInNetwork}` : undefined}
                />
                <StatCell
                  label="Deductible (Fam.)"
                  value={coverage.familyDeductible != null ? `$${coverage.familyDeductible}` : undefined}
                />
                <StatCell
                  label="OOP Max (Ind.)"
                  value={coverage.oopMaxIndividual != null ? `$${coverage.oopMaxIndividual}` : undefined}
                />
                <StatCell
                  label="OOP Max (Fam.)"
                  value={coverage.oopMaxFamily != null ? `$${coverage.oopMaxFamily}` : undefined}
                />
                <StatCell
                  label="Coinsurance"
                  value={coverage.coinsurance != null ? `${coverage.coinsurance}%` : undefined}
                  accent="text-brand-700"
                />
              </div>
            </Card>
          </div>

          {/* ── CPT Codes ─────────────────────────────────────────────── */}
          {job.cptCodes && job.cptCodes.length > 0 && (
            <Card>
              <CardHeader icon={<IconClipboardCheck />} title="CPT Codes Requested" />
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {job.cptCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold border border-brand-100"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* ── Benefits grid ─────────────────────────────────────────── */}
          {benefits.length > 0 && (
            <Card>
              <CardHeader
                icon={<IconFileText />}
                title={`Detailed Benefits (${benefits.length})`}
              />
              <div className="px-4 py-3">
                {/* Benefits render as a responsive grid — 1 col mobile, 2 col sm+, 3 col lg+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(inNetworkBenefits.length > 0 ? inNetworkBenefits : benefits).map((b, i) => (
                    <BenefitCell key={i} benefit={b} />
                  ))}
                </div>
                {outNetworkBenefits.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">
                      Out-of-Network
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {outNetworkBenefits.map((b, i) => (
                        <BenefitCell key={i} benefit={b} outOfNetwork />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Compact benefit cell — replaces the old BenefitCard for in-page use
function BenefitCell({ benefit, outOfNetwork }) {
  const hasValue = benefit.amount != null || benefit.percent != null;
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        outOfNetwork
          ? 'border-gray-200 bg-gray-50'
          : 'border-gray-100 bg-white'
      }`}
    >
      <p className="text-xs font-semibold text-gray-800 mb-1 leading-tight">
        {benefit.name || 'Benefit'}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {benefit.amount != null && (
          <span className="text-[11px] text-brand-700 font-semibold">${benefit.amount}</span>
        )}
        {benefit.percent != null && (
          <span className="text-[11px] text-brand-700 font-semibold">{benefit.percent}%</span>
        )}
        {benefit.level && (
          <span className="text-[11px] text-gray-400">{benefit.level}</span>
        )}
        {benefit.serviceTypes && (
          <span className="text-[11px] text-gray-400 truncate max-w-full">{benefit.serviceTypes}</span>
        )}
        {!hasValue && (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </div>
    </div>
  );
}
