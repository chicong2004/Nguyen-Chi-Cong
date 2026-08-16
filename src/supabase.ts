import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://idxebmlumutqbwrmmebr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkeGVibWx1bXV0cWJ3cm1tZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTMzMTUsImV4cCI6MjEwMjQ2OTMxNX0.MRXN-Zl9I7Og4W08itXX1E4rnEmEU6-9WdGXbEDFRfk';

let rawUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
let rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

// Ensure it starts with https://
if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}`;
}

// Remove trailing slashes and /rest/v1 path if present
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

if (!rawUrl || !rawKey) {
  console.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.");
}

export const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
export const supabaseAnonKey = rawKey || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
