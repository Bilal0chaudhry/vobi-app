export async function queryAvailityEligibility(job) {
  const res = await fetch('http://localhost:8000/availity/eligibility', {
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
