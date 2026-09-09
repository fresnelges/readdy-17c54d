import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { convertPhpZipToTheme } from '@/lib/phpThemeConverter';
import { uploadToSeaweedFS } from '@/lib/seaweedfs';
import { md5 } from '@/lib/md5';

// ============================================================
// Génération de thèmes basée sur un thème de référence PHP
// ============================================================

export interface ThemeReferenceFile {
  path: string;
  type: 'php' | 'css' | 'other';
  content?: string;
  url?: string;
  size?: number;
}

export interface ThemeReference {
  id: number;
  name: string;
  description: string;
  type: string;
  files: ThemeReferenceFile[];
  created_at: string;
}

export interface RedesignedFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  files: RedesignedFile[];
  phpCount: number;
  cssCount: number;
  warnings: string[];
}

// Clé xAI Grok (configurée dans la plateforme, table zifek)
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-4.6';

// Types de thèmes de référence disponibles à l'import
export const THEME_TYPES: string[] = [
  'Marketplace',
  'Marketplace de services',
  'Beauté / Esthétique',
  'Site touristique',
  'E-commerce / Boutique',
  'Restaurant / Food',
  'Portfolio / Créatif',
  'Blog / Magazine',
  'Immobilier',
  'Santé / Bien-être',
  'Éducation / Formation',
  'Événementiel',
  'Association / ONG',
  'Autre',
];

// Pages Zifek attendues (structure complète d'un thème)
export const ZIFEK_PAGE_DEFS: { key: string; label: string }[] = [
  { key: 'home', label: 'Page Home' },
  { key: 'head', label: 'Head' },
  { key: 'header', label: 'Header' },
  { key: 'navmenu', label: 'Nav Menu' },
  { key: 'footer', label: 'Footer' },
  { key: 'apropos', label: 'Page À propos' },
  { key: 'blog', label: 'Page Blog' },
  { key: 'detailsblog', label: 'Détail Blog' },
  { key: 'booking', label: 'Page Booking' },
  { key: 'bookingsuccess', label: 'Booking Success' },
  { key: 'conditionsdutilisation', label: 'Conditions' },
  { key: 'connexion', label: 'Page Connexion' },
  { key: 'login', label: 'Page Login' },
  { key: 'creationcompte', label: 'Création Compte' },
  { key: 'contact', label: 'Page Contact' },
  { key: 'detailsform', label: 'Détail Formulaire' },
  { key: 'detailsproduit', label: 'Détail Produit' },
  { key: 'detailsproduits', label: 'Détail Produits' },
  { key: 'detailsservice', label: 'Détail Service' },
  { key: 'equipe', label: 'Page Équipe' },
  { key: 'fichierai', label: 'Fichier AI' },
  { key: 'panier', label: 'Page Panier' },
  { key: 'politique', label: 'Politique' },
  { key: 'service', label: 'Page Services' },
  { key: 'produits', label: 'Boutique / Produits' },
  { key: 'project', label: 'Page Projet' },
  { key: 'recuperation', label: 'Récupération' },
  { key: 'resetpassword', label: 'Reset Password' },
  { key: 'retours', label: 'Page Retours' },
  { key: 'workspacepublic', label: 'Workspace Public' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'marketplace-seller', label: 'Page Vendeur' },
  { key: 'marketplace-customer', label: 'Page Client' },
  { key: 'faq', label: 'Page FAQ' },
  { key: 'gallery', label: 'Page Galerie' },
];

// ============================================================
// UTILITAIRES
// ============================================================

function detectFileType(path: string): 'php' | 'css' | 'other' {
  const lower = path.toLowerCase();
  if (lower.endsWith('.css')) return 'css';
  if (/\.(php|phtml|html|htm)$/.test(lower)) return 'php';
  return 'other';
}

