import { supabase } from './supabase';

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }
  return data;
}

export async function approveProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export async function rejectProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
