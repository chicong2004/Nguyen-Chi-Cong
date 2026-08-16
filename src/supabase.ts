import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://idxebmlumutqbwrmmebr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGVibWx1bXV0cWJ3cm1tZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTMzMTUsImV4cCI6MjEwMjQ2OTMxNX0.MRXN-Zl9I7Og4W08itXX1E4rnEmEU6-9WdGXbEDFRfk';

// Force connection to the new active Supabase project: idxebmlumutqbwrmmebr
let rawUrl = DEFAULT_SUPABASE_URL;
let rawKey = DEFAULT_SUPABASE_ANON_KEY;

if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('jtlhodnusbkqdpxgqhdj')) {
  rawUrl = import.meta.env.VITE_SUPABASE_URL.trim();
}
if (import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('jtlhodnusbkqdpxgqhdj')) {
  rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY.trim();
}

// Ensure it starts with https://
if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}`;
}

// Remove trailing slashes and /rest/v1 path if present
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

export const supabaseUrl = rawUrl;
export const supabaseAnonKey = rawKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
