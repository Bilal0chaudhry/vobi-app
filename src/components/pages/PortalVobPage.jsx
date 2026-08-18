import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import InfoRow from '../ui/InfoRow';
import Section from '../ui/Section';
import BenefitCard from '../ui/BenefitCard';
import Skeleton from '../ui/Skeleton';
import PatientDetails from '../ui/PatientDetails';
import { queryPortalEligibility } from '../../utils/api';
import { 
  IconChevronLeft, 
  IconAlertCircle, 
  IconCheckCircleSolid, 
  IconRefresh, 
  IconShield, 
  IconFileText, 
  IconClipboardCheck 
} from '../ui/icons';

const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function PortalVobPage({ job, onBack, onJobUpdate, onComplete }) {
  const [status, setStatus] = useState(STATUS.LOADING);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runLookup = async () => {
    setStatus(STATUS.LOADING);
    setError(null);
    try {
      const data = await queryPortalEligibility(job);
      setResult(data);
      setStatus(STATUS.SUCCESS);
      await onJobUpdate?.(job.id, { status: 'Verified (Portal)', stediResult: data });
      onComplete?.();
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
      await onJobUpdate?.(job.id, { status: 'Portal Error' });
      onComplete?.();
    }
  };

  useEffect(() => {
    runLookup();
  }, []);

  const patient = result?.patient || {};
  const coverage = result?.coverage || {};
  const benefits = result?.benefits || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          id="btn-portal-back"
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={status === STATUS.LOADING}
          title="Back"
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
              Querying Stedi eligibility portal…
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
          <div className="flex gap-3">
            <Button id="btn-portal-retry" onClick={runLookup} variant="secondary" fullWidth>
              <IconRefresh className="w-4 h-4" />
              Retry
            </Button>
            <Button onClick={onBack} variant="ghost" fullWidth>
              Back
            </Button>
          </div>
        </div>
      )}

      {status === STATUS.SUCCESS && result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <IconCheckCircleSolid className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {coverage.status || 'Active Coverage Confirmed'}
              </p>
              {coverage.planType && (
                <p className="text-xs text-emerald-600">Plan: {coverage.planType}</p>
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
          )}
        </div>
      )}
    </div>
  );
}
