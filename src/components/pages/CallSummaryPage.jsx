import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import { SourceBadge, JobBadge } from '../ui/Badge';
import {
  IconArrowLeft,
  IconShield,
  IconFileText,
  IconClipboardCheck,
  IconCheckCircle,
  IconCheckCircleSolid,
  IconAlertCircle,
  IconRefresh,
  IconUser,
  IconPhone,
} from '../ui/icons';
import { timeAgo } from '../../utils/formatters';
import { buildChecklistItems } from '../../utils/constants';
import { generateCallSummary } from '../../utils/api';
import {
  exportSummaryToPdf,
  exportSummaryToDocx,
  exportSummaryToTxt,
} from '../../utils/exporters';
import useClickOutside from '../../hooks/useClickOutside';

function StatCell({ label, value, accent, wide, badge }) {
  const display = value != null && String(value).trim() !== '' ? String(value) : '—';
  const isMuted = display === '—';

  return (
    <div className={`flex flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
        {label}
      </span>
      {badge && !isMuted ? (
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${badge}`}>
            {display}
          </span>
        </div>
      ) : (
        <span
          className={`text-sm font-semibold break-words ${
            isMuted ? 'text-text-tertiary font-normal' : accent ?? 'text-text-primary'
          }`}
        >
          {display}
        </span>
      )}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-2.5 px-4 py-3 bg-surface-inset border-b border-border-subtle">
      <div className="flex items-center gap-2.5">
        <span className="text-accent">{icon}</span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

function getStatusBadgeClass(val) {
  if (!val) return '';
  const v = String(val).toLowerCase();
  if (
    v.includes('active') ||
    v.includes('in-network') ||
    v.includes('in network') ||
    v === 'yes' ||
    v.includes('covered')
  ) {
    return 'bg-status-success text-status-success-text border border-[var(--color-success-bg)]';
  }
  if (v.includes('inactive') || v.includes('out-of-network') || v.includes('not covered')) {
    return 'bg-status-danger text-status-danger-text border border-[var(--color-danger-bg)]';
  }
  return 'bg-accent-subtle text-accent border border-[var(--color-accent-subtle)]';
}

