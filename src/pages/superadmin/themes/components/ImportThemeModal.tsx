import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import { uploadMediaFile } from '@/hooks/useUpload';
import { validateThemeManifest, type ManifestValidationIssue } from '@/lib/themeManifestValidator';

interface ThemeCategory {
  id: number;
  titre: string;
}

interface ZipThemeData {
  stylesheet: string;
  pages: Record<string, string>;
  info: {
    name?: string;
    description?: string;
    version?: string;
    category?: string;
    price?: string;
    exportedAt?: string;
    imageCouverture?: string;
  } | null;
}

const PAGE_DEF_KEYS = [
  'home', 'head', 'header', 'navmenu', 'apropos', 'blog',
  'detailsblog', 'booking', 'bookingsuccess', 'conditionsdutilisation',
  'connexion', 'login', 'creationcompte', 'contact', 'detailsform',
  'detailsproduit', 'detailsproduits', 'detailsservice', 'equipe',
  'fichierai', 'panier', 'politique', 'service', 'produits',
  'project', 'recuperation', 'resetpassword', 'retours', 'workspacepublic',
  'marketplace', 'marketplace-seller', 'marketplace-customer',
];

const PAGE_LABELS: Record<string, string> = {
  home: 'Page Home', head: 'Head', header: 'Header', navmenu: 'Nav Menu',
  apropos: 'Page À propos', blog: 'Page Blog', detailsblog: 'Détail Blog',
  booking: 'Page Booking', bookingsuccess: 'Booking Success',
  conditionsdutilisation: 'Conditions', connexion: 'Page Connexion',
  login: 'Page Login', creationcompte: 'Création Compte',
  contact: 'Page Contact', detailsform: 'Détail Formulaire',
  detailsproduit: 'Détail Produit', detailsproduits: 'Détail Produits',
  detailsservice: 'Détail Service', equipe: "Page Équipe",
  fichierai: 'Fichier AI', panier: 'Page Panier', politique: 'Politique',
  service: 'Page Services', produits: 'Boutique / Produits',
  project: 'Page Projet', recuperation: 'Récupération',
  resetpassword: 'Reset Password', retours: 'Page Retours',
  workspacepublic: 'Workspace Public',
  marketplace: 'Marketplace',
  'marketplace-seller': 'Page Vendeur',
  'marketplace-customer': 'Page Client',
};

