import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface AppItem {
  id: number;
  nom: string;
  description: string;
  typeapp: string;
  prix: string;
  image: string;
  free: number;
  nompage: string;
  active: number;
}

interface InstalledApp {
  id: number;
  idapp: number;
  status: number;
}

function AppPreviewModal({ app, installed, active, actionLoading, onToggle, onClose }: {
  app: AppItem;
  installed: boolean;
  active: boolean;
  actionLoading: number | null;
  onToggle: () => void;
  onClose: () => void;
}) {
  const isFree = app.free === 1 || app.prix === '0';

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      seo: 'SEO', communication: 'Communication', marketing: 'Marketing',
      inventory: 'Stock', social: 'Réseaux', security: 'Sécurité',
      analytics: 'Analytics', loyalty: 'Fidélité', pos: 'Caisse',
      crm: 'CRM', ai: 'IA', support: 'Support', payment: 'Paiement',
      media: 'Médias', forms: 'Formulaires', booking: 'Réservation',
      project: 'Projet', training: 'Formation',
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background-50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-56 bg-background-100 overflow-hidden rounded-t-xl">
          <img
            src={app.image || 'https://readdy.ai/api/search-image?query=Modern%20app%20interface%20with%20clean%20minimalist%20design%2C%20soft%20neutral%20background%2C%20professional%20software%20application%20aesthetic&width=800&height=400&seq=app-preview&orientation=landscape'}
            alt={app.nom}
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Abstract%20geometric%20pattern%20with%20soft%20pastel%20gradients%2C%20modern%20tech%20background%2C%20minimalist%20design&width=800&height=400&seq=app-preview-fallback&orientation=landscape';
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background-50/90 backdrop-blur-sm flex items-center justify-center text-foreground-700 hover:text-foreground-950 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-50/90 text-foreground-700 backdrop-blur-sm">
              {getTypeLabel(app.typeapp)}
            </span>
            {active && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700 backdrop-blur-sm">
                Actif
              </span>
            )}
          </div>
          {!isFree && (
            <div className="absolute top-4 right-20">
              <span className="px-3 py-1 rounded-md text-sm font-bold bg-primary-500 text-background-50 shadow-sm">
                {parseInt(app.prix).toLocaleString()} MAD
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold font-heading text-foreground-950">{app.nom}</h3>
              <p className="text-xs text-foreground-500 mt-0.5">Page: {app.nompage} · ID: {app.id}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-100 text-xs text-foreground-600">
              <i className="ri-information-line"></i>
              {isFree ? 'Gratuit' : `${parseInt(app.prix).toLocaleString()} MAD`}
            </div>
          </div>

          {/* Full Description */}
          <div className="mb-6 p-4 rounded-lg bg-background-50 border border-background-200/70">
            <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-foreground-700 leading-relaxed">{app.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Type</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">{getTypeLabel(app.typeapp)}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Prix</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">{isFree ? 'Gratuit' : `${parseInt(app.prix).toLocaleString()} MAD`}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Statut</p>
              <p className="text-sm font-semibold mt-0.5">
                {installed ? (
                  <span className={active ? 'text-accent-700' : 'text-secondary-700'}>
                    {active ? 'Activé' : 'Désactivé'}
                  </span>
                ) : (
                  <span className="text-foreground-500">Non installé</span>
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Page ID</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">{app.nompage}</p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
            >
              Fermer
            </button>
            {isFree ? (
              installed ? (
                <button
                  onClick={onToggle}
                  disabled={actionLoading === app.id}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
                    active
                      ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                      : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                  }`}
                >
                  {actionLoading === app.id ? (
                    <i className="ri-loader-4-line animate-spin"></i>
                  ) : active ? (
                    <>
                      <i className="ri-toggle-line"></i>
                      Désactiver
                    </>
                  ) : (
                    <>
                      <i className="ri-toggle-fill"></i>
                      Activer
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={onToggle}
                  disabled={actionLoading === app.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-accent-100 text-accent-700 hover:bg-accent-200 transition-all"
                >
                  {actionLoading === app.id ? (
                    <i className="ri-loader-4-line animate-spin"></i>
                  ) : (
                    <>
                      <i className="ri-download-2-line"></i>
                      Activer (Gratuit)
                    </>
                  )}
                </button>
              )
            ) : (
              <button
                disabled={actionLoading === app.id}
                onClick={() => {
                  onClose();
                  alert(`Achat de "${app.nom}" — ${app.prix} MAD. Le paiement sera disponible prochainement.`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-all"
              >
                {actionLoading === app.id ? (
                  <i className="ri-loader-4-line animate-spin"></i>
                ) : (
                  <>
                    <i className="ri-shopping-cart-2-line"></i>
                    Acheter — {parseInt(app.prix).toLocaleString()} MAD
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppStorePage() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [installedApps, setInstalledApps] = useState<Map<number, InstalledApp>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [previewApp, setPreviewApp] = useState<AppItem | null>(null);

  const commerceId = user?.id || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, installedRes] = await Promise.all([
        supabase.from('appstore').select('*').eq('active', 1),
        supabase.from('appvendeur').select('*').eq('idcommerce', commerceId),
      ]);

      if (appsRes.error) throw appsRes.error;

      setApps(appsRes.data || []);

      const installedMap = new Map<number, InstalledApp>();
      if (installedRes.error) {
        // appvendeur failed silently — show apps without install status
        console.warn('appvendeur fetch failed, showing apps without install status:', installedRes.error.message);
      } else {
        (installedRes.data || []).forEach((ia: InstalledApp) => {
          installedMap.set(ia.idapp, ia);
        });
      }
      setInstalledApps(installedMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [commerceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleApp = async (app: AppItem) => {
    setActionLoading(app.id);
    try {
      const installed = installedApps.get(app.id);

      if (installed) {
        const newStatus = installed.status === 1 ? 0 : 1;
        const { error: updateError } = await supabase
          .from('appvendeur')
          .update({ status: newStatus })
          .eq('id', installed.id);

        if (updateError) throw updateError;

        setInstalledApps((prev) => {
          const next = new Map(prev);
          next.set(app.id, { ...installed, status: newStatus });
          return next;
        });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('appvendeur')
          .insert({
            idapp: app.id,
            nomapp: app.nom,
            idcommerce: commerceId,
            typeapp: 1,
            prix: parseInt(app.prix) || 0,
            status: 1,
            nompage: app.nompage,
            contenu: '',
          })
          .select('id, idapp, status')
          .single();

        if (insertError) throw insertError;

        setInstalledApps((prev) => {
          const next = new Map(prev);
          next.set(app.id, { id: inserted.id, idapp: inserted.idapp, status: inserted.status });
          return next;
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l action');
    } finally {
      setActionLoading(null);
    }
  };

  const isFree = (app: AppItem) => app.free === 1 || app.prix === '0';
  const isInstalled = (appId: number) => installedApps.has(appId);
  const isActive = (appId: number) => {
    const installed = installedApps.get(appId);
    return installed ? installed.status === 1 : false;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      seo: 'SEO', communication: 'Communication', marketing: 'Marketing',
      inventory: 'Stock', social: 'Réseaux', security: 'Sécurité',
      analytics: 'Analytics', loyalty: 'Fidélité', pos: 'Caisse',
      crm: 'CRM', ai: 'IA', support: 'Support', payment: 'Paiement',
      media: 'Médias', forms: 'Formulaires', booking: 'Réservation',
      project: 'Projet', training: 'Formation',
    };
    return labels[type] || type;
  };

  const filteredApps = apps.filter((app) => {
    const matchSearch = app.nom.toLowerCase().includes(searchTerm.toLowerCase())
      || app.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || app.typeapp === filterType;
    return matchSearch && matchType;
  });

  const typeOptions = Array.from(new Set(apps.map((a) => a.typeapp)));

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">AppStore</h2>
          <p className="text-sm text-foreground-500 mt-1">Activez ou désactivez vos applications</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-100 rounded-full text-sm text-accent-700 font-medium">
          <i className="ri-apps-2-line"></i>
          <span className="whitespace-nowrap">{apps.length} apps disponibles</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher une application..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filterType === 'all'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
            }`}
          >
            Toutes
          </button>
          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                filterType === type
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
              }`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-apps-2-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-foreground-600">Aucune application trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => {
            const free = isFree(app);
            const installed = isInstalled(app.id);
            const active = isActive(app.id);

            return (
              <div
                key={app.id}
                className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors flex flex-col"
              >
                {/* Image */}
                <div className="relative h-40 bg-background-100 overflow-hidden">
                  <img
                    src={app.image || 'https://readdy.ai/api/search-image?query=Modern%20app%20interface%20with%20clean%20minimalist%20design%2C%20soft%20neutral%20background%2C%20professional%20software%20application%20aesthetic&width=400&height=300&seq=app-card-default&orientation=landscape'}
                    alt={app.nom}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Abstract%20geometric%20pattern%20with%20soft%20pastel%20gradients%2C%20modern%20tech%20background%2C%20minimalist%20design&width=400&height=300&seq=app-card-fallback&orientation=landscape';
                    }}
                  />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-background-50/90 text-foreground-700 backdrop-blur-sm">
                      {getTypeLabel(app.typeapp)}
                    </span>
                    {active && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 backdrop-blur-sm">
                        Actif
                      </span>
                    )}
                  </div>
                  {!free && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-primary-500 text-background-50 shadow-sm">
                        {parseInt(app.prix).toLocaleString()} MAD
                      </span>
                    </div>
                  )}
                  {/* Preview overlay on hover */}
                  <button
                    onClick={() => setPreviewApp(app)}
                    className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center transition-all cursor-pointer group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 px-4 py-2 rounded-full bg-background-50/90 text-foreground-800 text-xs font-medium backdrop-blur-sm transition-all">
                      <i className="ri-eye-line mr-1"></i>
                      Voir détails
                    </span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-foreground-900 mb-1">{app.nom}</h3>
                  <p className="text-xs text-foreground-500 leading-relaxed mb-4 flex-1 line-clamp-3">
                    {app.description}
                  </p>

                  {/* Action */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewApp(app)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-all"
                    >
                      <i className="ri-eye-line"></i>
                      Détails
                    </button>
                    {free ? (
                      installed ? (
                        <button
                          onClick={() => handleToggleApp(app)}
                          disabled={actionLoading === app.id}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
                            active
                              ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                              : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                          }`}
                        >
                          {actionLoading === app.id ? (
                            <i className="ri-loader-4-line animate-spin"></i>
                          ) : active ? (
                            <>
                              <i className="ri-toggle-line"></i>
                              Désactiver
                            </>
                          ) : (
                            <>
                              <i className="ri-toggle-fill"></i>
                              Activer
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleApp(app)}
                          disabled={actionLoading === app.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-accent-100 text-accent-700 hover:bg-accent-200 transition-all"
                        >
                          {actionLoading === app.id ? (
                            <i className="ri-loader-4-line animate-spin"></i>
                          ) : (
                            <>
                              <i className="ri-download-2-line"></i>
                              Gratuit
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <button
                        disabled={actionLoading === app.id}
                        onClick={() => {
                          alert(`Achat de "${app.nom}" — ${app.prix} MAD. Le paiement sera disponible prochainement.`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-all"
                      >
                        {actionLoading === app.id ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : (
                          <>
                            <i className="ri-shopping-cart-2-line"></i>
                            {parseInt(app.prix).toLocaleString()} MAD
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewApp && (
        <AppPreviewModal
          app={previewApp}
          installed={isInstalled(previewApp.id)}
          active={isActive(previewApp.id)}
          actionLoading={actionLoading}
          onToggle={() => handleToggleApp(previewApp)}
          onClose={() => setPreviewApp(null)}
        />
      )}
    </div>
  );
}