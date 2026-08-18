import { supabase } from './supabase';

function mapJobToFrontend(j) {
  const cd = Array.isArray(j.call_data) ? j.call_data[0] : j.call_data;
  const pd = Array.isArray(j.portal_data) ? j.portal_data[0] : j.portal_data;

  return {
    id: j.id,
    patientFirstName: j.patient_first_name,
    patientLastName: j.patient_last_name,
    insurance: j.insurance,
    memberId: j.member_id,
    dob: j.dob,
    providerOrgName: j.provider_org_name,
    npi: j.npi,
    cptCodes: j.cpt_codes,
    status: j.status,
    stediResult: pd?.stedi_result ?? j.stedi_result ?? null,
    logs: cd?.call_logs || j.call_logs || [],
    checklist: cd?.checklist || j.checklist || {},
    source: j.source,
    createdAt: j.created_at,
  };
}

// Lightweight query for Dashboard & History — skips heavy JSONB columns
export async function fetchJobsList(userId) {
  const query = supabase
    .from('jobs')
    .select('id, patient_first_name, patient_last_name, insurance, member_id, dob, provider_org_name, npi, cpt_codes, status, source, created_at')
    .order('created_at', { ascending: false });

  // Explicit filter lets Postgres use idx_jobs_user_created directly
  if (userId) query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return [];
  return data.map(mapJobToFrontend);
}

// Full query for opening a specific job — includes call_data, portal_data
export async function fetchJobById(jobId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, call_data(*), portal_data(*)')
    .eq('id', jobId)
    .single();

  if (error) {
    return null;
  }
  return mapJobToFrontend(data);
}

export async function createJob(jobData, userId) {
  // 1. Insert base metadata
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      patient_first_name: jobData.patientFirstName,
      patient_last_name: jobData.patientLastName,
      insurance: jobData.insurance,
      member_id: jobData.memberId,
      dob: jobData.dob,
      provider_org_name: jobData.providerOrgName,
      npi: jobData.npi,
      cpt_codes: jobData.cptCodes,
      status: jobData.status || 'Pending',
      source: jobData.source || 'call',
    })
    .select()
    .single();

  if (jobError) throw jobError;

  // 2. Insert into appropriate child table
  if (job.source === 'call') {
    await supabase.from('call_data').insert({
      job_id: job.id,
      call_logs: jobData.logs || [],
      checklist: jobData.checklist || {},
    });
  } else if (job.source === 'portal') {
    await supabase.from('portal_data').insert({
      job_id: job.id,
      stedi_result: jobData.stediResult || '{}',
    });
  }

  return fetchJobById(job.id);
}

export async function updateJob(jobId, updates) {
  // Fire all writes in parallel for speed
  const promises = [];

  if (updates.status !== undefined) {
    promises.push(
      supabase.from('jobs').update({ status: updates.status }).eq('id', jobId)
    );
  }

  if (updates.stediResult !== undefined) {
    promises.push(
      supabase.from('portal_data').update({ stedi_result: updates.stediResult }).eq('job_id', jobId)
    );
  }

  const callUpdates = {};
  if (updates.logs !== undefined) callUpdates.call_logs = updates.logs;
  if (updates.checklist !== undefined) callUpdates.checklist = updates.checklist;

  if (Object.keys(callUpdates).length > 0) {
    promises.push(
      supabase.from('call_data').update(callUpdates).eq('job_id', jobId)
    );
  }

  await Promise.all(promises);
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchSettings(userId) {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

export async function updateSettings(userId, settingsData) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: userId, ...settingsData })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function approveProfile(userId) {
  const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId);
  if (error) throw error;
}

export async function rejectProfile(userId) {
  const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
  if (error) throw error;
}

export async function deleteAccount(userId) {
  const { error } = await supabase.rpc('admin_delete_user', { user_id: userId });
  if (error) throw error;
}

export async function deleteJob(jobId) {
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw error;
}
