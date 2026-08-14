import { supabase } from './supabase';

function mapJobToFrontend(j) {
  return {
    id: j.id,
    patientFirstName: j.patient_first_name,
    patientLastName: j.patient_last_name,
    insurance: j.insurance,
    memberId: j.member_id,
    npi: j.npi,
    cptCodes: j.cpt_codes,
    status: j.status,
    availityResult: j.availity_result,
    logs: j.call_logs || [],
    checklist: j.checklist || {},
    source: j.availity_result ? 'portal' : 'live',
    createdAt: j.created_at,
  };
}

export async function fetchJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }
  return data.map(mapJobToFrontend);
}

export async function createJob(jobData, userId) {
  const { data, error } = await supabase
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
      availity_result: jobData.availityResult || null,
      call_logs: jobData.logs || [],
      checklist: jobData.checklist || {},
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return mapJobToFrontend(data);
}

export async function updateJob(jobId, updates) {
  const dbUpdates = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.availityResult !== undefined) dbUpdates.availity_result = updates.availityResult;
  if (updates.logs !== undefined) dbUpdates.call_logs = updates.logs;
  if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;

  if (Object.keys(dbUpdates).length === 0) return null;

  const { data, error } = await supabase
    .from('jobs')
    .update(dbUpdates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return mapJobToFrontend(data);
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
