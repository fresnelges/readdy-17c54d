// ============================================================
// Theme Manifest Validator — Portable Theme Spec v1.0.0
// Validates theme-manifest.json structure on import.
// ============================================================

export interface ManifestValidationIssue {
  path: string;
  message: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestValidationIssue[];
  warnings: ManifestValidationIssue[];
}

/**
 * Validates a theme-manifest.json object against the portable spec.
 * Errors = blocking (theme WILL fail to import correctly).
 * Warnings = non-blocking (imports but may behave unexpectedly).
 */
export function validateThemeManifest(raw: unknown): ManifestValidationResult {
  const errors: ManifestValidationIssue[] = [];
  const warnings: ManifestValidationIssue[] = [];

  // ── Must be an object ──
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push({ path: '$', message: 'Le manifeste doit être un objet JSON valide (pas un tableau, pas null).' });
    return { valid: false, errors, warnings };
  }

  const m = raw as Record<string, unknown>;

  // ── manifestVersion (required) ──
  const mv = m.manifestVersion;
  if (mv === undefined || mv === null) {
    errors.push({ path: 'manifestVersion', message: 'Champ obligatoire "manifestVersion" manquant. Le manifeste doit spécifier la version de la spec (ex: "1.0.0").' });
  } else if (typeof mv !== 'string') {
    errors.push({ path: 'manifestVersion', message: `"manifestVersion" doit être une chaîne (ex: "1.0.0"), reçu: ${typeof mv}.` });
  } else if (!/^\d+\.\d+\.\d+$/.test(mv.trim())) {
    warnings.push({ path: 'manifestVersion', message: `Format de version inhabituel "${mv}". Attendu: semver (ex: "1.0.0").` });
  }

  // ── theme (optional but must be object if present) ──
  if (m.theme !== undefined) {
    if (m.theme === null || typeof m.theme !== 'object' || Array.isArray(m.theme)) {
      errors.push({ path: 'theme', message: '"theme" doit être un objet, pas un tableau ni null.' });
    } else {
      const t = m.theme as Record<string, unknown>;

      // theme.name (required inside theme)
      if (t.name === undefined || t.name === null || (typeof t.name === 'string' && t.name.trim() === '')) {
        errors.push({ path: 'theme.name', message: '"theme.name" est obligatoire et ne peut pas être vide. C\'est le nom affiché du thème.' });
      } else if (typeof t.name !== 'string') {
        errors.push({ path: 'theme.name', message: `"theme.name" doit être une chaîne, reçu: ${typeof t.name}.` });
      }

      // theme.version (required inside theme)
      if (t.version === undefined || t.version === null) {
        errors.push({ path: 'theme.version', message: '"theme.version" est obligatoire. Ex: "1.0".' });
      } else if (typeof t.version !== 'string' && typeof t.version !== 'number') {
        errors.push({ path: 'theme.version', message: `"theme.version" doit être une chaîne ou un nombre, reçu: ${typeof t.version}.` });
      }

      // theme.description (optional, string)
      if (t.description !== undefined && t.description !== null && typeof t.description !== 'string') {
        warnings.push({ path: 'theme.description', message: `"theme.description" devrait être une chaîne, reçu: ${typeof t.description}.` });
      }

      // theme.author (optional, object)
      if (t.author !== undefined && t.author !== null) {
        if (typeof t.author !== 'object' || Array.isArray(t.author)) {
          warnings.push({ path: 'theme.author', message: '"theme.author" devrait être un objet { name, email, url }.' });
        }
      }

      // theme.category (optional, string)
      if (t.category !== undefined && t.category !== null && typeof t.category !== 'string') {
        warnings.push({ path: 'theme.category', message: `"theme.category" devrait être une chaîne, reçu: ${typeof t.category}.` });
      }

      // theme.price (optional, string or number)
      if (t.price !== undefined && t.price !== null && typeof t.price !== 'string' && typeof t.price !== 'number') {
        warnings.push({ path: 'theme.price', message: `"theme.price" devrait être une chaîne ou un nombre, reçu: ${typeof t.price}.` });
      }

      // theme.screenshot (optional, string)
      if (t.screenshot !== undefined && t.screenshot !== null && typeof t.screenshot !== 'string') {
        warnings.push({ path: 'theme.screenshot', message: `"theme.screenshot" devrait être une chaîne (chemin relatif), reçu: ${typeof t.screenshot}.` });
      }

      // theme.keywords (optional, array of strings)
      if (t.keywords !== undefined && t.keywords !== null) {
        if (!Array.isArray(t.keywords)) {
          warnings.push({ path: 'theme.keywords', message: '"theme.keywords" devrait être un tableau de chaînes.' });
        } else {
          const nonString = (t.keywords as unknown[]).filter((k) => typeof k !== 'string');
          if (nonString.length > 0) {
            warnings.push({ path: 'theme.keywords', message: `"theme.keywords" contient ${nonString.length} élément(s) non-chaîne (sera ignoré).` });
          }
        }
      }

      // theme.license (optional, string)
      if (t.license !== undefined && t.license !== null && typeof t.license !== 'string') {
        warnings.push({ path: 'theme.license', message: `"theme.license" devrait être une chaîne (ex: "MIT"), reçu: ${typeof t.license}.` });
      }
    }
  } else {
    warnings.push({ path: 'theme', message: 'Objet "theme" absent. Utilisation des métadonnées legacy (theme-info.json) si disponible.' });
  }

  // ── pages (optional, array of strings) ──
  if (m.pages !== undefined && m.pages !== null) {
    if (!Array.isArray(m.pages)) {
      warnings.push({ path: 'pages', message: '"pages" devrait être un tableau de clés de page (ex: ["home", "produits"]).' });
    } else {
      const nonStrings = (m.pages as unknown[]).filter((p) => typeof p !== 'string');
      if (nonStrings.length > 0) {
        warnings.push({ path: 'pages', message: `"pages" contient ${nonStrings.length} élément(s) non-chaîne.` });
      }
      if ((m.pages as unknown[]).length === 0) {
        warnings.push({ path: 'pages', message: '"pages" est un tableau vide. Aucune page listée dans le manifeste.' });
      }
    }
  }

  // ── templateTags (optional, object) ──
  if (m.templateTags !== undefined && m.templateTags !== null) {
    if (typeof m.templateTags !== 'object' || Array.isArray(m.templateTags)) {
      warnings.push({ path: 'templateTags', message: '"templateTags" devrait être un objet avec les clés "simple", "blocks", "marketplace".' });
    } else {
      const tt = m.templateTags as Record<string, unknown>;
      const validKeys = ['simple', 'blocks', 'marketplace'];
      for (const k of Object.keys(tt)) {
        if (!validKeys.includes(k)) {
          warnings.push({ path: `templateTags.${k}`, message: `Clé de template tags inconnue "${k}". Clés reconnues: ${validKeys.join(', ')}.` });
        } else if (!Array.isArray(tt[k])) {
          warnings.push({ path: `templateTags.${k}`, message: `"templateTags.${k}" devrait être un tableau de chaînes.` });
        }
      }
    }
  }

  // ── assets (optional, object) ──
  if (m.assets !== undefined && m.assets !== null) {
    if (typeof m.assets !== 'object' || Array.isArray(m.assets)) {
      warnings.push({ path: 'assets', message: '"assets" devrait être un objet { images: string[], fonts: string[] }.' });
    } else {
      const assets = m.assets as Record<string, unknown>;
      if (assets.images !== undefined && !Array.isArray(assets.images)) {
        warnings.push({ path: 'assets.images', message: '"assets.images" devrait être un tableau de chaînes.' });
      }
      if (assets.fonts !== undefined && !Array.isArray(assets.fonts)) {
        warnings.push({ path: 'assets.fonts', message: '"assets.fonts" devrait être un tableau de chaînes.' });
      }
    }
  }

  // ── compatibility (optional, object) ──
  if (m.compatibility !== undefined && m.compatibility !== null) {
    if (typeof m.compatibility !== 'object' || Array.isArray(m.compatibility)) {
      warnings.push({ path: 'compatibility', message: '"compatibility" devrait être un objet { zifekVersion, templateEngine }.' });
    } else {
      const comp = m.compatibility as Record<string, unknown>;
      if (comp.zifekVersion !== undefined && typeof comp.zifekVersion !== 'string') {
        warnings.push({ path: 'compatibility.zifekVersion', message: `"compatibility.zifekVersion" devrait être une chaîne (ex: ">=3.0.0"), reçu: ${typeof comp.zifekVersion}.` });
      }
      if (comp.templateEngine !== undefined && typeof comp.templateEngine !== 'string') {
        warnings.push({ path: 'compatibility.templateEngine', message: `"compatibility.templateEngine" devrait être une chaîne (ex: "2.0"), reçu: ${typeof comp.templateEngine}.` });
      }
    }
  }

  // ── exportedAt (optional, string) ──
  if (m.exportedAt !== undefined && m.exportedAt !== null) {
    if (typeof m.exportedAt !== 'string') {
      warnings.push({ path: 'exportedAt', message: `"exportedAt" devrait être une chaîne ISO 8601, reçu: ${typeof m.exportedAt}.` });
    } else if (Number.isNaN(Date.parse(m.exportedAt))) {
      warnings.push({ path: 'exportedAt', message: `"exportedAt" n'est pas une date ISO valide: "${m.exportedAt}".` });
    }
  }

  // ── Unknown top-level keys ──
  const knownKeys = ['manifestVersion', 'theme', 'pages', 'templateTags', 'assets', 'compatibility', 'exportedAt'];
  const extraKeys = Object.keys(m).filter((k) => !knownKeys.includes(k));
  for (const ek of extraKeys) {
    warnings.push({ path: ek, message: `Clé de premier niveau inconnue "${ek}". Serait-ce une faute de frappe ?` });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}