const DEFAULT_STYLESHEET = `/* === RESET === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
body { font-family: 'Inter', 'Inter Display', system-ui, sans-serif; font-size: 15px; line-height: 1.65; color: var(--chart-fg, #2d2a26); background: var(--chart-bg, #faf8f5); }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }

/* === TYPOGRAPHY === */
h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; }
h1 { font-size: clamp(2.2rem, 4vw, 3.5rem); }
h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); }

/* === CONTAINER === */
.container { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }

/* === BUTTONS === */
.btn { display: inline-flex; align-items: center; padding: 12px 28px; border-radius: 9999px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 200ms ease; border: none; white-space: nowrap; }
.btn-primary { background: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, white); }
.btn-primary:hover { background: var(--chart-primary-dark, #a8543b); }
.btn-outline { background: transparent; color: var(--chart-primary, #c2654a); border: 1.5px solid var(--chart-primary, #c2654a); }
.btn-outline:hover { background: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, white); }

/* === HERO === */
.hero { padding: 100px 0 80px; text-align: center; background: linear-gradient(160deg, var(--chart-bg, #faf8f5), var(--chart-bg-alt, #f0ebe3)); }
.hero h1 { margin-bottom: 16px; }
.hero p { font-size: 16px; color: var(--chart-fg-muted, #6b5e53); max-width: 500px; margin: 0 auto 24px; }

/* === GRID === */
.grid-2, .grid-3, .grid-4 { display: grid; gap: 24px; }
@media (min-width: 640px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } .grid-4 { grid-template-columns: repeat(4, 1fr); } }

/* === CARDS === */
.card { background: white; border-radius: 12px; padding: 28px; border: 1px solid rgba(0,0,0,0.06); transition: all 250ms ease; }
.card:hover { transform: translateY(-2px); border-color: rgba(0,0,0,0.12); }
.card h3 { font-size: 16px; margin-bottom: 8px; font-family: 'Inter', sans-serif; letter-spacing: -0.01em; }
.card p { font-size: 13px; color: var(--chart-fg-muted, #6b5e53); }

/* === MARKETPLACE === */
.marketplace-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 640px) { .marketplace-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .marketplace-grid { grid-template-columns: repeat(4, 1fr); } }
.mp-card { background: white; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); transition: all 250ms ease; }
.mp-card:hover { border-color: rgba(0,0,0,0.12); transform: translateY(-2px); }
.mp-card img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.mp-card-body { padding: 16px; }
.mp-card-body h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.mp-card-body p { font-size: 12px; color: var(--chart-fg-muted, #6b5e53); }
.mp-price { font-size: 14px; font-weight: 700; color: var(--chart-primary, #c2654a); }

/* === FORMS === */
.form-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e0d8cf; border-radius: 10px; font-size: 14px; outline: none; }
.form-input:focus { border-color: var(--chart-primary, #c2654a); }

/* === FOOTER === */
.footer { background: var(--chart-fg, #1a1817); color: #b8a99a; padding: 48px 0 24px; text-align: center; font-size: 13px; }

/* === NAVBAR === */
.navbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; max-width: 1240px; margin: 0 auto; }
.navbar-links { display: flex; gap: 28px; list-style: none; font-size: 14px; }

/* === RESPONSIVE === */
@media (max-width: 767px) {
  .navbar-links { display: none; }
  .section { padding: 56px 0; }
  .hero { padding: 72px 0 56px; }
}`;

