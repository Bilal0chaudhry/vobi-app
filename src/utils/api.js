const API_BASE = 'http://localhost:8000';

export async function queryAvailityEligibility(job) {
  const res = await fetch(`${API_BASE}/availity/eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned ${res.status}`);
  }

  return res.json();
}

export async function startCall(patientData) {
  const res = await fetch(`${API_BASE}/start-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned ${res.status}`);
  }

  return res.json();
}

export async function endCall() {
  const res = await fetch(`${API_BASE}/end-call`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned ${res.status}`);
  }
  return res.json();
}

export function getEventsUrl() {
  return `${API_BASE}/events`;
}
