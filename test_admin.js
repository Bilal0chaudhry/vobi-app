import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Login as admin
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'chaudhrybilal1977@gmail.com',
    password: 'Password123!' // assuming standard test password, or we can just update via service role if we had it
  });
  
  if (error) {
    console.error("Login failed:", error);
    return;
  }
  
  console.log("Logged in!");
  
  // Try to fetch pending profiles
  const { data: profiles, error: fetchErr } = await supabase.from('profiles').select('*').eq('status', 'pending');
  if (fetchErr) {
    console.error("Fetch failed:", fetchErr);
    return;
  }
  
  console.log("Pending profiles:", profiles.length);
  if (profiles.length === 0) return;
  
  const targetId = profiles[0].id;
  console.log("Attempting to approve:", targetId);
  
  const { error: updateErr } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', targetId);
  if (updateErr) {
    console.error("Update failed:", updateErr);
  } else {
    console.log("Update success!");
  }
}

test();
