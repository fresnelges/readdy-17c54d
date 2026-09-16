import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { mapZifekUser, type ZifekUser } from '@/hooks/useAuth';
import DemoAuthProvider from './DemoAuthProvider';
import { APP_REGISTRY, type AppPageDef } from '../appRegistry';

interface DemoMerchant {
  id: number;
  name: string;
  nomcommerce: string;
  email: string;
}

interface AppPreviewPanelProps {
  appId: number;
  nompage: string;
}

function isParamPath(path: string) {
  return /:[a-zA-Z]+/.test(path);
}

export default function AppPreviewPanel({ appId: _appId, nompage }: AppPreviewPanelProps) {
  const app = APP_REGISTRY[nompage];
  const basePath = `/dashboard/${nompage}`;

  const [merchants, setMerchants] = useState<DemoMerchant[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [demoUser, setDemoUser] = useState<ZifekUser | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [resolvedParam, setResolvedParam] = useState<string | number | null>(null);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [noDataKey, setNoDataKey] = useState<string | null>(null);

  const fetchMerchants = useCallback(async () => {
    setMerchantsLoading(true);
    setMerchantsError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, nomcommerce, email')
        .in('typecompte', [2, 3])
        .eq('active', 1)
        .order('id', { ascending: true });
      if (error) throw error;
      const list = (data || []) as DemoMerchant[];
      setMerchants(list);
      if (list.length > 0) {
        setSelectedMerchantId((prev) => prev ?? list[0].id);
      }
    } catch (err) {
      setMerchantsError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setMerchantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const loadDemoUser = useCallback(async (id: number) => {
    setUserLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setDemoUser(data ? mapZifekUser(data) : null);
    } catch {
      setDemoUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMerchantId) {
      loadDemoUser(selectedMerchantId);
    }
  }, [selectedMerchantId, loadDemoUser]);

  // Sélection par défaut : la première page sans paramètre (ou la première).
  useEffect(() => {
    if (app && selectedKey === null) {
      const first = app.pages.find((p) => !isParamPath(p.path)) || app.pages[0];
      setSelectedKey(first?.key ?? null);
    }
  }, [app, selectedKey]);

  const selectMerchant = (id: number) => {
    setSelectedMerchantId(id);
    setResolvedParam(null);
    setNoDataKey(null);
    const first = app?.pages.find((p) => !isParamPath(p.path)) || app?.pages[0];
    setSelectedKey(first?.key ?? null);
  };

  const goToPage = async (page: AppPageDef) => {
    if (isParamPath(page.path)) {
      if (!selectedMerchantId) return;
      setResolvingKey(page.key);
      setNoDataKey(null);
      const id = page.resolveParam ? await page.resolveParam(selectedMerchantId) : null;
      setResolvingKey(null);
      if (id == null) {
        setNoDataKey(page.key);
        setResolvedParam(null);
        setSelectedKey(page.key);
        return;
      }
      setResolvedParam(id);
      setSelectedKey(page.key);
    } else {
      setResolvedParam(null);
      setSelectedKey(page.key);
    }
  };

  const selectedPage = useMemo(
    () => (app ? app.pages.find((p) => p.key === selectedKey) ?? null : null),
    [app, selectedKey],
  );

  const entryPath = useMemo(() => {
    if (!selectedPage) return basePath;
    const raw = selectedPage.path === '/' ? '' : selectedPage.path;
    const filled = resolvedParam != null ? raw.replace(/:[a-zA-Z]+/, String(resolvedParam)) : raw;
    return basePath + filled;
  }, [selectedPage, resolvedParam, basePath]);

  // Routes dédupliquées (plusieurs onglets partagent le même chemin :id).
  const uniqueRoutes = useMemo(() => {
    if (!app) return [];
    const seen = new Set<string>();
    return app.pages.filter((p) => {
      if (seen.has(p.path)) return false;
      seen.add(p.path);
      return true;
    });
  }, [app]);

  // Regroupement visuel des sous-onglets.
  const groupedPages = useMemo(() => {
    if (!app) return [];
    const groups: { group?: string; pages: AppPageDef[] }[] = [];
    let current: { group?: string; pages: AppPageDef[] } | null = null;
    for (const page of app.pages) {
      if (page.group) {
        if (!current || current.group !== page.group) {
          current = { group: page.group, pages: [] };
          groups.push(current);
        }
        current.pages.push(page);
      } else {
        current = null;
        groups.push({ group: undefined, pages: [page] });
      }
    }
    return groups;
  }, [app]);

  // ── Racine React séparée pour l'aperçu ──
  // React Router interdit d'imbriquer un <Router> dans un autre <Router>.
  // Le superadmin vit déjà dans le <BrowserRouter> global, donc on monte
  // l'app de démo dans une racine React indépendante (avec son propre
  // <MemoryRouter>) pour ne pas imbriquer deux routeurs.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!rootRef.current) {
      rootRef.current = createRoot(el);
    }
    const root = rootRef.current;

    const showNoData = selectedPage != null && selectedPage.key === noDataKey;

    if (showNoData) {
      root.render(
        <div className="flex flex-col items-center justify-center min-h-[520px] text-center px-6">
          <i className="ri-inbox-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-600 text-sm font-medium mb-1">Aucune donnée de démo</p>
          <p className="text-foreground-400 text-xs max-w-sm">
            Ce commerçant n'a pas encore de données pour cette vue. Ajoutez-en
            ou choisissez un autre commerçant dans le sélecteur ci-dessus.
          </p>
        </div>
      );
    } else if (userLoading || !demoUser) {
      root.render(
        <div className="flex items-center justify-center min-h-[520px]">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      );
    } else if (app) {
      root.render(
        <DemoAuthProvider user={demoUser}>
          <MemoryRouter initialEntries={[entryPath]}>
            <Routes>
              {uniqueRoutes.map((page) => {
                const PageComponent = page.Component;
                const routePath = basePath + (page.path === '/' ? '' : page.path);
                return (
                  <Route
                    key={page.key}
                    path={routePath}
                    element={<PageComponent initialTab={selectedPage?.initialTab} />}
                  />
                );
              })}
              <Route path="*" element={<PreviewNotFound nompage={nompage} />} />
            </Routes>
          </MemoryRouter>
        </DemoAuthProvider>
      );
    }
  }, [app, selectedPage, noDataKey, userLoading, demoUser, entryPath, uniqueRoutes, basePath, nompage]);

  // Nettoyage de la racine séparée au démontage.
  useEffect(() => {
    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    };
  }, []);

  // ── App non présente dans le registre (pilotée par le builder) ──
  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <i className="ri-layout-line text-4xl text-foreground-300 mb-3"></i>
        <p className="text-foreground-600 text-sm font-medium mb-1">Application pilotée par le builder</p>
        <p className="text-foreground-400 text-xs max-w-md">
          Cette app n'a pas de page codée en dur : son contenu est construit depuis
          l'onglet « Pages » (pages, blocs, formulaires, données).
        </p>
      </div>
    );
  }

  const renderPageButton = (page: AppPageDef, indented: boolean) => {
    const active = page.key === selectedKey;
    const resolving = page.key === resolvingKey;
    const noData = page.key === noDataKey;
    const param = isParamPath(page.path);
    return (
      <button
        key={page.key}
        onClick={() => goToPage(page)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
          active
            ? 'border-primary-300 bg-primary-50/50'
            : 'border-background-200/70 bg-background-50 hover:border-background-300/60 cursor-pointer'
        } ${indented ? 'pl-8' : ''}`}
        title={`Aperçu de « ${page.title} »`}
      >
        <div className="w-8 h-8 rounded-md bg-background-100 flex items-center justify-center text-foreground-500 flex-shrink-0">
          {resolving ? <i className="ri-loader-4-line animate-spin"></i> : <i className={page.icon}></i>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground-900 truncate">{page.title}</p>
          <p className="text-[11px] text-foreground-400 truncate">
            /dashboard/{nompage}{page.path === '/' ? '' : page.path}
          </p>
        </div>
        {noData && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0 whitespace-nowrap">
            sans données
          </span>
        )}
        {param && !noData && (
          <i className="ri-external-link-line text-xs text-foreground-300 flex-shrink-0"></i>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barre supérieure : sélecteur de commerçant */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background-50 border border-background-200/70 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-foreground-600">
          <i className="ri-store-2-line text-accent-500"></i>
          <span className="font-medium">Commerçant de démo</span>
          <span className="text-xs text-foreground-400">— les données affichées sont celles de ce commerçant</span>
        </div>
        {merchantsLoading ? (
          <div className="flex items-center gap-2 text-sm text-foreground-400">
            <i className="ri-loader-4-line animate-spin"></i>Chargement…
          </div>
        ) : merchantsError ? (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <i className="ri-error-warning-line"></i>
            <span>{merchantsError}</span>
            <button
              onClick={fetchMerchants}
              className="px-3 py-1.5 bg-background-100 text-foreground-600 rounded-full text-xs cursor-pointer hover:bg-background-200/70 whitespace-nowrap"
            >
              Réessayer
            </button>
          </div>
        ) : merchants.length === 0 ? (
          <span className="text-sm text-foreground-400">Aucun commerçant trouvé</span>
        ) : (
          <select
            value={selectedMerchantId ?? ''}
            onChange={(e) => selectMerchant(Number(e.target.value))}
            className="px-3 py-2 border border-background-200/70 rounded-md text-sm bg-background-50 text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer min-w-[220px]"
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomcommerce || m.name} {m.email ? `(${m.email})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Contenu : pages + aperçu */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Liste des pages de l'app */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground-500 uppercase tracking-wider px-1 mb-2">
            {app.pages.length} vue{app.pages.length > 1 ? 's' : ''}
          </p>
          {groupedPages.map((g, gi) => (
            <div key={gi} className="space-y-1">
              {g.group && (
                <p className="text-[11px] font-medium text-foreground-400 uppercase tracking-wider px-1 pt-2 pb-1 flex items-center gap-1.5">
                  <i className="ri-corner-down-right-line"></i>{g.group}
                </p>
              )}
              {g.pages.map((page) => renderPageButton(page, Boolean(g.group)))}
            </div>
          ))}
        </div>

        {/* Aperçu de la page */}
        <div className="lg:col-span-3 border border-background-200/70 rounded-lg overflow-hidden bg-background-50">
          {/* Barre d'URL factice */}
          <div className="flex items-center gap-2 px-3 py-2 bg-background-100 border-b border-background-200/70">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-accent-400"></span>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-background-50 rounded-md border border-background-200/70 min-w-0">
              <i className="ri-lock-line text-xs text-foreground-400 flex-shrink-0"></i>
              <span className="text-xs text-foreground-500 truncate">{entryPath}</span>
            </div>
          </div>

          {/* Rendu (racine React séparée pour isoler le routeur) */}
          <div ref={containerRef} className="min-h-[520px]" />
        </div>
      </div>
    </div>
  );
}

function PreviewNotFound({ nompage }: { nompage: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <i className="ri-compass-4-line text-4xl text-foreground-300 mb-3"></i>
      <p className="text-sm text-foreground-600 mb-1">Cette destination n'existe pas dans l'aperçu</p>
      <p className="text-xs text-foreground-400">
        Revenez à la page principale de /dashboard/{nompage}.
      </p>
    </div>
  );
}