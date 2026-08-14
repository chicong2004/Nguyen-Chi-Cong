import { createClient } from '@supabase/supabase-js';

let rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
let rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Ensure it starts with https://
if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}`;
}

// Remove trailing slashes
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

if (!rawUrl || !rawKey) {
  console.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.");
}

export const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
export const supabaseAnonKey = rawKey || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
