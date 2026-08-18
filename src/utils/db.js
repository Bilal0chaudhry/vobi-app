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
    npi: j.npi,
    cptCodes: j.cpt_codes,
    status: j.status,
    availityResult: pd?.availity_result ?? j.availity_result ?? null,
    logs: cd?.call_logs || j.call_logs || [],
    checklist: cd?.checklist || j.checklist || {},
    source: j.source,
    createdAt: j.created_at,
  };
}

// Lightweight query for Dashboard & Call History — skips heavy JSONB columns
export async function fetchJobsList() {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, patient_first_name, patient_last_name, insurance, member_id, npi, cpt_codes, status, source, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }
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
      availity_result: jobData.availityResult || '{}',
    });
  }

  return fetchJobById(job.id);
}

export async function updateJob(jobId, updates) {
  if (updates.status !== undefined) {
    await supabase.from('jobs').update({ status: updates.status }).eq('id', jobId);
  }

  if (updates.availityResult !== undefined) {
    await supabase.from('portal_data').update({ availity_result: updates.availityResult }).eq('job_id', jobId);
  }

  const callUpdates = {};
  if (updates.logs !== undefined) callUpdates.call_logs = updates.logs;
  if (updates.checklist !== undefined) callUpdates.checklist = updates.checklist;

  if (Object.keys(callUpdates).length > 0) {
    await supabase.from('call_data').update(callUpdates).eq('job_id', jobId);
  }

  return fetchJobById(jobId);
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
