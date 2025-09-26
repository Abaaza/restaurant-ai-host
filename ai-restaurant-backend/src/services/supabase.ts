import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://tpsurouaijayzetutqgy.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwc3Vyb3VhaWpheXpldHV0cWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzE1NTMsImV4cCI6MjA3MjkwNzU1M30.imNq7Yp1GS5Eniqi0xm32oyKqPG26qWyenXUa68X5mA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection
supabase.from('appointments').select('count').single().then(({ data, error }) => {
  if (error) {
    console.log('⚠️ Supabase connection test failed:', error.message);
  } else {
    console.log('✅ Supabase connected successfully');
  }
});