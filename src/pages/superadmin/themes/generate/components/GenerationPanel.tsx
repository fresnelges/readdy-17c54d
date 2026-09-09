import { useState, useEffect } from 'react';
import type { ThemeReference } from '@/lib/themeReference';
import {
  fetchXaiKey,
  generateRedesignedFiles,
  convertAndSaveZifekTheme,
  downloadFilesZip,
  type GenerationResult,
} from '@/lib/themeReference';

export default function GenerationPanel({
  references,
  selectedId,
  onSelect,
  userId,
  userIdcommerce,
}: {
  references: ThemeReference[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  userId: number;
  userIdcommerce: string;
}) {
  const [themeName, setThemeName] = useState('');
  const [instructions, setInstructions] = useState(() => {
    try { return localStorage.getItem('theme-generator-instructions') || ''; } catch { return ''; }
  });
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const [result, setResult] = useState<GenerationResult | null>(null);
  const [savedInfo, setSavedInfo] = useState<{ themeId: number; pageCount: number } | null>(null);
  const [conversionWarnings, setConversionWarnings] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);

  const selected = references.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    fetchXaiKey().then((key) => setHasApiKey(!!key));
  }, []);

  // Pré-remplir le nom quand on sélectionne un thème
  useEffect(() => {
    if (selected && !themeName) {
      setThemeName(`${selected.name} — Redesign`);
    }
  }, [selected, themeName]);

  const handleGenerate = async () => {
    if (!selected) return;
    setError('');
    setResult(null);
    setSavedInfo(null);
    setConversionWarnings([]);

    setGenerating(true);
    try {
      const generation = await generateRedesignedFiles(selected, instructions, setProgress);
      setResult(generation);

      setProgress('Sauvegarde du thème Zifek...');
      const saved = await convertAndSaveZifekTheme(
        generation.files,
        themeName.trim() || `${selected.name} — Redesign`,
        userId,
        userIdcommerce,
        setProgress,
      );
      setSavedInfo({ themeId: saved.themeId, pageCount: saved.pageCount });
      setConversionWarnings(saved.warnings);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadFilesZip(result.files, themeName.trim() || 'theme');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <i className="ri-robot-line text-foreground-500"></i>
        <h3 className="text-sm font-semibold text-foreground-900">Générer un nouveau thème</h3>
      </div>

      {/* Clé API status */}
      <div className={`mb-4 px-3 py-2 rounded-md flex items-start gap-2 ${
        hasApiKey === null
          ? 'bg-background-100 border border-background-200/70'
          : hasApiKey
            ? 'bg-accent-50 border border-accent-100'
            : 'bg-amber-50 border border-amber-100'
      }`}>
        <i className={`text-sm flex-shrink-0 mt-0.5 ${
          hasApiKey === null
            ? 'ri-loader-4-line animate-spin text-foreground-400'
            : hasApiKey
              ? 'ri-check-line text-accent-500'
              : 'ri-alert-line text-amber-500'
        }`}></i>
        <span className="text-[11px] leading-relaxed ${
          hasApiKey === null
            ? 'text-foreground-500'
            : hasApiKey
              ? 'text-accent-800'
              : 'text-amber-800'
        }">
          {hasApiKey === null
            ? 'Vérification de la clé API Grok...'
            : hasApiKey
              ? 'Clé API xAI Grok configurée. La génération est prête.'
              : 'Aucune clé API xAI Grok configurée. Va dans les paramètres de la plateforme pour l\'ajouter.'}
        </span>
      </div>

      {/* Sélection du thème de référence */}
      <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Thème de référence</label>
      {references.length === 0 ? (
        <div className="h-10 px-3 rounded-md border border-background-200/70 bg-background-100 flex items-center">
          <span className="text-xs text-foreground-400">Importe d'abord un thème de référence à gauche</span>
        </div>
      ) : (
        <select
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
        >
          <option value="">— Choisir un thème —</option>
          {references.map((r) => (
            <option key={r.id} value={r.id}>{r.name}{r.type ? ` (${r.type})` : ''}</option>
          ))}
        </select>
      )}

      {selected && (
        <p className="text-[10px] text-foreground-400 mt-1.5">
          {selected.type ? `${selected.type} · ` : ''}{selected.files.filter((f) => f.type === 'php').length} fichiers PHP · {selected.files.filter((f) => f.type === 'css').length} fichiers CSS seront traités par l'IA.
        </p>
      )}

      {/* Nom du nouveau thème */}
      <div className="mt-4">
        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Nom du nouveau thème</label>
        <input
          type="text"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          placeholder="Nom du thème généré"
          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
        />
      </div>

      {/* Instructions de design */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground-600">Directives de design</label>
          {instructions.trim() && (
            <button
              onClick={() => { setInstructions(''); try { localStorage.removeItem('theme-generator-instructions'); } catch { /* */ } }}
              className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer whitespace-nowrap"
            >
              Effacer
            </button>
          )}
        </div>
        <textarea
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); try { localStorage.setItem('theme-generator-instructions', e.target.value); } catch { /* */ } }}
          placeholder={'Décris le nouveau design souhaité. L\'IA gardera tout le code PHP dynamique (produits, nom du site, listes...) et ne changera que l\'apparence.\n\nExemples :\n- Design minimaliste, beaucoup de blanc, accents terracotta\n- Thème sombre élégant avec typographie serif premium\n- Style moderne avec cartes arrondies et dégradés chauds'}
          rows={6}
          className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
        />
        <p className="text-[10px] text-foreground-400 mt-1">
          Le code dynamique PHP est <strong className="text-foreground-500">préservé à l'identique</strong>. Seul le design change.
        </p>
      </div>

      {/* Bouton générer */}
      <button
        onClick={handleGenerate}
        disabled={generating || !selected || hasApiKey === false}
        className="w-full h-11 mt-4 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {generating ? (
          <><i className="ri-loader-4-line animate-spin text-xs"></i>Génération en cours...</>
        ) : (
          <><i className="ri-magic-line"></i>Générer le thème</>
        )}
      </button>

      {/* Progression */}
      {generating && progress && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-md bg-background-100 border border-background-200/70">
          <i className="ri-loader-4-line animate-spin text-foreground-500"></i>
          <span className="text-xs text-foreground-600">{progress}</span>
        </div>
      )}

      {/* Erreur */}
      {error && !generating && (
        <div className="mt-3 px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
          <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      {/* Résultat */}
      {result && savedInfo && !generating && (
        <div className="mt-4 space-y-3">
          <div className="px-3 py-3 rounded-md bg-accent-50 border border-accent-100">
            <div className="flex items-center gap-2 mb-2">
              <i className="ri-check-double-line text-accent-600"></i>
              <span className="text-xs font-semibold text-accent-800">Thème généré et sauvegardé !</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-md p-2 text-center">
                <div className="text-base font-bold text-foreground-900">{savedInfo.pageCount}</div>
                <div className="text-[9px] text-foreground-500">pages</div>
              </div>
              <div className="bg-white rounded-md p-2 text-center">
                <div className="text-base font-bold text-foreground-900">{result.phpCount}</div>
                <div className="text-[9px] text-foreground-500">PHP redesignés</div>
              </div>
              <div className="bg-white rounded-md p-2 text-center">
                <div className="text-base font-bold text-foreground-900">{result.cssCount}</div>
                <div className="text-[9px] text-foreground-500">CSS redesignés</div>
              </div>
            </div>
          </div>

          {/* Warnings IA */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-100">
                  <i className="ri-alert-line text-amber-500 text-xs flex-shrink-0 mt-0.5"></i>
                  <span className="text-[10px] text-amber-800 leading-relaxed">{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings conversion */}
          {conversionWarnings.length > 0 && (
            <details className="px-3 py-2 rounded-md bg-background-100 border border-background-200/70">
              <summary className="text-[11px] text-foreground-500 cursor-pointer">Avertissements de conversion ({conversionWarnings.length})</summary>
              <div className="mt-2 space-y-1">
                {conversionWarnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-foreground-500 leading-relaxed">• {w}</p>
                ))}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full h-10 bg-accent-600 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-accent-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <><i className="ri-loader-4-line animate-spin text-xs"></i>Préparation...</>
              ) : (
                <><i className="ri-download-2-line"></i>Télécharger le ZIP PHP redesigné</>
              )}
            </button>
            <p className="text-[10px] text-foreground-400 text-center">
              Le thème Zifek est enregistré dans la liste des thèmes. Le ZIP contient les fichiers PHP redesignés (design changé, code dynamique intact).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}