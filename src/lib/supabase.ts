import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// Timeout généreux (10 minutes) pour les opérations lourdes
// (import de thèmes, gros payloads JSONB) afin d'éviter les erreurs
// de timeout quand l'upload prend du temps.
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

// Nombre de tentatives supplémentaires en cas d'erreur réseau transitoire
// ("Failed to fetch" = connexion interrompue / keep-alive périmé).
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError && err.message === 'Failed to fetch';

const fetchWithTimeout: typeof fetch = async (input, init) => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      lastError = err;
      // On relance uniquement sur une erreur réseau transitoire, pas sur
      // notre propre timeout (qui est déjà très généreux).
      if (attempt < MAX_RETRIES && isNetworkError(err)) {
        clearTimeout(timeoutId);
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * (attempt + 1)));
        continue;
      }
      clearTimeout(timeoutId);
      throw err;
    }
  }
  throw lastError;
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