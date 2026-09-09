import { useState, useRef } from 'react';
import { THEME_TYPES, fetchFileContent } from '@/lib/themeReference';
import type { ThemeReference, ThemeReferenceFile } from '@/lib/themeReference';
import { formatFileSize } from '@/lib/seaweedfs';

export default function ReferenceThemesPanel({
  references,
  selectedId,
  loading,
  onSelect,
  onUpload,
  onDelete,
}: {
  references: ThemeReference[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
  onUpload: (files: File[], type: string, name: string, onProgress?: (current: number, total: number, label: string) => void) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<ThemeReferenceFile | null>(null);
  const [themeType, setThemeType] = useState<string>('Marketplace');
  const [themeName, setThemeName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  const selected = references.find((r) => r.id === selectedId) || null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError('');
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, label: 'Préparation...' });
    try {
      await onUpload(files, themeType, themeName, (current, total, label) => {
        setUploadProgress({ current, total, label });
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openViewer = async (file: ThemeReferenceFile) => {
    setViewingFile(file);
    setViewingContent(null);
    setViewingLoading(true);
    try {
      const content = await fetchFileContent(file);
      setViewingContent(content);
    } catch {
      setViewingContent('Impossible de lire le fichier.');
    } finally {
      setViewingLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) {
      setDeletingId(null);
      try {
        await onDelete(id);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Erreur suppression');
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 2500);
    }
  };

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="ri-folder-line text-foreground-500"></i>
          <h3 className="text-sm font-semibold text-foreground-900">Thèmes de référence</h3>
        </div>
      </div>

      {/* Nom + type de thème + upload */}
      <div className="mb-3 space-y-2">
        <div>
          <label className="block text-[11px] font-medium text-foreground-500 mb-1">Nom du thème</label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="Ex. Mon thème beauté"
            className="w-full h-9 px-2.5 rounded-md border border-background-200/70 bg-background-50 text-xs text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-foreground-500 mb-1">Type de thème</label>
          <select
            value={themeType}
            onChange={(e) => setThemeType(e.target.value)}
            className="w-full h-9 px-2.5 rounded-md border border-background-200/70 bg-background-50 text-xs text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 cursor-pointer"
          >
            {THEME_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-foreground-950 text-background-50 text-xs font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <><i className="ri-loader-4-line animate-spin"></i>Upload...</>
          ) : (
            <><i className="ri-upload-cloud-2-line"></i>Uploader des fichiers</>
          )}
        </button>

        {uploading && uploadProgress && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-foreground-500 truncate flex-1 pr-2">
                {uploadProgress.label || 'Préparation...'}
              </span>
              <span className="text-[10px] text-foreground-400 whitespace-nowrap">
                {uploadProgress.current}/{uploadProgress.total}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-background-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                style={{ width: `${uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".php,.phtml,.html,.htm,.css"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploadError && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
          <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
          <span className="text-xs text-red-700">{uploadError}</span>
        </div>
      )}

      <p className="text-[11px] text-foreground-400 mb-3">
        Sélectionne plusieurs fichiers <code className="font-mono bg-background-100 px-1 rounded">.php</code>, <code className="font-mono bg-background-100 px-1 rounded">.html</code> ou <code className="font-mono bg-background-100 px-1 rounded">.css</code> pour t'en servir comme base de génération.
      </p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <i className="ri-loader-4-line animate-spin text-foreground-400 text-xl"></i>
        </div>
      ) : references.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-background-300/60 rounded-lg bg-background-100/40">
          <i className="ri-file-code-line text-3xl text-foreground-300 block mb-2"></i>
          <p className="text-xs text-foreground-500">Aucun thème de référence</p>
          <p className="text-[11px] text-foreground-400 mt-1">Upload tes premiers fichiers pour commencer</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1">
          {references.map((ref) => {
            const isSelected = ref.id === selectedId;
            const phpCount = ref.files.filter((f) => f.type === 'php').length;
            const cssCount = ref.files.filter((f) => f.type === 'css').length;
            return (
              <div
                key={ref.id}
                onClick={() => onSelect(ref.id)}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-foreground-950 bg-background-100/60'
                    : 'border-background-200/70 bg-background-50 hover:border-background-300/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <i className={`text-sm flex-shrink-0 ${isSelected ? 'ri-folder-open-fill text-foreground-900' : 'ri-folder-line text-foreground-400'}`}></i>
                      <span className="text-xs font-medium text-foreground-900 truncate">{ref.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-900 text-[9px] font-medium whitespace-nowrap">
                        {ref.type || 'Autre'}
                      </span>
                      <span className="text-[10px] text-foreground-400 whitespace-nowrap">{phpCount} PHP</span>
                      <span className="text-[10px] text-foreground-300">·</span>
                      <span className="text-[10px] text-foreground-400 whitespace-nowrap">{cssCount} CSS</span>
                      <span className="text-[10px] text-foreground-300">·</span>
                      <span className="text-[10px] text-foreground-400 whitespace-nowrap">{formatDate(ref.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ref.id); }}
                    className={`w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0 transition-colors cursor-pointer ${
                      deletingId === ref.id
                        ? 'bg-red-500 text-white'
                        : 'text-foreground-400 hover:bg-red-50 hover:text-red-500'
                    }`}
                    title={deletingId === ref.id ? 'Confirmer la suppression' : 'Supprimer'}
                  >
                    <i className={deletingId === ref.id ? 'ri-check-line text-xs' : 'ri-delete-bin-line text-xs'}></i>
                  </button>
                </div>

                {/* Fichiers (visible si sélectionné) */}
                {isSelected && ref.files.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-background-200/70 space-y-1">
                    {ref.files.map((file) => (
                      <button
                        key={file.path}
                        onClick={(e) => { e.stopPropagation(); openViewer(file); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-foreground-600 hover:bg-background-100 hover:text-foreground-900 transition-colors cursor-pointer group"
                      >
                        <i className={`${file.type === 'css' ? 'ri-css3-line' : 'ri-file-code-line'} text-xs text-foreground-400 flex-shrink-0`}></i>
                        <span className="font-mono truncate flex-1 text-left">{file.path}</span>
                        <span className="text-[9px] text-foreground-400 font-mono flex-shrink-0">{file.size != null ? formatFileSize(file.size) : `${file.content?.length ?? 0} car.`}</span>
                        <i className="ri-eye-line text-xs text-foreground-300 opacity-0 group-hover:opacity-100 flex-shrink-0"></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File viewer modal */}
      {viewingFile && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setViewingFile(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl bg-background-50 rounded-lg border border-background-200/70 shadow-xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-4 h-12 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <i className="ri-file-code-line text-sm text-foreground-500 flex-shrink-0"></i>
                <span className="text-xs font-mono text-foreground-900 truncate">{viewingFile.path}</span>
                <span className="text-[10px] text-foreground-400 font-mono flex-shrink-0">{viewingContent != null ? `${viewingContent.length.toLocaleString()} car.` : ''}</span>
              </div>
              <button
                onClick={() => setViewingFile(null)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-foreground-500"></i>
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] text-foreground-700 font-mono leading-relaxed whitespace-pre bg-background-100/50">
              {viewingLoading ? 'Chargement...' : viewingContent}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}