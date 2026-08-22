import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import { queryPortalEligibility } from '../../utils/api';
import { 
  IconChevronLeft, 
  IconAlertCircle, 
  IconRefresh
} from '../ui/icons';

/**
 * PortalVobPage — Loading & Error only.
 * 
 * This page is a "processing" screen. It fires the Stedi API call on mount,
 * shows a skeleton loader while waiting, and on success immediately hands off
 * to PortalResultPage via onComplete(data). It never renders results itself.
 * 
 * Data flow:
 *   Fresh lookup  →  PortalVobPage (loading/error)  →  onComplete(data)  →  PortalResultPage
 *   History open   →  fetchJobById (full query)  →  PortalResultPage directly
 */
export default function PortalVobPage({ job, onBack, onJobUpdate, onComplete }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const runLookup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await queryPortalEligibility(job);
      await onJobUpdate?.(job.id, { status: 'Verified (Portal)', stediResult: data });
      // Hand off to PortalResultPage immediately — no result rendering here
      onComplete?.(data);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      await onJobUpdate?.(job.id, { status: 'Portal Error' });
    }
  };

  useEffect(() => {
    runLookup();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          id="btn-portal-back"
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={isLoading}
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

      {isLoading && (
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

      {!isLoading && error && (
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
    </div>
  );
}
