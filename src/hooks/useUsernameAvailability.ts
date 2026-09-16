import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { validateUsername } from '@/lib/username';

export type UsernameAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid';

export interface UsernameAvailabilityResult {
  status: UsernameAvailabilityStatus;
  /** Message lisible à afficher (présent pour taken / invalid). */
  message?: string;
}

const DEBOUNCE_MS = 450;

/**
 * Vérifie en direct (avec debounce) si un nom d'utilisateur est disponible.
 *
 * Pendant la frappe, un statut `checking` est émis après un court délai,
 * puis la disponibilité est résolue contre la table `users` (insensible à la
 * casse). Le contrôle de validité local (format, longueur, mots réservés)
 * prime et court-circuite l'appel réseau.
 */
export function useUsernameAvailability(raw: string): UsernameAvailabilityResult {
  const [status, setStatus] = useState<UsernameAvailabilityStatus>('idle');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const timerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    // Vide → retour à l'état initial, aucune vérification.
    if (!raw.trim()) {
      setStatus('idle');
      setMessage(undefined);
      return;
    }

    const validation = validateUsername(raw);

    // Invalide localement → pas besoin d'appeler le backend.
    if (!validation.valid) {
      setStatus('invalid');
      setMessage(validation.error);
      return;
    }

    // Nom valide → on vérifie l'unicité en base (avec debounce).
    setStatus('checking');
    setMessage(undefined);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .ilike('user_name', validation.normalized);

        // Une frappe plus récente est arrivée entre-temps : on ignore ce résultat.
        if (seq !== requestSeqRef.current) return;

        if (error) {
          // En cas d'erreur réseau/backend, on n'affiche rien de bloquant.
          setStatus('idle');
          setMessage(undefined);
          return;
        }

        if (data && data.length > 0) {
          setStatus('taken');
          setMessage('Ce nom est d\u00e9j\u00e0 pris.');
        } else {
          setStatus('available');
          setMessage(undefined);
        }
      } catch {
        if (seq === requestSeqRef.current) {
          setStatus('idle');
          setMessage(undefined);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [raw]);

  return { status, message };
}