/**
 * Configuration centralisée du domaine principal de l'application.
 *
 * Tous les liens de boutique (sous-domaines), l'URL du site principal et la
 * détection de sous-domaine DOIVENT passer par ce module afin de pouvoir
 * changer de domaine en un seul endroit (ex: zifek.fr -> zifek.com) sans
 * devoir chercher les occurrences en dur dans tout le code.
 *
 * ── HTTPS & reverse proxy ────────────────────────────────────
 * Le SSL (certificat wildcard) et le DNS sont gérés au niveau de
 * l'infrastructure VPS, PAS dans l'application. Aucune logique applicative
 * ne doit créer/renouveler de certificat. L'application est uniquement
 * compatible HTTPS et fonctionne derrière un reverse proxy (ex: NGINX) qui
 * termine le TLS. Le navigateur ne voit donc que du HTTPS : toutes les URLs
 * construites ici sont en `https://`, et la détection de protocole repose
 * sur `window.location.protocol` (jamais sur un en-tête proxy).
 */

import { normalizeUsername } from '@/lib/username';

export const APP_DOMAIN: string =
  (import.meta.env.VITE_PUBLIC_APP_DOMAIN as string) || 'zifek.fr';

/** Domaines reconnus comme le site principal (pas une boutique). */
export const MAIN_DOMAINS: string[] = ['localhost', '127.0.0.1', APP_DOMAIN];

/** URL du site principal (ex: https://zifek.fr). */
export function getMainSiteUrl(): string {
  return `https://${APP_DOMAIN}`;
}

/** Normalise un nom d'utilisateur en slug de sous-domaine hostname-safe. */
export function slugifyUsername(userName: string): string {
  return normalizeUsername(userName);
}

/** Construit l'URL complète du sous-domaine d'une boutique (ex: https://toto.zifek.fr). */
export function buildSubdomain(userName: string): string {
  return `https://${slugifyUsername(userName)}.${APP_DOMAIN}`;
}

/** Construit le sous-domaine sans protocole (ex: toto.zifek.fr). */
export function buildSubdomainHost(userName: string): string {
  return `${slugifyUsername(userName)}.${APP_DOMAIN}`;
}

/**
 * Fallback client HTTP → HTTPS (hors développement local).
 *
 * ⚠️ Ce n'est PAS le mécanisme principal de redirection : derrière un
 * reverse proxy HTTPS (NGINX), le redirect HTTP→HTTPS doit être un 301 au
 * niveau du serveur (NGINX). Cette fonction n'est qu'un filet de sécurité
 * pour le cas où le navigateur atteindrait l'app en HTTP direct.
 * Elle conserve le hostname courant et le chemin, ne modifie que le protocole.
 */
export function enforceHttps(): void {
  if (typeof window === 'undefined') return;
  const { protocol, hostname, pathname, search, hash } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost');
  if (isLocal) return;
  if (protocol === 'http:') {
    window.location.replace(`https://${hostname}${pathname}${search}${hash}`);
  }
}