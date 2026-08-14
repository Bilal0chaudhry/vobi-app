import WebSocket from 'ws'; global.WebSocket = WebSocket;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://reihoaoqkrihxvuqifww.supabase.co',
  'sb_publishable_K4zB4PXTcBHn7Sj1UCaYkg_yhQsbmWQ'
);

async function testSignup() {
  console.log('Attempting signup...');
  const { data, error } = await supabase.auth.signUp({
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test User',
        organization: 'Test Org'
      }
    }
  });

  if (error) {
    console.error('Signup Error:', error);
  } else {
    console.log('Signup Success:', data.user?.id);
  }
}

testSignup();
