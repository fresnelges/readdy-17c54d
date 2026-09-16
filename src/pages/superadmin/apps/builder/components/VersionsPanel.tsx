import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  listVersions,
  publishVersion,
  rollbackToVersion,
  restoreVersionToDraft,
  type AppVersionRow,
} from '../versioning';

interface VersionsPanelProps {
  appId: number;
  onPublished?: () => void;
}

export default function VersionsPanel({ appId, onPublished }: VersionsPanelProps) {
  const [versions, setVersions] = useState<AppVersionRow[]>([]);
  const [publishedVersionId, setPublishedVersionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [versionsRes, appRes] = await Promise.all([
        listVersions(appId),
        supabase.from('appstore').select('published_version_id').eq('id', appId).maybeSingle(),
      ]);
      setVersions(versionsRes);
      setPublishedVersionId((appRes.data?.published_version_id as number) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const version = await publishVersion(appId, note.trim());
      setPublishedVersionId(version.id);
      setNote('');
      await fetchVersions();
      onPublished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (version: AppVersionRow) => {
    if (busyId) return;
    if (!window.confirm(`Republier la version ${version.label || version.version_number} ? Le public verra cette version.`)) return;
    setBusyId(version.id);
    setError(null);
    try {
      await rollbackToVersion(appId, version.id);
      setPublishedVersionId(version.id);
      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retour en arrière');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (version: AppVersionRow) => {
    if (busyId) return;
    if (!window.confirm(`Restaurer la version ${version.label || version.version_number} dans le brouillon ? Le contenu actuel du brouillon sera remplacé.`)) return;
    setBusyId(version.id);
    setError(null);
    try {
      await restoreVersionToDraft(appId, version.id);
      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><i className="ri-close-line"></i></button>
        </div>
      )}

      {/* Publish bar */}
      <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center text-accent-700 flex-shrink-0">
            <i className="ri-rocket-2-line text-lg"></i>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground-900">Publier une nouvelle version</h4>
            <p className="text-xs text-foreground-500 mt-0.5">
              Le brouillon actuel devient la version visible par les utilisateurs. Vous pourrez continuer à l'améliorer sans les impacter.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note de version (ex. ajout du tableau de bord)"
                className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-md text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
              />
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                <i className={publishing ? 'ri-loader-4-line animate-spin' : 'ri-rocket-2-line'}></i>
                {publishing ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version list */}
      {versions.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-background-200/70 rounded-lg">
          <i className="ri-git-branch-line text-3xl text-foreground-300 block mb-2"></i>
          <p className="text-sm text-foreground-500">Aucune version publiée</p>
          <p className="text-xs text-foreground-400 mt-1">Publiez votre première version pour la mettre à disposition des utilisateurs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground-900">Historique des versions</h4>
          {versions.map((version) => {
            const isPublished = version.id === publishedVersionId;
            return (
              <div
                key={version.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isPublished ? 'border-accent-300 bg-accent-50/60' : 'border-background-200/70 bg-background-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isPublished ? 'bg-accent-500 text-background-50' : 'bg-background-100 text-foreground-600'
                }`}>
                  {version.version_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground-900 whitespace-nowrap">
                      {version.label || `v${version.version_number}`}
                    </span>
                    {isPublished ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-100 text-accent-800 whitespace-nowrap">
                        En ligne
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-background-100 text-foreground-500 whitespace-nowrap">
                        Archivée
                      </span>
                    )}
                  </div>
                  {version.note && <p className="text-xs text-foreground-500 mt-0.5 truncate">{version.note}</p>}
                  <p className="text-[11px] text-foreground-400 mt-0.5">
                    {isPublished && version.published_at ? `Publiée le ${formatDate(version.published_at)}` : `Créée le ${formatDate(version.created_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isPublished && (
                    <button
                      onClick={() => handleRollback(version)}
                      disabled={busyId === version.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground-600 bg-background-100 hover:bg-background-200/70 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <i className={busyId === version.id ? 'ri-loader-4-line animate-spin' : 'ri-arrow-go-back-line'}></i>
                      Revenir
                    </button>
                  )}
                  <button
                    onClick={() => handleRestore(version)}
                    disabled={busyId === version.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground-600 bg-background-100 hover:bg-background-200/70 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Recharger cette version dans le brouillon pour continuer à l'éditer"
                  >
                    <i className="ri-edit-box-line"></i>
                    Restaurer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}