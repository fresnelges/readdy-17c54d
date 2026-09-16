/**
 * Validation et normalisation des noms d'utilisateur utilisés comme
 * sous-domaines de boutique (ex: username.zifek.fr).
 *
 * Toute la logique d'un username "hostname-safe" est centralisée ici afin
 * de garantir, quel que soit le point d'entrée (inscription pro, client,
 * future édition) :
 *   - l'unicité (complétée par un index unique `lower(user_name)` en base),
 *   - la normalisation (minuscules, sans accents, sans espaces),
 *   - l'insensibilité à la casse pour la résolution du sous-domaine,
 *   - la compatibilité avec un hostname DNS/URL,
 *   - la protection contre les caractères dangereux,
 *   - l'interdiction des sous-domaines réservés.
 */

/**
 * Sous-domaines réservés : ne peuvent JAMAIS devenir une boutique.
 * Inclut les mots explicitement demandés + les sous-domaines
 * d'infrastructure et applicatifs identifiés dans le projet (email, DNS,
 * zones internes, marketplace, comptes clients, environnements, médias,
 * sécurité, légal).
 */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  // Mots explicitement demandés
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp',
  'support', 'help', 'cdn', 'static', 'assets', 'dashboard',
  // Infra email / DNS (standard RFC + habitudes)
  'autoconfig', 'autodiscover', 'webmail', 'mx', 'mx1', 'mx2',
  'ns1', 'ns2', 'ns3', 'dns', 'imap', 'pop', 'pop3',
  // Zones applicatives internes du projet
  'blog', 'shop', 'store', 'checkout', 'payment', 'payments', 'billing',
  'invoice', 'invoices', 'account', 'accounts', 'login', 'logout',
  'register', 'signup', 'auth', 'session', 'settings', 'profile',
  'marketplace', 'mon-compte', 'mon-assistant', 'apps', 'appstore',
  // Environnements / pré-production
  'staging', 'dev', 'development', 'test', 'testing', 'demo', 'beta',
  'alpha', 'sandbox', 'preview',
  // Mobile / variantes
  'm', 'mobile', 'wap', 'touch', 'ios', 'android',
  // Médias / statique
  'img', 'image', 'images', 'media', 'files', 'file', 'uploads', 'upload',
  'docs', 'doc', 'video', 'videos', 'download', 'downloads',
  // Sécurité / réseau
  'secure', 'security', 'vpn', 'proxy', 'gateway', 'firewall', 'ssl', 'tls',
  // Services / monitoring
  'status', 'health', 'healthcheck', 'monitoring', 'metrics', 'graph',
  'logs', 'log',
  // Légal / navigation
  'about', 'contact', 'terms', 'privacy', 'legal', 'policy', 'faq',
  'feedback', 'newsletter',
  // Divers réservés fréquents
  'root', 'host', 'server', 'system',
];

/** Format hostname d'un label DNS : commence/termine par [a-z0-9], tirets internes autorisés. */
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Longueur minimale d'un label de sous-domaine lisible. */
export const USERNAME_MIN_LENGTH = 3;
/** Longueur maximale d'un label DNS (RFC 1035). */
export const USERNAME_MAX_LENGTH = 63;

export interface UsernameValidationResult {
  valid: boolean;
  /** Version normalisée (minuscules, sans accents, hostname-safe). */
  normalized: string;
  /** Message d'erreur lisible (présent uniquement si valid === false). */
  error?: string;
}

/**
 * Normalise un nom d'utilisateur en slug de sous-domaine valide :
 * - minuscules (insensibilité à la casse),
 * - suppression des accents (NFKD),
 * - espaces → tirets,
 * - suppression de tout caractère non [a-z0-9-].
 */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Indique si un slug fait partie des sous-domaines réservés. */
export function isReservedSubdomain(slug: string): boolean {
  return RESERVED_SUBDOMAINS.includes(slug);
}

/**
 * Valide un nom d'utilisateur destiné à devenir un sous-domaine.
 * Retourne la version normalisée et, le cas échéant, un message d'erreur.
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const normalized = normalizeUsername(raw);

  if (!raw.trim()) {
    return { valid: false, normalized, error: 'Le nom d\u2019utilisateur est obligatoire.' };
  }
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      normalized,
      error: `Le nom d\u2019utilisateur doit contenir au moins ${USERNAME_MIN_LENGTH} caract\u00e8res.`,
    };
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      normalized,
      error: `Le nom d\u2019utilisateur ne peut pas d\u00e9passer ${USERNAME_MAX_LENGTH} caract\u00e8res.`,
    };
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Le nom d\u2019utilisateur ne peut contenir que des lettres minuscules, des chiffres et des tirets (sans commencer ni finir par un tiret).',
    };
  }
  if (isReservedSubdomain(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Ce nom d\u2019utilisateur est r\u00e9serv\u00e9. Veuillez en choisir un autre.',
    };
  }
  return { valid: true, normalized };
}