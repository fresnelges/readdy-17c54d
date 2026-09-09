import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// Timeout généreux (10 minutes) pour les opérations lourdes
// (import de thèmes, gros payloads JSONB) afin d'éviter les erreurs
// de timeout quand l'upload prend du temps.
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return fetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timeoutId);
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'zifek-platform',
    },
    fetch: fetchWithTimeout,
  },
});