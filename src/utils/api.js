import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function fetchWithConfig(endpoint, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned ${res.status}`);
  }

  return res.json();
}

export function queryAvailityEligibility(job) {
  return fetchWithConfig("/availity/eligibility", {
    method: "POST",
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
  return fetchWithConfig("/start-call", {
    method: "POST",
    body: JSON.stringify(patientData),
  });
}

export function endCall() {
  return fetchWithConfig("/end-call", { method: "POST" });
}

export function pollMessages(since = 0) {
  return fetchWithConfig(`/messages?since=${since}`);
}

export function checkHealth() {
  return fetchWithConfig("/health").catch(() => null);
}
