// Facebook Pixel — chargement du script et déclenchement d'événements de
// suivi. Le pixel est injecté sur le site public d'une boutique quand le
// marchand a configuré son Pixel ID depuis le dashboard (table
// `facebook_pixel_config`).

import { supabase } from '@/lib/supabase';

type Fbq = (...args: unknown[]) => void;

interface FbqWithQueue extends Fbq {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: unknown;
  loaded?: boolean;
  version?: string;
}

function getWindow(): (Window & { fbq?: FbqWithQueue }) | undefined {
  if (typeof window === 'undefined') return undefined;
  return window as Window & { fbq?: FbqWithQueue };
}

/** Valide le format d'un Pixel ID Facebook (15 ou 16 chiffres). */
export function isValidPixelId(id: string): boolean {
  return /^\d{15,16}$/.test((id || '').trim());
}

let injected = false;
let initializedId: string | null = null;

/**
 * Identifiant de la boutique courante (pour rattacher les événements captés
 * au bon marchand dans le dashboard). Renseigné par le composant pixel au
 * chargement sur le site public.
 */
let pixelStoreId: number | string | null = null;

/**
 * Définit la boutique à laquelle rattacher les compteurs d'événements.
 * Appelé automatiquement quand le pixel est chargé sur le site public.
 */
export function setPixelStoreId(id: number | string | null): void {
  pixelStoreId = id;
}

/**
 * Enregistre localement (en base) un événement capté, pour alimenter le
 * compteur du dashboard. Fire-and-forget : n'interrompt jamais le suivi Meta.
 */
function recordEvent(event: string, params?: Record<string, unknown>): void {
  if (!pixelStoreId) return;
  try {
    void supabase
      .from('facebook_pixel_events')
      .insert({
        idcommerce: pixelStoreId,
        event_name: event,
        event_params: params ?? null,
      })
      .then(() => {})
      .catch(() => {
        /* enregistrement non bloquant */
      });
  } catch {
    /* enregistrement non bloquant */
  }
}

/**
 * Injecte le script de base Facebook (fbevents.js) et met en place le stub
 * `fbq` qui place les appels en file d'attente le temps du chargement.
 */
function injectBaseScript(): void {
  const w = getWindow();
  if (!w || typeof document === 'undefined') return;
  if (document.getElementById('fb-pixel-base')) {
    injected = true;
    return;
  }

  // Stub fbq : met les appels en file d'attente jusqu'à ce que fbevents.js
  // remplace ce stub et vide la file (comportement officiel Meta).
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      const queue = fbq.queue || (fbq.queue = []);
      queue.push(args);
    }
  } as FbqWithQueue;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  w.fbq = fbq;

  const script = document.createElement('script');
  script.id = 'fb-pixel-base';
  script.async = true;
  script.src = 'https://connect.facebook.net/fr_FR/fbevents.js';
  const first = document.getElementsByTagName('script')[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    document.head.appendChild(script);
  }
  injected = true;
}

/**
 * Charge le pixel pour un Pixel ID donné : injecte le script de base puis
 * fait l'`init`. Retourne `false` si l'ID est invalide (format incorrect).
 */
export function loadPixel(pixelId: string): boolean {
  const id = (pixelId || '').trim();
  if (!isValidPixelId(id)) return false;
  injectBaseScript();
  const w = getWindow();
  if (!w || !w.fbq) return false;
  if (initializedId !== id) {
    w.fbq('init', id);
    initializedId = id;
  }
  return true;
}

/**
 * Déclenche un événement de suivi (PageView, ViewContent, Lead, etc.).
 * Ne fait rien si le pixel n'a pas été chargé au préalable.
 */
export function trackEvent(event: string, params?: Record<string, unknown>): void {
  const w = getWindow();
  if (!w || !w.fbq) return;
  if (params) {
    w.fbq('track', event, params);
  } else {
    w.fbq('track', event);
  }
  recordEvent(event, params);
}

/**
 * Déclenche l'événement standard `Search` de Meta (une recherche a été
 * effectuée sur le site). À appeler quand l'utilisateur lance une recherche.
 */
export function trackSearch(searchString: string): void {
  const q = (searchString || '').trim();
  if (!q) return;
  trackEvent('Search', { search_string: q });
}

/**
 * Déclenche l'événement standard `AddToCart` de Meta (un article a été
 * ajouté au panier). À appeler quand un visiteur ajoute un produit.
 */
export function trackAddToCart(params: {
  content_ids?: string[];
  content_name?: string;
  value?: number;
  currency?: string;
  num_items?: number;
}): void {
  trackEvent('AddToCart', { content_type: 'product', ...params });
}

/**
 * Déclenche l'événement standard `Purchase` de Meta (une commande a été
 * validée). À appeler une fois la commande enregistrée.
 */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  content_ids?: string[];
  num_items?: number;
}): void {
  trackEvent('Purchase', { content_type: 'product', ...params });
}