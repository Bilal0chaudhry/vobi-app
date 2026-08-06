import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import InfoRow from './ui/InfoRow';
import Section from './ui/Section';
import BenefitCard from './ui/BenefitCard';
import Skeleton from './ui/Skeleton';
import { queryAvailityEligibility } from '../utils/api';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function PortalVobPage({ job, onBack, onJobUpdate }) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runLookup = async () => {
    setStatus(STATUS.LOADING);
    setError(null);
    try {
      const data = await queryAvailityEligibility(job);
      setResult(data);
      setStatus(STATUS.SUCCESS);
      onJobUpdate?.(job.id, { status: 'Verified (Portal)', availityResult: data });
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
      onJobUpdate?.(job.id, { status: 'Portal Error' });
    }
  };

  useEffect(() => {
    runLookup();
  }, []);

  const patient = result?.patient || {};
  const subscriber = result?.subscriber || {};
  const coverage = result?.coverage || {};
  const benefits = result?.benefits || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          id="btn-portal-back"
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            Portal Verification — {job.patientFirstName} {job.patientLastName}
          </h1>
          <p className="text-xs text-gray-500">
            {job.insurance} · Member #{job.memberId} · NPI {job.npi}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-[11px] font-semibold border border-brand-200">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Availity Portal
        </span>
      </div>

      {status === STATUS.LOADING && (
        <div>
          <div className="flex items-center gap-3 mb-5 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <span className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin shrink-0" />
            <p className="text-sm font-medium text-brand-700">
              Querying eligibility API…
            </p>
          </div>
          <Skeleton />
        </div>
      )}

      {status === STATUS.ERROR && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-700 mb-0.5">Portal lookup failed</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <Button id="btn-portal-retry" onClick={runLookup} variant="secondary" fullWidth>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Retry
          </Button>
        </div>
      )}

      {status === STATUS.SUCCESS && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {result.eligibilityStatus || 'Active Coverage Confirmed'}
              </p>
              {result.planName && (
                <p className="text-xs text-emerald-600">Plan: {result.planName}</p>
              )}
            </div>
            <Button
              id="btn-portal-refresh"
              onClick={runLookup}
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Refresh
            </Button>
          </div>

          <Section
            title="Patient"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          >
            <InfoRow label="Name" value={`${patient.name || job.patientFirstName + ' ' + job.patientLastName}`} />
            <InfoRow label="Date of Birth" value={patient.dob || job.dob} />
            <InfoRow label="Member ID" value={patient.memberId || subscriber.memberId || job.memberId} />
            <InfoRow label="Group #" value={subscriber.groupNumber} />
            <InfoRow label="Relationship" value={patient.relationship} />
          </Section>

          <Section
            title="Coverage"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          >
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
            <Section
              title={`Benefits (${benefits.length})`}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              }
            >
              <div className="py-2">
                {benefits.map((b, i) => (
                  <BenefitCard key={i} benefit={b} />
                ))}
              </div>
            </Section>
          )}

          <Section
            title="CPT Codes Verified"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          >
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