function stripMarkdownFences(content: string): string {
  let c = content.trim();
  // ```php ... ``` ou ``` ... ```
  const fence = c.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fence) return fence[1].trim();
  // Bloc de code sans le dernier triple backtick
  const open = c.match(/^```[a-zA-Z]*\s*\n?/);
  if (open) {
    c = c.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }
  return c;
}

// ============================================================
// CLÉ API XAI
// ============================================================

export async function fetchXaiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from('zifek')
      .select('xai_api_key')
      .limit(1)
      .maybeSingle();
    return (data?.xai_api_key as string) || '';
  } catch {
    return '';
  }
}

// ============================================================
// CRUD THÈMES DE RÉFÉRENCE
// ============================================================

export async function fetchThemeReferences(): Promise<ThemeReference[]> {
  const { data, error } = await supabase
    .from('theme_references')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    name: (row.name as string) || 'Sans nom',
    description: (row.description as string) || '',
    type: (row.type as string) || 'Autre',
    files: (row.files as ThemeReferenceFile[]) || [],
    created_at: (row.created_at as string) || '',
  }));
}

export async function uploadReferenceTheme(
  files: File[],
  type: string,
  name?: string,
  onProgress?: (current: number, total: number, label: string) => void,
): Promise<ThemeReference> {
  if (!files.length) {
    throw new Error('Sélectionne au moins un fichier.');
  }

  // On ne garde que les fichiers texte (PHP, HTML, CSS)
  const textFiles = files.filter((f) => detectFileType(f.name) !== 'other');
  if (textFiles.length === 0) {
    throw new Error('Aucun fichier PHP/HTML/CSS détecté dans la sélection.');
  }

  const total = textFiles.length;
  const collected: ThemeReferenceFile[] = [];
  let phpCount = 0;

  for (let i = 0; i < textFiles.length; i += 1) {
    const file = textFiles[i];
    const fileType = detectFileType(file.name);
    onProgress?.(i + 1, total, file.name);

    try {
      // Envoi du fichier sur SeaweedFS (même système que les images Zifek),
      // on ne stocke que l'URL en base pour éviter les gros payloads JSONB.
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const contentType = fileType === 'css' ? 'text/css' : 'text/plain';
      const url = await uploadToSeaweedFS(uint8, file.name.toLowerCase(), contentType, 'theme-references');
      if (fileType === 'php') phpCount += 1;
      collected.push({ path: file.name, type: fileType, url, size: file.size });
    } catch {
      // Fallback : si SeaweedFS échoue, on garde le contenu en base
      try {
        const content = await file.text();
        if (fileType === 'php') phpCount += 1;
        collected.push({ path: file.name, type: fileType, content });
      } catch {
        // fichier illisible ignoré
      }
    }
  }

  if (phpCount === 0) {
    throw new Error('Aucun fichier PHP/HTML détecté dans la sélection.');
  }

  const themeName = name && name.trim()
    ? name.trim()
    : `Thème importé ${new Date().toLocaleDateString('fr-FR')}`;

  const { data, error } = await supabase
    .from('theme_references')
    .insert({
      name: themeName,
      description: '',
      type: type || 'Autre',
      files: collected,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Échec de la création du thème de référence');

  return {
    id: data.id as number,
    name: (data.name as string) || themeName,
    description: (data.description as string) || '',
    type: (data.type as string) || 'Autre',
    files: (data.files as ThemeReferenceFile[]) || collected,
    created_at: (data.created_at as string) || '',
  };
}

export async function deleteThemeReference(id: number): Promise<void> {
  const { error } = await supabase.from('theme_references').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// APPEL À GROK (xAI)
// ============================================================

async function callGrok(systemPrompt: string, userContent: string, apiKey: string): Promise<string> {
  const response = await fetch(XAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Grok ${response.status}: ${errText.slice(0, 200)}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('Réponse vide de Grok');
  return content;
}

function buildPhpSystemPrompt(instructions: string): string {
  const designPart = instructions.trim()
    ? `\n\n🎨 DESIGN À APPLIQUER (ta priorité absolue) :\n${instructions.trim()}`
    : '\n\n🎨 DESIGN À APPLIQUER : un redesign moderne, premium, raffiné, avec une palette sophistiquée (pas de bleu/violet générique), une typographie soignée, et des espacements généreux.';

  return `Tu es un designer web senior expert en PHP. Tu reçois le contenu d'un fichier PHP d'un thème de site web.

🎯 TA MISSION
Redessiner l'apparence visuelle de ce fichier (HTML, classes CSS, styles inline, couleurs, typographie, espacement, mise en page) en suivant les instructions de design fournies.

⛔ RÈGLES ABSOLUES (À NE JAMAIS VIOLER)
1. Conserve TOUT le code PHP dynamique EXACTEMENT à l'identique : les balises <?php ... ?> et <?= ... ?>, les requêtes PDO ($pdo->...), les boucles (foreach, while, for), les conditions (if/else/endif), les variables ($users, $lang, $produit, $service, etc.), et la manière dont les données dynamiques sont affichées (produits, nom du site, listes, prix, catégories).
2. Ne supprime, n'ajoute, ni ne modifie AUCUN code PHP. Chaque variable, chaque requête, chaque boucle, chaque condition doit rester rigoureusement identique. C'est LE point critique : si le PHP change, le site ne fonctionnera plus.
3. Tu changes UNIQUEMENT le DESIGN : la structure HTML de présentation, les noms de classes CSS, les styles inline, les couleurs, les polices, les espacements, la mise en page, le layout.
4. Garde les mêmes liens (href, action) et attributs fonctionnels.
5. Renvoie UNIQUEMENT le contenu complet du fichier redessiné, sans explication, sans commentaire, sans bloc de code markdown (pas de \`\`\`).${designPart}`;
}

function buildCssSystemPrompt(instructions: string): string {
  const designPart = instructions.trim()
    ? `\n\n🎨 DESIGN À APPLIQUER :\n${instructions.trim()}`
    : '\n\n🎨 DESIGN À APPLIQUER : moderne, premium, palette sophistiquée (pas de bleu/violet générique), typographie soignée.';

  return `Tu es un designer web senior. Tu reçois une feuille de style CSS d'un thème.

Redessine entièrement cette feuille de style pour appliquer le nouveau design demandé. Le CSS doit rester valide, complet et cohérent, responsive (mobile-first), avec au minimum 3 breakpoints.${designPart}

Renvoie UNIQUEMENT le CSS complet, sans explication, sans commentaire, sans bloc de code markdown (pas de \`\`\`).`;
}

// ============================================================
// LECTURE DU CONTENU D'UN FICHIER (URL SeaweedFS ou contenu inline)
// ============================================================

export async function fetchFileContent(file: ThemeReferenceFile): Promise<string> {
  if (file.url) {
    try {
      const resp = await fetch(file.url);
      if (resp.ok) {
        return await resp.text();
      }
    } catch {
      // on retombe sur le contenu inline
    }
  }
  return file.content || '';
}

// ============================================================
// GÉNÉRATION (redesign des fichiers via l'IA)
// ============================================================

export async function generateRedesignedFiles(
  reference: ThemeReference,
  instructions: string,
  onProgress: (message: string) => void,
): Promise<GenerationResult> {
  const apiKey = await fetchXaiKey();
  if (!apiKey) {
    throw new Error('Aucune clé API xAI Grok configurée. Va dans les paramètres de la plateforme pour la configurer.');
  }

  const phpFiles = reference.files.filter((f) => f.type === 'php');
  const cssFiles = reference.files.filter((f) => f.type === 'css');
  const total = phpFiles.length + cssFiles.length;
  const redesigned: RedesignedFile[] = [];
  const warnings: string[] = [];

  let index = 0;

  // 1. Redesign des fichiers PHP (le cœur dynamique)
  for (const file of phpFiles) {
    index += 1;
    onProgress(`Lecture de ${file.path} (${index}/${total})...`);
    const content = await fetchFileContent(file);
    if (!content.trim()) {
      warnings.push(`${file.path} : contenu vide, fichier ignoré.`);
      continue;
    }
    onProgress(`Redesign de ${file.path} (${index}/${total})...`);
    try {
      const raw = await callGrok(buildPhpSystemPrompt(instructions), content, apiKey);
      const clean = stripMarkdownFences(raw);
      if (clean.length < 20) {
        warnings.push(`${file.path} : réponse IA trop courte, fichier conservé à l'identique.`);
        redesigned.push({ path: file.path, content });
      } else {
        redesigned.push({ path: file.path, content: clean });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erreur inconnue';
      warnings.push(`${file.path} : ${msg} — fichier conservé à l'identique.`);
      redesigned.push({ path: file.path, content });
    }
  }

  // 2. Redesign des feuilles de style CSS
  for (const file of cssFiles) {
    index += 1;
    onProgress(`Lecture de ${file.path} (${index}/${total})...`);
    const content = await fetchFileContent(file);
    if (!content.trim()) {
      warnings.push(`${file.path} : contenu vide, fichier ignoré.`);
      continue;
    }
    onProgress(`Redesign de ${file.path} (${index}/${total})...`);
    try {
      const raw = await callGrok(buildCssSystemPrompt(instructions), content, apiKey);
      const clean = stripMarkdownFences(raw);
      if (clean.length < 50) {
        warnings.push(`${file.path} : réponse IA trop courte, CSS conservé à l'identique.`);
        redesigned.push({ path: file.path, content });
      } else {
        redesigned.push({ path: file.path, content: clean });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erreur inconnue';
      warnings.push(`${file.path} : ${msg} — CSS conservé à l'identique.`);
      redesigned.push({ path: file.path, content });
    }
  }

  return {
    files: redesigned,
    phpCount: phpFiles.length,
    cssCount: cssFiles.length,
    warnings,
  };
}

// ============================================================
// CONVERSION + SAUVEGARDE EN THÈME ZIFEK
// ============================================================

async function buildZipFromFiles(files: RedesignedFile[]): Promise<File> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'theme-redesign.zip', { type: 'application/zip' });
}

// Insère une ligne en base avec retry automatique.
// Utile pour les contenus volumineux (pages) qui peuvent déclencher
// un timeout côté serveur : on réessaie avec une attente progressive
// jusqu'à réussir, sans jamais abandonner prématurément.
async function insertRowWithRetry(
  table: string,
  row: Record<string, unknown>,
  maxAttempts = 6,
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { error } = await supabase.from(table).insert(row);
      if (!error) return;
      // Clé dupliquée = la ligne a déjà été insérée (réponse perdue après un timeout),
      // on considère l'opération comme réussie pour rester idempotent.
      if (/duplicate|already exists|23505/i.test(error.message)) return;
      lastError = new Error(error.message);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('erreur inconnue');
    }
    if (attempt < maxAttempts - 1) {
      // Attente progressive : 2s, 4s, 6s, 8s, 10s avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw lastError || new Error(`Échec d'insertion dans ${table}`);
}

// Insère le thème dans sitewebtheme avec retry automatique, en gérant le
// cas où un timeout masque une insertion qui a en réalité réussi (la ligne
// existe déjà côté serveur). Retourne l'id du thème créé.
async function insertThemeWithRetry(
  payload: Record<string, unknown>,
  maxAttempts = 5,
): Promise<number> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { data, error } = await supabase
        .from('sitewebtheme')
        .insert(payload)
        .select('id')
        .single();
      if (!error && data?.id) return data.id as number;
      lastError = new Error(error?.message || 'inconnue');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('erreur inconnue');
    }
    // En cas de timeout, la ligne a pu être insérée côté serveur malgré
    // l'erreur réseau : on vérifie son existence (par dossier + titre) pour
    // rester idempotent au lieu de créer un doublon.
    try {
      const { data: existing } = await supabase
        .from('sitewebtheme')
        .select('id')
        .eq('dossier', payload.dossier as string)
        .eq('titre', payload.titre as string)
        .maybeSingle();
      if (existing?.id) return existing.id as number;
    } catch {
      // on ignore : on retentera simplement l'insertion
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Échec de création du thème');
}