export default function CallSummaryPage({ job, onBack, onSwitchToTranscript, onJobUpdate }) {
  const [summary, setSummary] = useState(() => job.summary || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);
  const autoRequestedRef = useRef(false);

  useClickOutside(exportRef, () => setExportOpen(false), exportOpen);

  const checklist = job.checklist || {};
  const checklistItems = buildChecklistItems(job);
  const completedCount = Object.values(checklist).filter((v) => v === 'complete').length;
  const totalCount = checklistItems.length;

  const hasSubstantiveSummary =
    summary &&
    typeof summary === 'object' &&
    (Boolean(summary.verified) ||
      Boolean(summary.eligibilityStatus && summary.eligibilityStatus !== 'Pending') ||
      Boolean(summary.planType && summary.planType !== 'Not stated') ||
      Boolean(summary.deductibleIndividual && summary.deductibleIndividual !== 'Not stated') ||
      Boolean(summary.referenceNumber && summary.referenceNumber !== 'Not stated'));

  const handleGenerate = async (regenerate = false) => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await generateCallSummary(job.id, job, regenerate);
      if (res?.summary) {
        setSummary(res.summary);
        const nextChecklist = { ...checklist };
        if (res.checklist && typeof res.checklist === 'object') {
          for (const [k, v] of Object.entries(res.checklist)) {
            if (v === 'complete') nextChecklist[k] = 'complete';
          }
        }
        onJobUpdate?.(job.id, {
          checklist: nextChecklist,
          summary: res.summary,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not generate structured summary.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (job.summary && !summary) {
      setSummary(job.summary);
      return;
    }
    if (!hasSubstantiveSummary && !autoRequestedRef.current && (job.logs || []).length > 0) {
      autoRequestedRef.current = true;
      handleGenerate(false);
    }
  }, [job.id]);

  const handleExport = async (format) => {
    setExportOpen(false);
    setIsExporting(true);
    try {
      const dataToExport = summary || {};
      if (format === 'pdf') {
        await exportSummaryToPdf(job, dataToExport);
      } else if (format === 'docx') {
        await exportSummaryToDocx(job, dataToExport);
      } else if (format === 'txt') {
        exportSummaryToTxt(job, dataToExport);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const s = summary || {};
  const cptBreakdown =
    Array.isArray(s.cptBreakdown) && s.cptBreakdown.length > 0
      ? s.cptBreakdown
      : (job.cptCodes || []).map((code) => ({
          code,
          description: '',
          covered: '',
          allowedAmount: '',
          copay: '',
          coinsurance: '',
          priorAuthRequired: '',
        }));
  const notes = Array.isArray(s.notes) ? s.notes.filter(Boolean) : [];
  const isError = job.status === 'Call Error';

  const headlineText =
    s.headline ||
    (s.eligibilityStatus
      ? `${s.eligibilityStatus}${s.planType ? ` ${s.planType}` : ''} coverage verified${
          s.networkStatus ? ` (${s.networkStatus})` : ''
        }.`
      : isError
      ? 'Call ended before verification completed.'
      : 'Structured benefits verification summary from live insurance call.');

  return (
    <div className="animate-fade-in w-full pb-8">
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button id="btn-back-summary" onClick={onBack} variant="ghost">
            <IconArrowLeft />
            Back
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary">
                {job.patientFirstName} {job.patientLastName}
              </h1>
              <SourceBadge source="call" />
              <JobBadge status={job.status} />
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {job.insurance} · Member #{job.memberId} · NPI {job.npi} · {timeAgo(job.createdAt)}
            </p>
          </div>
        </div>

        {/* Right Controls: View Switcher + Regenerate + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Toggle: Summary | Transcript */}
          <div className="inline-flex items-center bg-surface-inset p-1 rounded-xl border border-border-subtle">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-surface text-text-primary shadow-sm transition-all"
            >
              Summary
            </button>
            <button
              type="button"
              onClick={onSwitchToTranscript}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
            >
              Transcript
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            title="Re-extract structured summary from call transcript"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="text-xs">{isGenerating ? 'Extracting...' : 'Refresh'}</span>
          </Button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <Button
              variant="primary"
              onClick={() => setExportOpen((prev) => !prev)}
              disabled={isExporting || isGenerating}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="text-xs">{isExporting ? 'Exporting...' : 'Download'}</span>
            </Button>

            {exportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl border border-border shadow-xl py-1.5 z-40 animate-fade-in">
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-hover flex items-center justify-between transition-colors"
                >
                  <span>PDF Document</span>
                  <span className="text-[10px] font-mono text-text-tertiary uppercase">.pdf</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('docx')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-hover flex items-center justify-between transition-colors"
                >
                  <span>Word Document</span>
                  <span className="text-[10px] font-mono text-text-tertiary uppercase">.docx</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('txt')}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-text-primary hover:bg-surface-hover flex items-center justify-between transition-colors"
                >
                  <span>Plain Text</span>
                  <span className="text-[10px] font-mono text-text-tertiary uppercase">.txt</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading Skeleton while extracting for the first time ────── */}
      {isGenerating && !hasSubstantiveSummary ? (
        <div className="bg-surface rounded-xl border border-border p-8 text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 mx-auto rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
            <IconRefresh className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-text-primary">
            Structuring call benefits summary...
          </p>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Extracting deductibles, out-of-pocket maximums, CPT coverage, prior authorization, and reference numbers from the call transcript.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMsg && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-status-danger border border-[var(--color-danger-bg)] rounded-xl">
              <div className="flex items-center gap-2.5">
                <IconAlertCircle className="w-4 h-4 text-status-danger-text shrink-0" />
                <span className="text-xs font-medium text-status-danger-text">{errorMsg}</span>
              </div>
              <Button variant="secondary" onClick={() => handleGenerate(true)}>
                Retry
              </Button>
            </div>
          )}

          {/* ── Executive Overview Banner ─────────────────────────────── */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-xl border shadow-sm ${
              isError
                ? 'bg-status-danger border-[var(--color-danger-bg)]'
                : 'bg-status-success border-[var(--color-success-bg)]'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              {isError ? (
                <IconAlertCircle className="w-6 h-6 text-status-danger-text shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <IconCheckCircleSolid className="w-6 h-6 text-status-success-text shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-sm sm:text-base font-bold ${
                    isError ? 'text-status-danger-text' : 'text-status-success-text'
                  }`}
                >
                  {headlineText}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {s.repName && (
                    <span
                      className={`text-xs font-medium opacity-90 ${
                        isError ? 'text-status-danger-text' : 'text-status-success-text'
                      }`}
                    >
                      Rep: <strong>{s.repName}</strong>
                    </span>
                  )}
                  {s.referenceNumber && (
                    <span
                      className={`text-xs font-medium opacity-90 ${
                        isError ? 'text-status-danger-text' : 'text-status-success-text'
                      }`}
                    >
                      Ref #: <strong className="font-mono">{s.referenceNumber}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/90 backdrop-blur rounded-lg border border-border-subtle">
                <IconCheckCircle className="w-3.5 h-3.5 text-status-success-text" />
                <span className="text-xs font-bold text-text-primary">
                  {completedCount}/{totalCount} verified
                </span>
              </div>
            </div>
          </div>

          {/* ── Two-Column Grid: Eligibility/Plan + Financial Accumulators ─ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Patient, Plan & Network */}
            <Card>
              <CardHeader icon={<IconUser />} title="Patient & Plan Network" />
              <div className="px-4 py-3.5 grid grid-cols-2 gap-x-6 gap-y-3.5 items-start">
                <StatCell
                  label="Patient Name"
                  value={s.patientName || `${job.patientFirstName || ''} ${job.patientLastName || ''}`.trim()}
                />
                <StatCell label="Date of Birth" value={s.dob || job.dob} />
                <StatCell label="Member ID" value={s.memberId || job.memberId} />
                <StatCell label="Payer" value={s.insurance || job.insurance} />
                <StatCell
                  label="Eligibility Status"
                  value={s.eligibilityStatus}
                  badge={getStatusBadgeClass(s.eligibilityStatus)}
                />
                <StatCell
                  label="Network Status"
                  value={s.networkStatus}
                  badge={getStatusBadgeClass(s.networkStatus)}
                />
                <StatCell
                  label="Plan Type"
                  value={s.planType}
                  badge="bg-accent-subtle text-accent border border-[var(--color-accent-subtle)]"
                />
                <StatCell label="Benefit Year" value={s.benefitYear} />
                <StatCell label="Provider / Practice" value={s.providerOrgName || job.providerOrgName} />
                <StatCell label="Provider NPI" value={s.npi || job.npi} />
              </div>
            </Card>

            {/* Financial Accumulators */}
            <Card>
              <CardHeader icon={<IconShield />} title="Financial Accumulators" />
              <div className="px-4 py-3.5 grid grid-cols-2 gap-x-6 gap-y-3.5 items-start">
                <StatCell label="Individual Deductible" value={s.deductibleIndividual} />
                <StatCell
                  label="Deductible Remaining"
                  value={s.deductibleRemaining}
                  accent="text-accent"
                />
                <StatCell label="Out-of-Pocket Max" value={s.oopMaxIndividual} />
                <StatCell
                  label="OOP Max Remaining"
                  value={s.oopMaxRemaining}
                  accent="text-accent"
                />
                <StatCell label="Copay" value={s.copay} accent="text-accent" />
                <StatCell label="Coinsurance" value={s.coinsurance} accent="text-accent" />
                <StatCell label="Insurance Rep" value={s.repName} />
                <StatCell
                  label="Call Reference #"
                  value={s.referenceNumber}
                  accent="font-mono text-text-primary"
                />
              </div>
            </Card>
          </div>

          {/* ── CPT / HCPCS Procedure Breakdown Table ─────────────────── */}
          {cptBreakdown.length > 0 && (
            <Card>
              <CardHeader
                icon={<IconClipboardCheck />}
                title={`CPT / HCPCS Procedure Verification (${cptBreakdown.length})`}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-inset/50">
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Code
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Description
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Covered
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Allowed Amount
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Copay
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Coinsurance
                      </th>
                      <th className="py-2.5 px-4 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                        Prior Auth
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {cptBreakdown.map((item, idx) => (
                      <tr key={item.code || idx} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-accent-subtle text-accent rounded-lg text-xs font-bold border border-[var(--color-accent-subtle)]">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-text-secondary">
                          {item.description || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {item.covered ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${getStatusBadgeClass(
                                item.covered
                              )}`}
                            >
                              {item.covered}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-text-primary">
                          {item.allowedAmount || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-accent">
                          {item.copay || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-accent">
                          {item.coinsurance || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-text-primary">
                          {item.priorAuthRequired || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Authorization, Referral, Buy & Bill & Formulary ───────── */}
          <Card>
            <CardHeader
              icon={<IconPhone />}
              title="Authorization, Referral, Buy & Bill & Formulary"
            />
            <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3.5 items-start">
              <StatCell
                label="Buy & Bill Allowed"
                value={s.buyAndBill}
                badge={getStatusBadgeClass(s.buyAndBill)}
              />
              <StatCell label="Benefit Channel" value={s.benefitChannel} />
              <StatCell
                label="PCP Referral Required"
                value={s.pcpReferralRequired || s.referralRequired}
              />
              <StatCell label="Prior Auth Required" value={s.priorAuthRequired} />
              <StatCell label="Auth Dept Phone" value={s.priorAuthPhone} />
              <StatCell label="Auth Dept Fax" value={s.priorAuthFax} />
              <StatCell
                label="Preferred / Formulary J-Codes"
                value={s.formularyPreferred || s.preferredFormulary}
                wide
              />
            </div>
          </Card>

          {/* ── Billing Action Items & Notes ──────────────────────────── */}
          {notes.length > 0 && (
            <Card>
              <CardHeader icon={<IconFileText />} title="Billing Action Items & Call Notes" />
              <div className="px-4 py-3.5">
                <ul className="space-y-2">
                  {notes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

