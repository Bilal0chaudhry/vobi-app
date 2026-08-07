import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import InfoRow from './ui/InfoRow';
import Section from './ui/Section';
import BenefitCard from './ui/BenefitCard';
import Skeleton from './ui/Skeleton';
import PatientDetails from './ui/PatientDetails';
import { queryAvailityEligibility } from '../utils/api';
import { 
  IconChevronLeft, 
  IconAlertCircle, 
  IconCheckCircleSolid, 
  IconRefresh, 
  IconShield, 
  IconFileText, 
  IconClipboardCheck 
} from './icons';

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
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            Portal Verification — {job.patientFirstName} {job.patientLastName}
          </h1>
          <p className="text-xs text-gray-500">
            {job.insurance} · Member #{job.memberId} · NPI {job.npi}
          </p>
        </div>
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
            <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-0.5">Portal lookup failed</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <Button id="btn-portal-retry" onClick={runLookup} variant="secondary" fullWidth>
            <IconRefresh className="w-4 h-4" />
            Retry
          </Button>
        </div>
      )}

      {status === STATUS.SUCCESS && result && (
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
            <Button
              id="btn-portal-refresh"
              onClick={runLookup}
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
            >
              <IconRefresh className="w-3.5 h-3.5" />
              Refresh
            </Button>
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
