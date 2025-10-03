import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and public anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Anon url:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);

// Throw an error if the environment variables are not set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anon key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'gutzo-marketplace'
    }
  }
});