export async function convertAndSaveZifekTheme(
  files: RedesignedFile[],
  themeName: string,
  userId: number,
  userIdcommerce: string,
  onProgress: (message: string) => void,
): Promise<{ themeId: number; stylesheet: string; pageCount: number; warnings: string[] }> {
  onProgress('Conversion PHP → Zifek...');
  const zipFile = await buildZipFromFiles(files);
  const converted = await convertPhpZipToTheme(zipFile, () => undefined, undefined, 'php');

  // ── CORRECTIF TIMEOUT ──────────────────────────────────────────────
  // Les thèmes sources (Bootstrap, templates du commerce, etc.) embarquent
  // souvent leur CSS dans des balises <style> au beau milieu du HTML des pages.
  // Résultat : certaines pages (header, navmenu...) contiennent des centaines
  // de Ko de CSS, ce qui fait planter l'enregistrement en base par timeout.
  // On extrait ici toutes les balises <style> des pages et on les fusionne
  // dans le stylesheet du thème (colonne dédiée). Les pages ne gardent alors
  // qu'un HTML léger, et chaque insert devient quasi instantané.
  const uniqueStyleBlocks = new Map<string, string>();
  for (const key of Object.keys(converted.pages)) {
    const pageHtml = converted.pages[key] || '';
    if (!pageHtml) continue;
    const cleaned = pageHtml.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
      const normalized = css.trim();
      if (normalized) {
        // Déduplication : beaucoup de thèmes recopient le même <style>
        // (souvent tout Bootstrap) dans chaque page. Sans déduplication, le
        // stylesheet peut atteindre plusieurs Mo et faire planter l'insert en
        // timeout. On ne garde chaque bloc qu'une seule fois.
        const dedupeKey = md5(normalized.replace(/\s+/g, ' '));
        if (!uniqueStyleBlocks.has(dedupeKey)) {
          uniqueStyleBlocks.set(dedupeKey, normalized);
        }
      }
      return '';
    });
    converted.pages[key] = cleaned.trim();
  }
  if (uniqueStyleBlocks.size > 0) {
    const extractedStyleCss = Array.from(uniqueStyleBlocks.values()).join('\n');
    converted.stylesheet = `${converted.stylesheet || ''}\n/* === CSS extrait des balises <style> des pages === */\n${extractedStyleCss}`;
  }

  onProgress('Enregistrement du thème...');

  const dossierSlug = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const authorIdInt = Number.isNaN(userId) || userId < 1 ? 1 : userId;

  const insertPayload: Record<string, unknown> = {
    titre: themeName,
    description: `Thème généré par IA depuis un thème de référence`,
    typetheme: '',
    version: '1.0',
    prix: '0',
    stylesheet: converted.stylesheet,
    active: 0,
    idauteur: authorIdInt,
    dossier: dossierSlug,
    imagecouverture: '',
  };
  if (userIdcommerce) {
    insertPayload.idcommerce = userIdcommerce;
  }

  const newThemeId = await insertThemeWithRetry(insertPayload);

  // Pages — insérées UNE PAR UNE (et non par paquets) pour éviter les timeouts
  // sur les contenus volumineux. Chaque page est une petite requête indépendante,
  // et chacune est réessayée automatiquement en cas de timeout.
  const pageEntries = ZIFEK_PAGE_DEFS.map((def) => ({
    idtheme: newThemeId,
    page_key: def.key,
    title: def.label,
    content: converted.pages[def.key] || '',
  }));

  for (let i = 0; i < pageEntries.length; i += 1) {
    onProgress(`Enregistrement des pages (${i + 1}/${pageEntries.length})...`);
    try {
      await insertRowWithRetry('sitewebthemepage', pageEntries[i], 6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'inconnue';
      throw new Error(`Erreur import pages : ${msg}`);
    }
  }

  // Contenu menu
  await insertRowWithRetry('sitewebthemecontenu', {
    idtheme: newThemeId,
    idshop: 1,
    titrenavmenudefaut: `${themeName} | Services | À propos | Contact`,
    descriptionnavmenudefault: `Navigation du thème ${themeName}`,
    imagebannierenavmenudefault: '',
  }, 6);

  // Paramètres
  await insertRowWithRetry('sitewebthemeparamettre', {
    idtheme: newThemeId,
    idcommerce: 1,
    titre: `${themeName} - Paramètres`,
    descriptionbanniere: `Bannière principale du thème ${themeName}`,
    imageaboutus: '',
    titreblocdecouvert: 'Découvrez nos services',
    descriptionblocdecouvert: `Contenu découverte du thème ${themeName}`,
    fichierblocdecouvert: '',
  }, 6);

  const pageCount = pageEntries.filter((p) => p.content.trim()).length;

  return {
    themeId: newThemeId,
    stylesheet: converted.stylesheet,
    pageCount,
    warnings: converted.warnings,
  };
}

// ============================================================
// TÉLÉCHARGEMENT DU ZIP PHP
// ============================================================

export async function downloadFilesZip(files: RedesignedFile[], name: string): Promise<void> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-redesign.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}