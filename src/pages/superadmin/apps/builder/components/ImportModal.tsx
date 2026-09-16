import { useRef, useState } from 'react';
import {
  parseAppZip,
  restoreAppFromZip,
  duplicateAppFromZip,
  type ParsedApp,
} from '../importApp';

interface ImportModalProps {
  appId: number;
  appName: string;
  onClose: () => void;
  onRestored: () => void;
}

type Mode = 'restore' | 'duplicate';

export default function ImportModal({ appId, appName, onClose, onRestored }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedApp | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mode, setMode] = useState<Mode>('restore');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicated, setDuplicated] = useState<{ id: number; nompage: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setError(null);
    setDuplicated(null);
    setParsed(null);
    setFile(f);
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setError('Veuillez sélectionner un fichier .zip (un export d\'app).');
      return;
    }
    setParsing(true);
    try {
      const result = await parseAppZip(f);
      setParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire ce fichier.');
    } finally {
      setParsing(false);
    }
  };

  const totalBlocks = parsed?.pages.reduce((sum, p) => sum + (p.blocks?.length || 0), 0) || 0;

  const handleImport = async () => {
    if (!file || !parsed || importing) return;
    setImporting(true);
    setError(null);
    try {
      if (mode === 'restore') {
        await restoreAppFromZip(appId, file);
        onRestored();
        onClose();
      } else {
        const res = await duplicateAppFromZip(file);
        setDuplicated(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-xl max-h-[90vh] overflow-y-auto bg-background-50 rounded-lg border border-background-200/70 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground-950">Importer une app</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        {duplicated ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center mb-4">
              <i className="ri-check-line text-2xl text-accent-600"></i>
            </div>
            <h4 className="text-sm font-semibold text-foreground-900">Nouvelle app créée !</h4>
            <p className="text-xs text-foreground-500 mt-1 mb-6">
              « {parsed?.manifest.name} » a été dupliquée avec tout son contenu.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`/superadmin/apps/${duplicated.id}`}
                className="px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer"
              >
                <i className="ri-tools-line mr-2"></i>
                Ouvrir dans le builder
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Zone de fichier */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            {!parsed && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  dragging ? 'border-primary-400 bg-primary-50' : 'border-background-200/70 bg-background-100'
                }`}
              >
                {parsing ? (
                  <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
                ) : (
                  <i className="ri-file-zip-line text-3xl text-foreground-400"></i>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground-700">
                    {parsing ? 'Lecture du fichier...' : 'Cliquez ou déposez un fichier .zip'}
                  </p>
                  <p className="text-xs text-foreground-400 mt-1">
                    Sélectionnez un export d'app généré par ce builder.
                  </p>
                </div>
              </div>
            )}

            {/* Résumé + choix du mode */}
            {parsed && (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background-100 border border-background-200/70 mb-5">
                  <div className="w-10 h-10 rounded-md bg-background-50 border border-background-200/70 flex items-center justify-center flex-shrink-0">
                    <i className="ri-apps-2-line text-lg text-foreground-500"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground-900 truncate">{parsed.manifest.name}</p>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      /dashboard/{parsed.manifest.nompage || '—'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-background-50 text-[11px] text-foreground-600 whitespace-nowrap">
                        {parsed.pages.length} pages
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-background-50 text-[11px] text-foreground-600 whitespace-nowrap">
                        {totalBlocks} blocs
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-background-50 text-[11px] text-foreground-600 whitespace-nowrap">
                        {parsed.forms.length} formulaires
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-background-50 text-[11px] text-foreground-600 whitespace-nowrap">
                        {parsed.tables.length} tables
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-background-50 text-[11px] text-foreground-600 whitespace-nowrap">
                        {parsed.settings.length} réglages
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setParsed(null); setError(null); }}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-200/70 text-foreground-400 hover:text-foreground-600 transition-colors cursor-pointer flex-shrink-0"
                    title="Changer de fichier"
                  >
                    <i className="ri-refresh-line"></i>
                  </button>
                </div>

                {/* Choix du mode */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-foreground-600 mb-2">Que souhaitez-vous faire ?</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setMode('restore')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        mode === 'restore' ? 'border-primary-400 bg-primary-50' : 'border-background-200/70 hover:bg-background-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-background-50 border border-background-200/70 flex items-center justify-center flex-shrink-0">
                        <i className="ri-arrow-go-back-line text-foreground-600"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-900">Restaurer cette app</p>
                        <p className="text-xs text-foreground-500 mt-0.5">
                          Remplace tout le contenu de « {appName} » par celui du fichier.
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setMode('duplicate')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        mode === 'duplicate' ? 'border-primary-400 bg-primary-50' : 'border-background-200/70 hover:bg-background-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-background-50 border border-background-200/70 flex items-center justify-center flex-shrink-0">
                        <i className="ri-file-copy-line text-foreground-600"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground-900">Créer une nouvelle app (dupliquer)</p>
                        <p className="text-xs text-foreground-500 mt-0.5">
                          Crée une copie indépendante, sans toucher à « {appName} ».
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200/60 text-red-600 text-xs mb-4">
                <i className="ri-error-warning-line flex-shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!parsed || importing}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'restore' ? 'bg-red-600 text-background-50 hover:bg-red-700' : 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
                }`}
              >
                {importing ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-upload-2-line"></i>}
                {importing ? 'Import…' : mode === 'restore' ? 'Restaurer' : 'Dupliquer'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}