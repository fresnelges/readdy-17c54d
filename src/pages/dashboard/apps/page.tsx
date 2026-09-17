import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface InstalledApp {
  id: number;
  idapp: number;
  nomapp: string;
  status: number;
  nompage: string;
  prix: number;
  typeapp: number;
}

interface AppInfo {
  id: number;
  nom: string;
  typeapp: string;
  description: string;
  nompage: string;
}

export default function AppsManagementPage() {
  const { user } = useAuth();
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appDetails, setAppDetails] = useState<Map<number, AppInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const commerceId = user?.id || 0;

  const fetchData = useCallback(async () => {
    if (!commerceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: installed, error: installedErr } = await supabase
        .from('appvendeur')
        .select('*')
        .eq('idcommerce', commerceId)
        .order('id', { ascending: false });

      if (installedErr) throw installedErr;
      setInstalledApps(installed || []);

      if (installed && installed.length > 0) {
        const appIds = installed.map((a: InstalledApp) => a.idapp);
        const { data: apps } = await supabase
          .from('appstore')
          .select('id, nom, typeapp, description, nompage')
          .in('id', appIds);

        const detailsMap = new Map<number, AppInfo>();
        (apps || []).forEach((app: AppInfo) => {
          detailsMap.set(app.id, app);
        });
        setAppDetails(detailsMap);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [commerceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleToggle = async (app: InstalledApp) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(app.id);
      return next;
    });
    try {
      const newStatus = app.status === 1 ? 0 : 1;
      const { error: updateErr } = await supabase
        .from('appvendeur')
        .update({ status: newStatus })
        .eq('id', app.id);

      if (updateErr) throw updateErr;

      setInstalledApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
      );
      window.dispatchEvent(new CustomEvent('app-status-changed'));
      const appName = appDetails.get(app.idapp)?.nom || app.nomapp || 'App';
      showToast(`${appName} ${newStatus === 1 ? 'activée' : 'désactivée'}`, 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(app.id);
        return next;
      });
    }
  };

  const handleBulkToggle = async (action: 'activate' | 'deactivate') => {
    const targetStatus = action === 'activate' ? 1 : 0;
    const appsToToggle = installedApps.filter((a) => a.status !== targetStatus);
    if (appsToToggle.length === 0) return;

    appsToToggle.forEach((a) =>
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.add(a.id);
        return next;
      })
    );

    try {
      await Promise.all(
        appsToToggle.map((a) =>
          supabase.from('appvendeur').update({ status: targetStatus }).eq('id', a.id)
        )
      );
      setInstalledApps((prev) =>
        prev.map((a) =>
          appsToToggle.some((t) => t.id === a.id) ? { ...a, status: targetStatus } : a
        )
      );
      window.dispatchEvent(new CustomEvent('app-status-changed'));
      const verb = action === 'activate' ? 'activée' : 'désactivée';
      const plural = appsToToggle.length > 1 ? 's' : '';
      showToast(`${appsToToggle.length} app${plural} ${verb}${plural}`, 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setTogglingIds(new Set());
    }
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

  const filteredApps = installedApps.filter((app) => {
    if (statusFilter === 'active' && app.status !== 1) return false;
    if (statusFilter === 'inactive' && app.status !== 0) return false;
    const detail = appDetails.get(app.idapp);
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      app.nomapp?.toLowerCase().includes(search) ||
      detail?.nom?.toLowerCase().includes(search) ||
      detail?.typeapp?.toLowerCase().includes(search)
    );
  });

  const activeCount = installedApps.filter((a) => a.status === 1).length;
  const inactiveCount = installedApps.filter((a) => a.status === 0).length;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-toggle-line mr-2 text-primary-500"></i>
            Gestion des Apps
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            Activez ou désactivez vos applications installées
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-100 rounded-full text-xs text-foreground-500 font-medium">
          <i className="ri-apps-2-line"></i>
          <span className="whitespace-nowrap">{installedApps.length} app{installedApps.length > 1 ? 's' : ''} installée{installedApps.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Status filter tabs */}
      {installedApps.length > 0 && (
        <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-1 w-fit mb-4">
          {[
            { key: 'active', label: 'Actives', icon: 'ri-checkbox-circle-line', count: activeCount },
            { key: 'inactive', label: 'Inactives', icon: 'ri-indeterminate-circle-line', count: inactiveCount },
            { key: 'all', label: 'Toutes', icon: 'ri-apps-2-line', count: installedApps.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as 'all' | 'active' | 'inactive')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'bg-background-50 text-foreground-900 shadow-sm'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
              <span className="text-xs opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {installedApps.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder="Rechercher une app installée..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
            />
          </div>
          <button
            onClick={() => handleBulkToggle('activate')}
            disabled={installedApps.every((a) => a.status === 1)}
            className="px-4 py-2.5 bg-accent-50 text-accent-700 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="ri-check-line mr-1"></i>
            Tout activer
          </button>
          <button
            onClick={() => handleBulkToggle('deactivate')}
            disabled={installedApps.every((a) => a.status === 0)}
            className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <i className="ri-close-line mr-1"></i>
            Tout désactiver
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600">
            Réessayer
          </button>
        </div>
      ) : installedApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-apps-2-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-base font-semibold text-foreground-700 mb-1">Aucune app installée</h3>
          <p className="text-sm text-foreground-500 mb-4">
            Rendez-vous dans l AppStore pour installer des applications
          </p>
          <a
            href="/dashboard/appstore"
            className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-store-2-line mr-1"></i>
            Aller à l AppStore
          </a>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-toggle-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-sm text-foreground-600">
            {searchTerm
              ? 'Aucune app ne correspond à votre recherche'
              : statusFilter === 'active'
                ? 'Aucune app active'
                : statusFilter === 'inactive'
                  ? 'Aucune app inactive'
                  : 'Aucune app'}
          </p>
          {!searchTerm && statusFilter === 'active' && inactiveCount > 0 && (
            <button
              onClick={() => setStatusFilter('inactive')}
              className="mt-3 px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors"
            >
              Voir {inactiveCount} app{inactiveCount > 1 ? 's' : ''} inactive{inactiveCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-background-100 border-b border-background-200/70 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
            <div className="col-span-5">Application</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-3 text-right">Action</div>
          </div>

          <div className="divide-y divide-background-200/70">
            {filteredApps.map((app) => {
              const detail = appDetails.get(app.idapp);
              const isActive = app.status === 1;
              const isToggling = togglingIds.has(app.id);

              return (
                <div
                  key={app.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 px-5 py-4 items-center hover:bg-background-50/50 transition-colors"
                >
                  {/* App info */}
                  <div className="sm:col-span-5 flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-accent-50 text-accent-600' : 'bg-background-100 text-foreground-400'
                    }`}>
                      <i className="ri-apps-2-line text-lg"></i>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground-900 truncate">
                        {detail?.nom || app.nomapp || `App #${app.idapp}`}
                      </h4>
                      <p className="text-xs text-foreground-400 truncate">
                        {detail?.nompage || app.nompage}
                      </p>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="sm:col-span-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-background-100 text-foreground-600">
                      {detail ? getTypeLabel(detail.typeapp) : '-'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-accent-50 text-accent-700'
                        : 'bg-background-100 text-foreground-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent-500' : 'bg-foreground-300'}`}></span>
                      {isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggle(app)}
                      disabled={isToggling}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                        isActive ? 'bg-accent-500' : 'bg-background-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    {isToggling && (
                      <i className="ri-loader-4-line animate-spin text-sm text-foreground-400"></i>
                    )}
                    {detail?.nompage && isActive && (
                      <a
                        href={`/dashboard/${detail.nompage}`}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 hover:text-foreground-600 transition-colors cursor-pointer"
                        title="Ouvrir l app"
                      >
                        <i className="ri-external-link-line text-sm"></i>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats footer */}
      {installedApps.length > 0 && (
        <div className="mt-4 flex items-center gap-4 text-xs text-foreground-400">
          <span>{installedApps.length} app{installedApps.length > 1 ? 's' : ''} installée{installedApps.length > 1 ? 's' : ''}</span>
          <span>·</span>
          <span className="text-accent-600">{activeCount} active{activeCount > 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{inactiveCount} inactive{inactiveCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Toast confirmation */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-toast-in">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full ${
            toast.type === 'success'
              ? 'bg-foreground-950 text-background-50'
              : 'bg-red-500 text-white'
          }`}>
            <i className={`text-lg ${toast.type === 'success' ? 'ri-checkbox-circle-line text-accent-300' : 'ri-error-warning-line'}`}></i>
            <span className="text-sm font-medium whitespace-nowrap">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}