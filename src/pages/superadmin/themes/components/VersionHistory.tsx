import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ThemeVersion {
  id: number;
  idtheme: number;
  stylesheet: string;
  pages_snapshot: Record<string, { title: string; content: string }>;
  version_label: string;
  created_at: string;
}

interface VersionHistoryProps {
  themeId: number;
  currentStylesheet: string;
  currentPages: { page_key: string; title: string; content: string }[];
  onRestoreVersion: (stylesheet: string, pages: Record<string, { title: string; content: string }>) => void;
}

export default function VersionHistory({
  themeId,
  currentStylesheet,
  currentPages,
  onRestoreVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ThemeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sitewebtheme_versions')
        .select('*')
        .eq('idtheme', themeId)
        .order('created_at', { ascending: false });
      setVersions((data as ThemeVersion[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleSaveVersion = async () => {
    if (!themeId) return;
    setSaving(true);
    try {
      const pagesSnapshot: Record<string, { title: string; content: string }> = {};
      currentPages.forEach((p) => {
        pagesSnapshot[p.page_key] = { title: p.title, content: p.content };
      });

      const label = versionLabel.trim() || `v${versions.length + 1} — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;

      await supabase.from('sitewebtheme_versions').insert({
        idtheme: themeId,
        stylesheet: currentStylesheet,
        pages_snapshot: pagesSnapshot,
        version_label: label,
      });

      setVersionLabel('');
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
      await fetchVersions();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version: ThemeVersion) => {
    setRestoringId(version.id);
    try {
      onRestoreVersion(version.stylesheet, version.pages_snapshot);
      setConfirmRestoreId(null);
    } catch {
      // silent
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="overflow-y-auto h-full p-5 space-y-5">
      {/* Save new version */}
      <div className="p-4 rounded-lg border border-background-200/70 bg-background-100/50">
        <div className="flex items-center gap-2 mb-3">
          <i className="ri-git-branch-line text-foreground-600"></i>
          <span className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">
            Sauvegarder une version
          </span>
        </div>
        <p className="text-xs text-foreground-500 mb-3">
          Capture l&apos;état actuel du CSS et de toutes les pages pour pouvoir y revenir plus tard.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="Label (optionnel, ex: v1.0 - avant refonte hero)"
            className="flex-1 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
          />
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="h-10 px-4 rounded-full bg-foreground-950 text-background-50 text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin text-xs"></i>Sauvegarde...</>
            ) : savedMsg ? (
              <><i className="ri-check-line"></i>Version créée !</>
            ) : (
              <><i className="ri-save-line"></i>Créer une version</>
            )}
          </button>
        </div>
      </div>

      {/* Version list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <i className="ri-history-line text-foreground-600"></i>
          <span className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">
            Historique ({versions.length})
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <i className="ri-loader-4-line animate-spin text-lg text-foreground-400"></i>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 bg-background-100/50 rounded-lg border border-dashed border-background-200/70">
            <i className="ri-archive-line text-2xl text-foreground-300 mb-2 block"></i>
            <p className="text-xs text-foreground-500">Aucune version enregistrée</p>
            <p className="text-[10px] text-foreground-400 mt-1">
              Crée ta première version avec le formulaire ci-dessus
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => {
              const pageCount = Object.keys(version.pages_snapshot || {}).length;
              const filledPages = Object.values(version.pages_snapshot || {}).filter(
                (p) => p.content
              ).length;
              const isExpanded = expandedVersion === version.id;

              return (
                <div
                  key={version.id}
                  className={`rounded-lg border transition-colors ${
                    isExpanded
                      ? 'border-foreground-300/60 bg-background-50'
                      : 'border-background-200/70 bg-background-100/50 hover:border-background-300/60'
                  }`}
                >
                  <div
                    onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-background-100 flex items-center justify-center flex-shrink-0">
                        <i className="ri-git-commit-line text-sm text-foreground-500"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-900 truncate">
                          {version.version_label}
                        </p>
                        <p className="text-[10px] text-foreground-400 mt-0.5">
                          {formatDate(version.created_at)} &bull; {filledPages}/{pageCount} pages &bull; CSS : {version.stylesheet.length.toLocaleString()} car.
                        </p>
                      </div>
                    </div>
                    <i
                      className={`${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-foreground-400 text-sm flex-shrink-0 transition-transform`}
                    ></i>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-background-200/70">
                      <div className="flex items-center justify-between mt-3 mb-2">
                        <span className="text-[10px] font-semibold text-foreground-500 uppercase tracking-wider">
                          Pages avec contenu
                        </span>
                        <span className="text-[10px] text-foreground-400 font-mono">
                          CSS : {version.stylesheet.length.toLocaleString()} car.
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.entries(version.pages_snapshot || {}).map(
                          ([key, pageData]) =>
                            pageData.content ? (
                              <span
                                key={key}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 whitespace-nowrap"
                              >
                                {key}
                              </span>
                            ) : null
                        )}
                      </div>

                      {confirmRestoreId === version.id ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-md px-3 py-2.5 mb-2">
                          <p className="text-xs text-amber-800 mb-2">
                            ⚠️ Restaurer cette version remplacera le CSS actuel et le contenu de toutes les pages. Les modifications non sauvegardées seront perdues.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmRestoreId(null)}
                              className="px-3 py-1.5 rounded-full text-[11px] font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleRestore(version)}
                              disabled={restoringId === version.id}
                              className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-600 text-white whitespace-nowrap hover:bg-amber-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {restoringId === version.id ? (
                                <><i className="ri-loader-4-line animate-spin text-xs"></i>Restauration...</>
                              ) : (
                                <><i className="ri-arrow-go-back-line"></i>Confirmer la restauration</>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRestoreId(version.id);
                          }}
                          className="w-full h-9 rounded-md bg-background-100 border border-background-200/70 text-foreground-700 text-xs font-medium hover:bg-background-200/70 hover:text-foreground-900 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <i className="ri-arrow-go-back-line"></i>
                          Restaurer cette version
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}