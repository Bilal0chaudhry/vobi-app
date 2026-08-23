export const PAYERS = [
  'Aetna',
  'Blue Cross Blue Shield',
  'Cigna',
  'Humana',
  'Medicare',
  'UnitedHealthcare',
];

export const PAYER_PHONES = {
  'Aetna': '1-800-624-0756',
  'Blue Cross Blue Shield': '1-800-676-2583',
  'Cigna': '1-800-244-6224',
  'Humana': '1-800-448-6262',
  'Medicare': '1-800-633-4227',
  'UnitedHealthcare': '1-800-842-2656',
};

export const COMPLETED_STATUSES = ['Completed', 'Verified (Portal)', 'Portal Error', 'Call Error'];

export const isJobActive = (job) => {
  if (!job) return false;
  return !COMPLETED_STATUSES.includes(job.status);
};

export const buildChecklistItems = (job) => [
  { key: 'eligibility', label: 'Eligibility Status' },
  { key: 'networkStatus', label: 'Network Status' },
  { key: 'deductible', label: 'Deductible' },
  { key: 'oopMax', label: 'Out-of-Pocket Max' },
  { key: 'cpt1', label: `CPT ${job?.cptCodes?.[0] || '—'}` },
  ...(job?.cptCodes?.length > 1 ? [{ key: 'cpt2', label: `CPT ${job.cptCodes[1]}` }] : []),
  { key: 'copay', label: 'Copay / Coinsurance' },
  { key: 'buyAndBill', label: 'Buy & Bill' },
  { key: 'priorAuth', label: 'Prior Authorization' },
  { key: 'referral', label: 'PCP Referral' },
  { key: 'formulary', label: 'Formulary / Preferred Drug' },
];
