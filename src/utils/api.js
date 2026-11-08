import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function fetchWithConfig(endpoint, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((d) => d.msg).join('; ')
      : err.detail;
    throw new Error(detail || `Server returned ${res.status}`);
  }

  return res.json();
}

export function queryPortalEligibility(job) {
  return fetchWithConfig("/portal/eligibility", {
    method: "POST",
    body: JSON.stringify({
      payer: job.insurance,
      memberId: job.memberId,
      patientFirstName: job.patientFirstName,
      patientLastName: job.patientLastName,
      dob: job.dob,
      npi: job.npi,
      providerOrgName: job.providerOrgName,
    }),
  });
}

export function startCall(patientData) {
  return fetchWithConfig("/start-call", {
    method: "POST",
    body: JSON.stringify(patientData),
  });
}

export function endCall(jobId) {
  const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return fetchWithConfig(`/end-call${query}`, { method: "POST" });
}

export function pollMessages(jobId, since = 0) {
  return fetchWithConfig(`/messages?job_id=${encodeURIComponent(jobId)}&since=${since}`);
}

export function generateCallSummary(jobId, job = {}, regenerate = false) {
  const logs = Array.isArray(job.logs)
    ? job.logs
        .filter((l) => l && (l.source === "VOBI" || l.source === "REP") && l.message)
        .map((l) => ({ source: String(l.source), message: String(l.message) }))
    : [];

  return fetchWithConfig(`/calls/${encodeURIComponent(jobId)}/summary`, {
    method: "POST",
    body: JSON.stringify({
      patientFirstName: job.patientFirstName || "",
      patientLastName: job.patientLastName || "",
      insurance: job.insurance || "",
      memberId: job.memberId || "",
      dob: job.dob || "",
      providerOrgName: job.providerOrgName || "",
      npi: job.npi || "",
      cptCodes: Array.isArray(job.cptCodes) ? job.cptCodes : [],
      logs,
      regenerate: Boolean(regenerate),
    }),
  });
}

export function checkHealth() {
  return fetchWithConfig("/health").catch(() => null);
}
