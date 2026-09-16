import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import BlockEditor from './BlockEditor';
import { PAGE_ICONS, type AppPage } from '../constants';
import { syncNativePages } from '../appRegistry';

interface PagesPanelProps {
  appId: number;
  nompage: string;
}

export default function PagesPanel({ appId, nompage }: PagesPanelProps) {
  const [pages, setPages] = useState<AppPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Synchronise les pages "codées" de l'app (registre) dans le builder.
      await syncNativePages(appId, nompage);
      const { data, error: fetchError } = await supabase
        .from('app_pages')
        .select('*')
        .eq('app_id', appId)
        .order('position', { ascending: true });
      if (fetchError) throw fetchError;
      setPages((data as AppPage[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [appId, nompage]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';

  const createPage = async () => {
    if (!newTitle.trim()) return;
    const { data, error: insErr } = await supabase
      .from('app_pages')
      .insert({
        app_id: appId,
        title: newTitle.trim(),
        slug: slugify(newTitle),
        icon: 'ri-file-text-line',
        position: pages.length,
        visibility: 'visible',
      })
      .select('*')
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setPages((prev) => [...prev, data as AppPage]);
    setSelectedId(data.id);
    setCreating(false);
    setNewTitle('');
  };

  const updatePage = async (page: AppPage, patch: Partial<AppPage>) => {
    const next = { ...page, ...patch };
    setPages((prev) => prev.map((p) => (p.id === page.id ? next : p)));
    const { error: updErr } = await supabase
      .from('app_pages')
      .update(patch)
      .eq('id', page.id);
    if (updErr) setError(updErr.message);
  };

  const deletePage = async (page: AppPage) => {
    if (!window.confirm(`Supprimer la page "${page.title}" et tous ses blocs ?`)) return;
    const { error: delErr } = await supabase.from('app_pages').delete().eq('id', page.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== page.id));
    if (selectedId === page.id) setSelectedId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  const selectedPage = pages.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg">
          <i className="ri-error-warning-line"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><i className="ri-close-line"></i></button>
        </div>
      )}

      {/* Create bar */}
      {creating ? (
        <div className="flex items-center gap-2 bg-background-50 border border-background-200/70 rounded-lg p-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nom de la page"
            autoFocus
            className="flex-1 px-3 py-2 border border-background-200/70 rounded-md text-sm text-foreground-900 focus:outline-none focus:border-primary-300"
          />
          <button onClick={createPage} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Créer</button>
          <button onClick={() => { setCreating(false); setNewTitle(''); }} className="px-3 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Annuler</button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-foreground-800 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line"></i>
          Nouvelle page
        </button>
      )}

      {/* Pages list + editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Pages list */}
        <div className="space-y-2">
          {pages.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-pages-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Aucune page</p>
              <p className="text-xs text-foreground-400 mt-1">Créez la première page de votre app</p>
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setSelectedId(page.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === page.id
                    ? 'border-primary-300 bg-primary-50/50'
                    : 'border-background-200/70 bg-background-50 hover:border-background-300/60'
                }`}
              >
                <div className="w-9 h-9 rounded-md bg-background-100 flex items-center justify-center text-foreground-500 flex-shrink-0">
                  <i className={page.icon || 'ri-file-text-line'}></i>
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === page.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => { updatePage(page, { title: editTitle.trim() || page.title }); setEditingId(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { updatePage(page, { title: editTitle.trim() || page.title }); setEditingId(null); } }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full px-2 py-1 border border-primary-300 rounded text-sm text-foreground-900 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-foreground-900 truncate">{page.title}</p>
                      {page.native && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-800 flex-shrink-0 whitespace-nowrap">
                          Codée
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-foreground-400 truncate">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingId(page.id); setEditTitle(page.title); }}
                    className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer"
                    title="Renommer"
                  >
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => deletePage(page)}
                    disabled={page.native}
                    className="w-7 h-7 rounded flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground-400"
                    title={page.native ? 'Page codée (native) — non supprimable' : 'Supprimer'}
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <>
              {selectedPage?.native && (
                <div className="flex items-start gap-2 px-4 py-2.5 bg-accent-50 border border-accent-200 rounded-lg text-accent-800 text-xs mb-3">
                  <i className="ri-information-line mt-0.5"></i>
                  <span>
                    Page codée de l'app (écran natif). Les blocs ajoutés ici sont du contenu
                    complémentaire et ne modifient pas l'écran réel de l'app.
                  </span>
                </div>
              )}
              <BlockEditor pageId={selectedId} appId={appId} />
            </>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-background-200/70 rounded-lg">
              <i className="ri-cursor-line text-3xl text-foreground-300 block mb-2"></i>
              <p className="text-sm text-foreground-500">Sélectionnez une page pour éditer ses blocs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}