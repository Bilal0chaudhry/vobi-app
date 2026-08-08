const API_BASE = 'https://towns-nested-obtaining-arnold.trycloudflare.com';

async function fetchWithConfig(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned ${res.status}`);
  }

  return res.json();
}

export function queryAvailityEligibility(job) {
  return fetchWithConfig('/availity/eligibility', {
    method: 'POST',
    body: JSON.stringify({
      payer: job.insurance,
      memberId: job.memberId,
      patientFirstName: job.patientFirstName,
      patientLastName: job.patientLastName,
      dob: job.dob,
      npi: job.npi,
      cptCodes: job.cptCodes,
    }),
  });
}

export function startCall(patientData) {
  return fetchWithConfig('/start-call', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
}

export function endCall() {
  return fetchWithConfig('/end-call', { method: 'POST' });
}

export function pollMessages(since = 0) {
  return fetchWithConfig(`/messages?since=${since}`);
}
