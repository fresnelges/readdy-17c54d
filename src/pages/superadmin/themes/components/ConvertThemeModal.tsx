import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { convertPhpZipToTheme, applyPageMappings, type ConvertThemeData, type SourceLanguage } from '@/lib/phpThemeConverter';

interface ThemeCategory {
  id: number;
  titre: string;
}

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

const PAGE_DEF_KEYS = Object.keys(PAGE_LABELS);

export default function ConvertThemeModal({
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
  const [step, setStep] = useState<'upload' | 'converting' | 'preview' | 'importing'>('upload');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [convertedData, setConvertedData] = useState<ConvertThemeData | null>(null);
  const [previewTab, setPreviewTab] = useState<'info' | 'pages' | 'css' | 'warnings' | 'mappings'>('info');
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [editingMappingFile, setEditingMappingFile] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('php');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Le fichier doit être au format .zip');
      return;
    }

    setError('');
    setProgress('Analyse du ZIP...');
    setConverting(true);
    setStep('converting');
    setCustomMappings({});
    setEditingMappingFile(null);

    try {
      const data = await convertPhpZipToTheme(file, (msg) => setProgress(msg), undefined, sourceLanguage);
      setConvertedData(data);
      setStep('preview');
      setPreviewTab('info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      setStep('upload');
    } finally {
      setConverting(false);
      setProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMappingChange = (phpFile: string, pageKey: string) => {
    if (!convertedData) return;

    const newMappings = { ...customMappings };
    if (pageKey) {
      newMappings[phpFile] = pageKey;
    } else {
      delete newMappings[phpFile];
    }
    setCustomMappings(newMappings);

    // Re-appliquer les mappings
    const mappingResult = applyPageMappings(
      convertedData.phpFilesOrdered,
      convertedData.htmlFiles,
      newMappings,
    );

    const pages = { ...mappingResult.pages };

    // S'assurer que les pages essentielles existent
    const essentialPages: Record<string, string> = {
      home: '<section class="hero"><div class="container"><h1>{{site_name}}</h1><p>{{site_description}}</p></div></section>\n<section class="section"><div class="container">{{services}}</div></section>\n<section class="section section-alt"><div class="container">{{products limit="6"}}</div></section>',
      header: '<header class="header">\n  <div class="container">\n    <nav class="navbar">\n      <a href="/" class="navbar-brand">{{site_name}}</a>\n      <ul class="navbar-links">\n        <li><a href="/">Accueil</a></li>\n        <li><a href="/service">Services</a></li>\n        <li><a href="/apropos">À propos</a></li>\n        <li><a href="/contact">Contact</a></li>\n      </ul>\n    </nav>\n  </div>\n</header>',
      footer: '<footer class="footer">\n  <div class="container">\n    <p>&copy; {{year}} {{site_name}}. Tous droits réservés.</p>\n  </div>\n</footer>',
    };

    for (const [key, fallback] of Object.entries(essentialPages)) {
      if (!pages[key] || !pages[key].trim()) {
        pages[key] = fallback;
      }
    }

    setConvertedData({
      ...convertedData,
      pages,
      pageMappings: mappingResult.pageMappings,
    });

    setEditingMappingFile(null);
  };

  const handleImport = async () => {
    if (!convertedData) return;

    setConverting(true);
    setStep('importing');
    setProgress('Création du thème...');
    setError('');

    try {
      const { info, stylesheet, pages } = convertedData;
      const themeName = info.name || (sourceLanguage === 'html' ? 'Thème HTML converti' : 'Thème PHP converti');
      const themeDesc = info.description || '';
      const themeVersion = info.version || '1.0';
      const themePrice = info.price || '0';

      let matchedCategory = '';
      if (info.category && categories.length > 0) {
        const found = categories.find(
          (c) => c.titre.toLowerCase() === info.category.toLowerCase()
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
        imagecouverture: '',
      };

      if (userIdcommerce) {
        insertPayload.idcommerce = userIdcommerce;
      }

      setProgress('Enregistrement du thème...');
      const { data: newTheme, error: insertError } = await supabase
        .from('sitewebtheme')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError || !newTheme) {
        throw new Error(`Erreur création thème : ${insertError?.message || 'inconnue'}`);
      }

      const newThemeId = newTheme.id;

      // Insérer les pages par batchs pour éviter le timeout
      setProgress('Import des pages (batch 1)...');
      const pageEntries = PAGE_DEF_KEYS.map((key) => ({
        idtheme: newThemeId,
        page_key: key,
        title: PAGE_LABELS[key] || key,
        content: pages[key] || '',
      }));

      const BATCH_SIZE = 3;
      const totalBatches = Math.ceil(pageEntries.length / BATCH_SIZE);

      for (let i = 0; i < pageEntries.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        setProgress(`Import des pages (batch ${batchNum}/${totalBatches})...`);
        const batch = pageEntries.slice(i, i + BATCH_SIZE);

        try {
          const { error: batchError } = await supabase
            .from('sitewebthemepage')
            .insert(batch);

          if (batchError) {
            throw new Error(`Erreur import pages batch ${batchNum}: ${batchError.message}`);
          }

          // Petit délai entre les batchs pour éviter de surcharger
          if (i + BATCH_SIZE < pageEntries.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (batchErr: unknown) {
          const msg = batchErr instanceof Error ? batchErr.message : 'Erreur batch';
          // Si un batch échoue, on tente une dernière fois avec un délai plus long
          setProgress(`Nouvelle tentative batch ${batchNum}...`);
          await new Promise(resolve => setTimeout(resolve, 800));
          const { error: retryError } = await supabase
            .from('sitewebthemepage')
            .insert(batch);
          if (retryError) {
            throw new Error(`Échec batch ${batchNum} après retry: ${retryError.message}`);
          }
        }
      }

      setProgress('Configuration du menu...');
      await supabase.from('sitewebthemecontenu').insert({
        idtheme: newThemeId,
        idshop: 1,
        titrenavmenudefaut: `${themeName} | Services | À propos | Contact`,
        descriptionnavmenudefault: `Navigation du thème ${themeName}`,
        imagebannierenavmenudefault: '',
      });

      setProgress('Configuration des paramètres...');
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

      const filledPages = Object.values(pages).filter(c => c.trim()).length;
      setProgress(`✅ ${filledPages} pages converties et importées !`);

      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      setStep('preview');
    } finally {
      setConverting(false);
      setProgress('');
    }
  };

  const filledPageCount = convertedData
    ? Object.values(convertedData.pages).filter(c => c.trim()).length
    : 0;

  const converterFeatures = sourceLanguage === 'html'
    ? [
        'Détecte et injecte les template tags Zifek ({{site_name}}, {{year}}, etc.)',
        'Préserve le design HTML et la structure originale',
        'Extrait et fusionne tous les CSS (fichiers .css + balises <style>)',
        'Mappe les fichiers .html vers les pages Zifek',
        'Détecte les formulaires et grilles de contenu',
      ]
    : sourceLanguage === 'php+html'
      ? [
          'Détecte et résout les includes PHP (header.php, footer.php, etc.)',
          'Convertit les balises PHP/WP en template tags Zifek',
          'Nettoie le code PHP pour garder uniquement le HTML structurel',
          'Extrait et fusionne tous les fichiers CSS',
          'Mappe les templates vers les pages Zifek',
        ]
      : [
          'Détecte et résout les includes PHP (header.php, footer.php, etc.)',
          'Convertit les balises WordPress en template tags Zifek',
          'Extrait et fusionne tous les fichiers CSS',
          'Mappe les templates PHP vers les pages Zifek',
          'Nettoie le code PHP pour garder uniquement le HTML structurel',
        ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={converting ? undefined : onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-background-50 rounded-lg border border-background-200/70 shadow-xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-background-200/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <i className="ri-code-s-slash-line text-sm text-foreground-500"></i>
            <h3 className="text-base font-semibold text-foreground-950">
              {sourceLanguage === 'html' ? 'Convertir un thème HTML' : sourceLanguage === 'php+html' ? 'Convertir un thème PHP+HTML' : 'Convertir un thème PHP'}
            </h3>
            {step === 'preview' && (
              <span className="text-[10px] bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full">Converti</span>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={converting}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className={`text-3xl text-foreground-400 ${sourceLanguage === 'html' ? 'ri-html5-line' : sourceLanguage === 'php+html' ? 'ri-code-s-slash-line' : 'ri-php-line'}`}></i>
                </div>
                <h4 className="text-sm font-semibold text-foreground-900 mb-1">
                  {sourceLanguage === 'html' ? 'Convertisseur HTML → Zifek' : sourceLanguage === 'php+html' ? 'Convertisseur PHP+HTML → Zifek' : 'Convertisseur PHP → Zifek'}
                </h4>
                <p className="text-xs text-foreground-500 max-w-md mx-auto leading-relaxed">
                  {sourceLanguage === 'html'
                    ? 'Importe un thème codé en HTML pur et le convertit automatiquement en thème Zifek. Les template tags sont injectés intelligemment (titre, copyright, formulaires) et le design original est préservé.'
                    : sourceLanguage === 'php+html'
                      ? 'Importe un thème mixte PHP+HTML et le convertit en thème Zifek. Le code PHP est nettoyé, les includes résolus, et le HTML structurel est préservé avec des template tags Zifek.'
                      : 'Importe un thème codé en PHP pur (WordPress, custom) et le convertit automatiquement en thème Zifek compatible avec les template tags.'
                  }
                </p>

                {/* Sélecteur de langage */}
                <div className="mt-5 mx-auto max-w-xs">
                  <p className="text-[10px] font-medium text-foreground-500 mb-2 uppercase tracking-wider">Langage des fichiers du ZIP</p>
                  <div className="flex bg-background-100 rounded-full p-0.5">
                    {([
                      { key: 'php' as SourceLanguage, label: 'PHP', icon: 'ri-php-line' },
                      { key: 'php+html' as SourceLanguage, label: 'PHP + HTML', icon: 'ri-code-s-slash-line' },
                      { key: 'html' as SourceLanguage, label: 'HTML', icon: 'ri-html5-line' },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSourceLanguage(opt.key)}
                        className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          sourceLanguage === opt.key
                            ? 'bg-background-50 text-foreground-900 shadow-sm'
                            : 'text-foreground-500 hover:text-foreground-700'
                        }`}
                      >
                        <i className={`${opt.icon} text-xs`}></i>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-background-100 border border-background-200/70 text-left">
                  <p className="text-[11px] font-semibold text-foreground-700 mb-2">Ce que le convertisseur fait :</p>
                  <ul className="space-y-1.5">
                    {converterFeatures.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-foreground-600">
                        <i className="ri-check-line text-accent-500 text-xs mt-0.5 flex-shrink-0"></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-left">
                  <div className="flex items-start gap-2">
                    <i className="ri-information-line text-amber-500 text-sm flex-shrink-0 mt-0.5"></i>
                    <div>
                      <p className="text-[11px] font-semibold text-amber-700 mb-1">Limitations</p>
                      <p className="text-[10px] text-amber-600 leading-relaxed">
                        {sourceLanguage === 'html'
                          ? 'Le HTML est converti tel quel. Les listes de contenu répétitives (grilles de cartes) sont détectées mais pas automatiquement remplacées — ajoute {{products}} ou {{services}} manuellement après import. Les formulaires HTML doivent être reconnectés via l\'onglet Formulaires Zifek.'
                          : 'La conversion est automatique mais pas parfaite. Le code PHP dynamique (boucles, conditions complexes) est simplifié. Les fonctionnalités WordPress avancées (widgets, shortcodes, custom post types) ne sont pas converties. Une relecture manuelle des pages est recommandée après import.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
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
                className="w-full h-14 rounded-lg border-2 border-dashed border-background-300/60 bg-background-100/50 flex items-center justify-center gap-3 text-sm font-medium text-foreground-600 hover:text-foreground-800 hover:border-foreground-300/60 transition-colors cursor-pointer"
              >
                <i className="ri-upload-cloud-line text-base"></i>
                {sourceLanguage === 'html'
                  ? 'Clique pour choisir un ZIP de thème HTML'
                  : 'Clique pour choisir un ZIP de thème PHP'
                }
              </button>

              <p className="text-[10px] text-foreground-400 text-center">
                {sourceLanguage === 'html'
                  ? 'Le ZIP doit contenir des fichiers .html et .css à la racine.'
                  : 'Le ZIP doit contenir des fichiers .php et .css à la racine. Formats supportés : WordPress, thèmes PHP custom.'
                }
              </p>

              {error && (
                <div className="px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
                  <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'converting' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-loader-4-line animate-spin text-2xl text-accent-500"></i>
              </div>
              <p className="text-sm font-medium text-foreground-900 mb-1">Conversion en cours...</p>
              <p className="text-xs text-foreground-500">{progress || 'Patientez...'}</p>
            </div>
          )}

          {step === 'preview' && convertedData && (
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-accent-50 border border-accent-100">
                <i className="ri-check-line text-accent-600"></i>
                <span className="text-xs text-accent-800">
                  Conversion réussie — {filledPageCount} pages, {convertedData.detectedFiles.length} fichiers analysés, CSS : {convertedData.stylesheet.length.toLocaleString()} car.
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center bg-background-100 rounded-full p-0.5 w-fit flex-wrap gap-0.5">
                {[
                  { key: 'info', label: 'Résumé', icon: 'ri-information-line' },
                  { key: 'pages', label: `Pages (${filledPageCount})`, icon: 'ri-stack-line' },
                  { key: 'mappings', label: `Mapping (${convertedData.pageMappings.length}${Object.keys(customMappings).length > 0 ? ` · ${Object.keys(customMappings).length} custom` : ''})`, icon: 'ri-git-branch-line' },
                  { key: 'css', label: 'CSS', icon: 'ri-css3-line' },
                  ...(convertedData.warnings.length > 0 ? [{
                    key: 'warnings' as const,
                    label: `Avert. (${convertedData.warnings.length})`,
                    icon: 'ri-alert-line',
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-background-100 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground-900">{convertedData.detectedFiles.length}</div>
                      <div className="text-[10px] text-foreground-500 mt-0.5">fichiers analysés</div>
                    </div>
                    <div className="bg-background-100 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground-900">{filledPageCount}</div>
                      <div className="text-[10px] text-foreground-500 mt-0.5">pages converties</div>
                    </div>
                    <div className="bg-background-100 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground-900">{convertedData.stylesheet.length.toLocaleString()}</div>
                      <div className="text-[10px] text-foreground-500 mt-0.5">car. CSS</div>
                    </div>
                    <div className="bg-background-100 rounded-lg p-3 text-center">
                      <div className={`text-xl font-bold ${convertedData.warnings.length > 0 ? 'text-amber-500' : 'text-accent-500'}`}>{convertedData.warnings.length}</div>
                      <div className="text-[10px] text-foreground-500 mt-0.5">avertissements</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {convertedData.info.name && (
                      <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                        <span className="text-xs text-foreground-500">Nom détecté</span>
                        <span className="text-xs font-medium text-foreground-900">{convertedData.info.name}</span>
                      </div>
                    )}
                    {convertedData.info.description && (
                      <div className="flex items-center justify-between py-1.5 border-b border-background-200/70">
                        <span className="text-xs text-foreground-500">Description</span>
                        <span className="text-xs text-foreground-700 max-w-[320px] truncate">{convertedData.info.description}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-foreground-500">Version</span>
                      <span className="text-xs font-mono text-foreground-900">v{convertedData.info.version}</span>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'pages' && (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {PAGE_DEF_KEYS.map((key) => {
                    const hasContent = convertedData.pages[key] && convertedData.pages[key].trim();
                    const contentLen = hasContent ? convertedData.pages[key].length : 0;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs ${
                          hasContent ? 'bg-accent-50 text-accent-800' : 'bg-background-100 text-foreground-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <i className={`${hasContent ? 'ri-check-line text-accent-500' : 'ri-subtract-line'} text-sm`}></i>
                          <span>{PAGE_LABELS[key] || key}</span>
                          {hasContent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-100 text-accent-600 font-medium">convertie</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono">
                          {hasContent ? `${contentLen.toLocaleString()} car.` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {previewTab === 'mappings' && (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {/* Fichiers mappés (via mapping auto ou custom) */}
                  {convertedData.phpFilesOrdered.map((phpFile) => {
                    const currentMapping = customMappings[phpFile];
                    const autoMapping = convertedData.pageMappings.find(m => m.phpFile === phpFile);
                    const effectivePageKey = currentMapping !== undefined
                      ? currentMapping
                      : (autoMapping?.pageKey || '');

                    const hasContent = convertedData.htmlFiles[phpFile] && convertedData.htmlFiles[phpFile].trim();
                    const isEditing = editingMappingFile === phpFile;
                    const isCustom = currentMapping !== undefined;
                    const isAutoMapped = !!autoMapping && !isCustom;
                    const isUnmapped = !effectivePageKey;

                    return (
                      <div
                        key={phpFile}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-xs group transition-colors ${
                          isUnmapped
                            ? 'bg-red-50 border border-red-100'
                            : isCustom
                              ? 'bg-accent-50 border border-accent-200/50'
                              : isAutoMapped
                                ? 'bg-background-100'
                                : 'bg-background-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <i className={`text-sm flex-shrink-0 ${
                            isUnmapped ? 'ri-forbid-line text-red-400' :
                            isCustom ? 'ri-edit-line text-accent-500' :
                            'ri-git-branch-line text-foreground-400'
                          }`}></i>
                          <span className="font-mono text-foreground-700 truncate text-[11px]" title={phpFile}>
                            {phpFile}
                          </span>
                          {isEditing ? (
                            <select
                              value={effectivePageKey}
                              onChange={(e) => handleMappingChange(phpFile, e.target.value)}
                              className="text-[11px] border border-background-300/60 rounded-md px-2 py-1 bg-background-50 text-foreground-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-400 flex-shrink-0"
                              autoFocus
                              onBlur={() => setEditingMappingFile(null)}
                            >
                              <option value="">Non mappé</option>
                              {PAGE_DEF_KEYS.map((key) => (
                                <option key={key} value={key}>
                                  {PAGE_LABELS[key] || key}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                              isUnmapped
                                ? 'bg-red-100 text-red-600'
                                : isCustom
                                  ? 'bg-accent-100 text-accent-700'
                                  : 'bg-background-200/70 text-foreground-500'
                            }`} title={effectivePageKey || 'Non mappé'}>
                              {effectivePageKey ? (PAGE_LABELS[effectivePageKey] || effectivePageKey) : 'Non mappé'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {hasContent && (
                            <span className="text-[9px] font-mono text-foreground-400">
                              {convertedData.htmlFiles[phpFile].length.toLocaleString()} car.
                            </span>
                          )}
                          <button
                            onClick={() => setEditingMappingFile(isEditing ? null : phpFile)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background-200/70 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Changer le mapping"
                          >
                            <i className={`text-xs ${isEditing ? 'ri-close-line text-red-400' : 'ri-pencil-line text-foreground-500'}`}></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {convertedData.phpFilesOrdered.length === 0 && (
                    <p className="text-xs text-foreground-400 py-4 text-center">Aucun fichier source détecté.</p>
                  )}

                  {/* Légende */}
                  <div className="flex items-center gap-4 pt-3 mt-1 border-t border-background-200/70">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-background-200/70 flex-shrink-0"></span>
                      <span className="text-[9px] text-foreground-500">Auto</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-200/50 flex-shrink-0"></span>
                      <span className="text-[9px] text-foreground-500">Custom</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-100 flex-shrink-0"></span>
                      <span className="text-[9px] text-foreground-500">Non mappé</span>
                    </div>
                    <span className="text-[9px] text-foreground-400 ml-auto">
                      Survoler une ligne pour éditer
                    </span>
                  </div>
                </div>
              )}

              {previewTab === 'css' && (
                <div className="rounded-md border border-background-200/70 bg-background-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-background-200/70">
                    <span className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">style.css (fusionné)</span>
                    <span className="text-[10px] font-mono text-foreground-400">{convertedData.stylesheet.length.toLocaleString()} car.</span>
                  </div>
                  <pre className="p-3 text-[11px] text-foreground-700 font-mono leading-relaxed overflow-x-auto max-h-56 whitespace-pre-wrap">
                    {convertedData.stylesheet.slice(0, 2500)}
                    {convertedData.stylesheet.length > 2500 && '\n\n...'}
                  </pre>
                </div>
              )}

              {previewTab === 'warnings' && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {convertedData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-100">
                      <i className="ri-alert-line text-amber-500 text-sm flex-shrink-0 mt-0.5"></i>
                      <span className="text-[11px] text-amber-800 leading-relaxed">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
                  <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mb-4">
                <i className="ri-loader-4-line animate-spin text-2xl text-foreground-500"></i>
              </div>
              <p className="text-sm font-medium text-foreground-900 mb-1">Import en cours...</p>
              <p className="text-xs text-foreground-500">{progress || 'Patientez...'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 h-14 border-t border-background-200/70 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={converting}
            className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            Annuler
          </button>
          {step === 'preview' && convertedData && (
            <button
              onClick={handleImport}
              disabled={converting}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i className="ri-upload-cloud-line"></i>
              Importer le thème converti
            </button>
          )}
        </div>
      </div>
    </>
  );
}