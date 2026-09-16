import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getTypeLabel } from './AppFormModal';
import InstalledAppModal from './InstalledAppModal';

export interface InstalledApp {
  id: number;
  idapp: number;
  nomapp: string;
  idcommerce: number;
  typeapp: number;
  prix: number;
  status: number;
  nompage: string;
  contenu: string;
}

interface Commerce {
  id: number;
  nomcommerce: string;
  name: string;
  email: string;
}

interface AppStoreItem {
  id: number;
  typeapp: string;
}

export default function InstalledAppsTab() {
  const [installs, setInstalls] = useState<InstalledApp[]>([]);
  const [commerces, setCommerces] = useState<Map<number, Commerce>>(new Map());
  const [apps, setApps] = useState<Map<number, AppStoreItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<InstalledApp | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [installsRes, usersRes, appsRes] = await Promise.all([
        supabase.from('appvendeur').select('*').order('id', { ascending: false }),
        supabase.from('users').select('id, nomcommerce, name, email'),
        supabase.from('appstore').select('id, typeapp'),
      ]);
      if (installsRes.error) throw installsRes.error;

      setInstalls((installsRes.data as InstalledApp[]) || []);

      const commMap = new Map<number, Commerce>();
      ((usersRes.data as Commerce[]) || []).forEach((u) => commMap.set(u.id, u));
      setCommerces(commMap);

      const appMap = new Map<number, AppStoreItem>();
      ((appsRes.data as AppStoreItem[]) || []).forEach((a) => appMap.set(a.id, a));
      setApps(appMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getCommerceName = (idcommerce: number) => {
    const c = commerces.get(idcommerce);
    if (!c) return `Commerçant #${idcommerce}`;
    return c.nomcommerce || c.name || c.email || `Commerçant #${idcommerce}`;
  };

  const getCategory = (idapp: number) => {
    const app = apps.get(idapp);
    return app ? getTypeLabel(app.typeapp) : '—';
  };

  const handleToggleStatus = async (inst: InstalledApp) => {
    const newStatus = inst.status === 1 ? 0 : 1;
    try {
      const { error: updateError } = await supabase
        .from('appvendeur')
        .update({ status: newStatus })
        .eq('id', inst.id);
      if (updateError) throw updateError;
      setInstalls((prev) => prev.map((i) => (i.id === inst.id ? { ...i, status: newStatus } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (inst: InstalledApp) => {
    if (!window.confirm(`Désinstaller "${inst.nomapp}" pour ${getCommerceName(inst.idcommerce)} ?`)) return;
    try {
      const { error: delError } = await supabase.from('appvendeur').delete().eq('id', inst.id);
      if (delError) throw delError;
      setInstalls((prev) => prev.filter((i) => i.id !== inst.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filtered = installs.filter((inst) => {
    if (statusFilter === 'active' && inst.status !== 1) return false;
    if (statusFilter === 'inactive' && inst.status !== 0) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        inst.nomapp.toLowerCase().includes(q) ||
        getCommerceName(inst.idcommerce).toLowerCase().includes(q) ||
        (inst.nompage || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = installs.filter((i) => i.status === 1).length;

  return (
    <>
      {/* Summary + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-100 rounded-full text-sm text-accent-700 font-medium w-fit">
          <i className="ri-download-cloud-2-line"></i>
          <span className="whitespace-nowrap">{installs.length} installations · {activeCount} actives</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder="Rechercher (app, commerçant, page)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-4 py-2 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
          </div>
          <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5">
            {[
              { key: 'all', label: 'Toutes' },
              { key: 'active', label: 'Actives' },
              { key: 'inactive', label: 'Inactives' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 text-sm mb-3">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-download-cloud-2-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucune installation</p>
          <p className="text-foreground-400 text-xs mt-1">Les apps activées par les commerçants apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-left text-xs text-foreground-400 border-b border-background-200/70 bg-background-100/50">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Application</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Commerçant</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Catégorie</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Prix</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Statut</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const commerceName = getCommerceName(inst.idcommerce);
                  const initial = (commerceName.charAt(0) || '?').toUpperCase();
                  return (
                    <tr key={inst.id} className="border-b border-background-200/70 last:border-0 hover:bg-background-100/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-foreground-900">{inst.nomapp}</p>
                        <p className="text-[11px] text-foreground-400">{inst.nompage}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {initial}
                          </span>
                          <span className="text-sm text-foreground-700 whitespace-nowrap">{commerceName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {getCategory(inst.idapp)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium whitespace-nowrap ${inst.prix === 0 ? 'text-accent-600' : 'text-foreground-600'}`}>
                          {inst.prix === 0 ? 'Gratuit' : `${inst.prix} MAD`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(inst)}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${inst.status === 1 ? 'bg-accent-500' : 'bg-background-300'}`}
                          title={inst.status === 1 ? 'Désactiver' : 'Activer'}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${inst.status === 1 ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setEditing(inst)} className="w-8 h-8 rounded-md bg-background-100 flex items-center justify-center cursor-pointer hover:bg-background-200/70" title="Éditer">
                            <i className="ri-edit-line text-sm text-foreground-700"></i>
                          </button>
                          <button onClick={() => handleDelete(inst)} className="w-8 h-8 rounded-md bg-background-100 flex items-center justify-center cursor-pointer hover:bg-red-50" title="Désinstaller">
                            <i className="ri-delete-bin-line text-sm text-red-500"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <InstalledAppModal
          inst={editing}
          commerceName={getCommerceName(editing.idcommerce)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchData(); }}
        />
      )}
    </>
  );
}