export default function ImportThemeModal({
  categories,
  onClose,
  onImported,
  userIdcommerce,
  userId,
}: {
  categories: ThemeCategory[];
  onClose: () => void;
  onImported: () => void;
  userIdcommerce: string;
  userId: number | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState('');
  const [error, setError] = useState('');
  const [importedData, setImportedData] = useState<ZipThemeData | null>(null);
  const [previewTab, setPreviewTab] = useState<'info' | 'pages' | 'css' | 'validation'>('info');

  // Manifest validation state
  const [manifestErrors, setManifestErrors] = useState<ManifestValidationIssue[]>([]);
  const [manifestWarnings, setManifestWarnings] = useState<ManifestValidationIssue[]>([]);
  const [hasManifest, setHasManifest] = useState(false);

  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageTab, setCoverImageTab] = useState<'url' | 'upload'>('url');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadCoverError, setUploadCoverError] = useState('');

  const parseZip = async (file: File): Promise<ZipThemeData> => {
    const zip = await JSZip.loadAsync(file);

    // Extract style.css
    let stylesheet = DEFAULT_STYLESHEET;
    const cssFile = zip.file('style.css');
    if (cssFile) {
      stylesheet = await cssFile.async('string');
    }

    // Extract pages
    const pages: Record<string, string> = {};
    const pagesFolder = zip.folder('pages');
    if (pagesFolder) {
      const pageFiles = Object.keys(pagesFolder.files);
      for (const filePath of pageFiles) {
        const match = filePath.match(/^pages\/(.+)\.html$/);
        if (match) {
          const pageKey = match[1];
          if (PAGE_DEF_KEYS.includes(pageKey)) {
            const content = await pagesFolder.file(`${pageKey}.html`)?.async('string') || '';
            pages[pageKey] = content;
          }
        }
      }
    }

    // Extract theme-manifest.json (new portable spec) or fallback to theme-info.json
    let info: ZipThemeData['info'] = null;
    let manifestRaw: unknown = null;
    const manifestFile = zip.file('theme-manifest.json');
    if (manifestFile) {
      setHasManifest(true);
      try {
        const manifestText = await manifestFile.async('string');
        manifestRaw = JSON.parse(manifestText);
        // ── Run validator ──
        const validation = validateThemeManifest(manifestRaw);
        setManifestErrors(validation.errors);
        setManifestWarnings(validation.warnings);

        const manifest = manifestRaw as Record<string, unknown>;
        const theme = (manifest.theme as Record<string, unknown>) || {};
        info = {
          name: (theme.name as string) || (manifest.name as string) || '',
          description: (theme.description as string) || (manifest.description as string) || '',
          version: (theme.version as string) || (manifest.version as string) || '1.0',
          category: (theme.category as string) || (manifest.category as string) || '',
          price: String(theme.price ?? manifest.price ?? '0'),
          exportedAt: (manifest.exportedAt as string) || null,
          imageCouverture: (theme.screenshot as string) || '',
        };

        // If validation has blocking errors, still show the import button but warn user
        if (!validation.valid) {
          setError(`Le manifeste contient ${validation.errors.length} erreur(s) bloquante(s). L'import peut échouer. Vérifie l'onglet Validation.`);
        }
      } catch (parseErr) {
        setHasManifest(true);
        setManifestErrors([{ path: '$', message: `JSON invalide — impossible de parser theme-manifest.json. ${parseErr instanceof Error ? parseErr.message : ''}` }]);
        setManifestWarnings([]);
        setError('Le fichier theme-manifest.json est corrompu (JSON invalide). Utilisation du fallback theme-info.json.');
      }
    } else {
      setHasManifest(false);
      setManifestErrors([]);
      setManifestWarnings([]);
    }

    // Fallback: extract theme-info.json (legacy)
    if (!info) {
      const infoFile = zip.file('theme-info.json');
      if (infoFile) {
        try {
          info = JSON.parse(await infoFile.async('string'));
        } catch { /* ignore malformed json */ }
      }
    }

    // Extract assets list from manifest if available
    if (manifestRaw && info) {
      const manifest = manifestRaw as Record<string, unknown>;
      const assets = manifest.assets as Record<string, unknown> | undefined;
      if (assets?.images && Array.isArray(assets.images) && assets.images.length > 0) {
        (info as Record<string, unknown>)._assets = manifest.assets;
      }
    }

    return { stylesheet, pages, info };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Le fichier doit être au format .zip');
      return;
    }

    setError('');
    setImportStep('Analyse du fichier ZIP...');
    setImporting(true);
    setManifestErrors([]);
    setManifestWarnings([]);
    setHasManifest(false);

    try {
      const data = await parseZip(file);
      setImportedData(data);

      // Pre-fill cover image from theme-info.json if available
      if (data.info?.imageCouverture) {
        setCoverImageUrl(data.info.imageCouverture);
        setCoverImageTab('url');
      } else {
        setCoverImageUrl('');
      }

      setImportStep('');
      setPreviewTab('info');
    } catch (err) {
      setError('Impossible de lire le fichier ZIP. Vérifie qu\'il s\'agit bien d\'un export de thème valide.');
      setImportedData(null);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadCoverError('');
    setUploadingCover(true);

    try {
      const url = await uploadMediaFile(file, 'theme-covers');
      setCoverImageUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      setUploadCoverError(msg);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importedData) return;

    // Warn if manifest has blocking errors
    if (manifestErrors.length > 0) {
      const confirmed = window.confirm(
        `⚠️ Le theme-manifest.json contient ${manifestErrors.length} erreur(s) bloquante(s).\n\n` +
        `L'import peut échouer ou produire un thème incomplet.\n\n` +
        `Veux-tu quand même continuer l'import ?`
      );
      if (!confirmed) return;
    }

    setImporting(true);
    setImportStep('Création du thème...');
    setError('');

    try {
      const { info, stylesheet, pages } = importedData;
      const themeName = info?.name || 'Thème importé';
      const themeDesc = info?.description || '';
      const themeVersion = info?.version || '1.0';
      const themePrice = info?.price || '0';

      // Find matching category
      let matchedCategory = '';
      if (info?.category && categories.length > 0) {
        const found = categories.find(
          (c) => c.titre.toLowerCase() === info.category!.toLowerCase()
        );
        matchedCategory = found ? String(found.id) : String(categories[0].id);
      } else {
        matchedCategory = categories.length > 0 ? String(categories[0].id) : '';
      }

      const dossierSlug = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const authorIdInt = userId ? parseInt(String(userId), 10) : 1;
      if (Number.isNaN(authorIdInt) || authorIdInt < 1) throw new Error('ID auteur invalide');

      const insertPayload: Record<string, unknown> = {
        titre: themeName,
        description: themeDesc,
        typetheme: matchedCategory,
        version: themeVersion,
        prix: themePrice,
        stylesheet,
        active: 0,
        idauteur: authorIdInt,
        dossier: dossierSlug,
        imagecouverture: coverImageUrl || info?.imageCouverture || '',
      };

      if (userIdcommerce) {
        insertPayload.idcommerce = userIdcommerce;
      }

      // Create the theme
      const { data: newTheme, error: insertError } = await supabase
        .from('sitewebtheme')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError || !newTheme) {
        throw new Error(`Erreur création thème : ${insertError?.message || 'inconnue'}`);
      }

      const newThemeId = newTheme.id;

      // Create pages
      setImportStep('Import des pages...');
      const pageInserts = PAGE_DEF_KEYS.map((key) => ({
        idtheme: newThemeId,
        page_key: key,
        title: PAGE_LABELS[key] || key,
        content: pages[key] || '',
      }));
      await supabase.from('sitewebthemepage').insert(pageInserts);

      // Create contenu
      setImportStep('Configuration du menu...');
      await supabase.from('sitewebthemecontenu').insert({
        idtheme: newThemeId,
        idshop: 1,
        titrenavmenudefaut: `${themeName} | Services | À propos | Contact`,
        descriptionnavmenudefault: `Navigation du thème ${themeName}`,
        imagebannierenavmenudefault: '',
      });

      // Create paramettre
      setImportStep('Configuration des paramètres...');
      await supabase.from('sitewebthemeparamettre').insert({
        idtheme: newThemeId,
        idcommerce: 1,
        titre: `${themeName} - Paramètres`,
        descriptionbanniere: `Bannière principale du thème ${themeName}`,
        imageaboutus: '',
        titreblocdecouvert: 'Découvrez nos services',
        descriptionblocdecouvert: `Contenu découverte du thème ${themeName}`,
        fichierblocdecouvert: '',
      });

      const pageCount = Object.keys(pages).filter((k) => pages[k]).length;
      const totalKeys = Object.keys(pages).length;
      setImportStep(`✅ Import réussi ! ${pageCount}/${totalKeys} pages avec contenu`);

      setTimeout(() => {
        onImported();
        onClose();
      }, 1200);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      setImportStep('');
    } finally {
      setImporting(false);
    }
  };

  const filledPages = importedData
    ? Object.entries(importedData.pages).filter(([, content]) => content)
    : [];

  const hasCoverImage = !!coverImageUrl;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={importing ? undefined : onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-background-50 rounded-lg border border-background-200/70 shadow-xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-background-200/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <i className="ri-upload-cloud-line text-sm text-foreground-500"></i>
            <h3 className="text-base font-semibold text-foreground-950">Importer un thème</h3>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">
          {!importedData ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-file-zip-line text-2xl text-foreground-400"></i>
                </div>
                <p className="text-sm text-foreground-700 font-medium mb-1">
                  Sélectionne un fichier ZIP de thème
                </p>
                <p className="text-xs text-foreground-400">
                  Le ZIP doit contenir <code className="bg-background-100 px-1.5 py-0.5 rounded text-[11px] font-mono">style.css</code>, un dossier <code className="bg-background-100 px-1.5 py-0.5 rounded text-[11px] font-mono">pages/</code> et optionnellement <code className="bg-background-100 px-1.5 py-0.5 rounded text-[11px] font-mono">theme-info.json</code>
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full h-14 rounded-lg border-2 border-dashed border-background-300/60 bg-background-100/50 flex items-center justify-center gap-3 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:border-foreground-300/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-base"></i>
                    <span>{importStep}</span>
                  </>
                ) : (
                  <>
                    <i className="ri-upload-cloud-line text-base"></i>
                    Clique pour choisir un fichier .zip
                  </>
                )}
              </button>

              {error && !importing && (
                <div className="px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
                  <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-accent-50 border border-accent-100">
                <i className="ri-check-line text-accent-600"></i>
                <span className="text-xs text-accent-800">
                  ZIP analysé — {filledPages.length}/{Object.keys(importedData.pages).length} pages avec contenu, CSS : {importedData.stylesheet.length.toLocaleString()} car.
                </span>
              </div>

              {/* Preview tabs */}
              <div className="flex items-center bg-background-100 rounded-full p-0.5 w-fit">
                {[
                  { key: 'info', label: 'Infos', icon: 'ri-information-line' },
                  { key: 'pages', label: `Pages (${filledPages.length})`, icon: 'ri-stack-line' },
                  { key: 'css', label: 'CSS', icon: 'ri-css3-line' },
                  ...(hasManifest ? [{
                    key: 'validation' as const,
                    label: `Validation ${manifestErrors.length > 0 ? `(${manifestErrors.length})` : manifestWarnings.length > 0 ? `(${manifestWarnings.length})` : ''}`,
                    icon: manifestErrors.length > 0 ? 'ri-error-warning-line' : manifestWarnings.length > 0 ? 'ri-alert-line' : 'ri-check-line',
                  }] : []),
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPreviewTab(tab.key as typeof previewTab)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                      previewTab === tab.key
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className={`${tab.icon} text-xs`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {previewTab === 'info' && (
                <div className="space-y-3">
                  {importedData.info ? (
                    <div className="space-y-1.5">
                      {importedData.info.name && (
                        <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                          <span className="text-xs text-foreground-500">Nom</span>
                          <span className="text-xs font-medium text-foreground-900">{importedData.info.name}</span>
                        </div>
                      )}
                      {importedData.info.description && (
                        <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                          <span className="text-xs text-foreground-500">Description</span>
                          <span className="text-xs text-foreground-700 max-w-[240px] truncate">{importedData.info.description}</span>
                        </div>
                      )}
                      {importedData.info.version && (
                        <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                          <span className="text-xs text-foreground-500">Version</span>
                          <span className="text-xs font-mono text-foreground-900">v{importedData.info.version}</span>
                        </div>
                      )}
                      {importedData.info.category && (
                        <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                          <span className="text-xs text-foreground-500">Catégorie</span>
                          <span className="text-xs bg-background-100 px-2 py-0.5 rounded-full text-foreground-700">{importedData.info.category}</span>
                        </div>
                      )}
                      {importedData.info.price && (
                        <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                          <span className="text-xs text-foreground-500">Prix</span>
                          <span className="text-xs font-medium text-foreground-900">{importedData.info.price === '0' ? 'Gratuit' : `${importedData.info.price} €`}</span>
                        </div>
                      )}
                      {importedData.info.exportedAt && (
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-foreground-500">Exporté le</span>
                          <span className="text-[11px] text-foreground-600 font-mono">
                            {new Date(importedData.info.exportedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-400 py-2">Aucune métadonnée (theme-info.json) trouvée dans le ZIP.</p>
                  )}

                  {/* Cover image section */}
                  <div className="p-4 rounded-lg border border-background-200/70 bg-background-100/50">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="ri-image-line text-foreground-600"></i>
                      <span className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">Image de couverture</span>
                      {importedData.info?.imageCouverture && (
                        <span className="text-[10px] bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded-full">Détectée dans le ZIP</span>
                      )}
                    </div>

                    {/* Tab switcher */}
                    <div className="flex items-center bg-background-100 rounded-full p-0.5 w-fit mb-3">
                      <button
                        onClick={() => { setCoverImageTab('url'); setUploadCoverError(''); }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          coverImageTab === 'url'
                            ? 'bg-background-50 text-foreground-900 shadow-sm'
                            : 'text-foreground-500 hover:text-foreground-700'
                        }`}
                      >
                        <i className="ri-link mr-1"></i>URL
                      </button>
                      <button
                        onClick={() => { setCoverImageTab('upload'); setUploadCoverError(''); }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          coverImageTab === 'upload'
                            ? 'bg-background-50 text-foreground-900 shadow-sm'
                            : 'text-foreground-500 hover:text-foreground-700'
                        }`}
                      >
                        <i className="ri-upload-cloud-line mr-1"></i>Upload
                      </button>
                    </div>

                    {coverImageTab === 'url' ? (
                      <input
                        type="text"
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        placeholder="https://... ou laisse vide pour ne pas mettre d'image"
                        className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-xs text-foreground-950 font-mono placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                      />
                    ) : (
                      <div className="space-y-2">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleCoverFileSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="w-full h-10 rounded-md border border-dashed border-background-300/60 bg-background-100/50 flex items-center justify-center gap-2 text-xs font-medium text-foreground-600 hover:text-foreground-800 hover:border-foreground-300/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingCover ? (
                            <>
                              <i className="ri-loader-4-line animate-spin"></i>
                              Upload en cours...
                            </>
                          ) : coverImageUrl && coverImageTab === 'upload' ? (
                            <>
                              <i className="ri-check-line text-accent-500"></i>
                              Image uploadée — cliquer pour changer
                            </>
                          ) : (
                            <>
                              <i className="ri-upload-cloud-line"></i>
                              Choisir un fichier (max 1 Mo)
                            </>
                          )}
                        </button>
                        {uploadCoverError && (
                          <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                            <i className="ri-error-warning-line text-xs"></i>
                            {uploadCoverError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cover preview */}
                    {hasCoverImage && (
                      <div className="relative rounded-md overflow-hidden bg-background-100 border border-background-200/70 h-32 mt-3">
                        <img
                          src={coverImageUrl}
                          alt="Aperçu couverture"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {!hasCoverImage && (
                      <p className="text-[10px] text-foreground-400 mt-2">
                        {importedData.info?.imageCouverture
                          ? "L'image de couverture du ZIP a été pré-remplie ci-dessus. Tu peux la changer."
                          : "Aucune image de couverture. Tu peux en ajouter une via URL ou upload."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {previewTab === 'pages' && (
                <div className="space-y-1">
                  {PAGE_DEF_KEYS.map((key) => {
                    const hasContent = !!importedData.pages[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-xs ${
                          hasContent ? 'bg-accent-50 text-accent-800' : 'bg-background-100 text-foreground-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <i className={`${hasContent ? 'ri-check-line text-accent-500' : 'ri-subtract-line'} text-sm`}></i>
                          <span>{PAGE_LABELS[key] || key}</span>
                        </div>
                        <span className="text-[10px] font-mono">
                          {hasContent ? `${importedData.pages[key].length} car.` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {previewTab === 'css' && (
                <div className="rounded-md border border-background-200/70 bg-background-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-background-200/70">
                    <span className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">style.css</span>
                    <span className="text-[10px] font-mono text-foreground-400">{importedData.stylesheet.length.toLocaleString()} car.</span>
                  </div>
                  <pre className="p-3 text-[11px] text-foreground-700 font-mono leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {importedData.stylesheet.slice(0, 2000)}
                    {importedData.stylesheet.length > 2000 && '\n\n...'}
                  </pre>
                </div>
              )}

              {previewTab === 'validation' && (
                <div className="space-y-3">
                  {/* Summary banner */}
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-md border ${
                    manifestErrors.length > 0
                      ? 'bg-red-50 border-red-100'
                      : manifestWarnings.length > 0
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-accent-50 border-accent-100'
                  }`}>
                    <i className={`${
                      manifestErrors.length > 0
                        ? 'ri-error-warning-line text-red-500'
                        : manifestWarnings.length > 0
                          ? 'ri-alert-line text-amber-500'
                          : 'ri-check-line text-accent-500'
                    }`}></i>
                    <span className={`text-xs font-medium ${
                      manifestErrors.length > 0
                        ? 'text-red-700'
                        : manifestWarnings.length > 0
                          ? 'text-amber-700'
                          : 'text-accent-700'
                    }`}>
                      {manifestErrors.length > 0
                        ? `${manifestErrors.length} erreur(s) bloquante(s) détectée(s) dans theme-manifest.json`
                        : manifestWarnings.length > 0
                          ? `${manifestWarnings.length} avertissement(s) — l'import fonctionnera mais vérifie ces points`
                          : 'Manifeste valide — aucun problème détecté'}
                    </span>
                  </div>

                  {/* Errors */}
                  {manifestErrors.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider px-1">
                        <i className="ri-error-warning-line mr-1"></i>Erreurs bloquantes
                      </div>
                      {manifestErrors.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-50/60 border border-red-100/60">
                          <span className="text-[10px] font-mono text-red-400 bg-red-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            {issue.path}
                          </span>
                          <span className="text-[11px] text-red-700 leading-relaxed">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {manifestWarnings.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider px-1">
                        <i className="ri-alert-line mr-1"></i>Avertissements
                      </div>
                      {manifestWarnings.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50/60 border border-amber-100/60">
                          <span className="text-[10px] font-mono text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            {issue.path}
                          </span>
                          <span className="text-[11px] text-amber-700 leading-relaxed">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* All clear */}
                  {manifestErrors.length === 0 && manifestWarnings.length === 0 && (
                    <div className="text-center py-4">
                      <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-2">
                        <i className="ri-check-line text-accent-500 text-lg"></i>
                      </div>
                      <p className="text-xs text-foreground-700 font-medium">Structure du manifeste conforme</p>
                      <p className="text-[10px] text-foreground-400 mt-1">Tous les champs obligatoires sont présents et correctement typés.</p>
                    </div>
                  )}

                  {/* Spec info */}
                  <div className="px-3 py-2.5 rounded-md bg-background-100 border border-background-200/70">
                    <div className="flex items-center gap-1.5 mb-1">
                      <i className="ri-information-line text-[10px] text-foreground-400"></i>
                      <span className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">Spécification</span>
                    </div>
                    <p className="text-[10px] text-foreground-500 leading-relaxed">
                      Le validateur vérifie la conformité avec la spec <strong>Portable Theme v1.0.0</strong>.
                      Les <strong className="text-red-600">erreurs</strong> empêchent le thème de fonctionner correctement.
                      Les <strong className="text-amber-600">avertissements</strong> signalent des maladresses mais n'empêchent pas l'import.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
                  <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}

              {/* Progress */}
              {importing && importStep && !importStep.startsWith('✅') && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-background-100 border border-background-200/70">
                  <i className="ri-loader-4-line animate-spin text-foreground-500"></i>
                  <span className="text-xs text-foreground-600">{importStep}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-5 h-14 border-t border-background-200/70 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            Annuler
          </button>
          {importedData && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  {importStep.startsWith('✅') ? 'Importé !' : 'Import...'}
                </>
              ) : (
                <>
                  <i className="ri-upload-cloud-line"></i>
                  Importer ce thème
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}