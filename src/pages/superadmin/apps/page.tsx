import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AppFormModal, { getTypeLabel, type AppEntry } from './components/AppFormModal';
import InstalledAppsTab from './components/InstalledAppsTab';

export default function AppBuilderPage() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'category' | 'price-asc' | 'price-desc'>('default');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppEntry | null>(null);
  const [view, setView] = useState<'catalog' | 'installed'>('catalog');

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('appstore')
        .select('*')
        .order('id', { ascending: false });
      if (fetchError) throw fetchError;
      setApps((data as AppEntry[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingApp(null);
    setModalOpen(true);
  };

  const openEdit = (app: AppEntry) => {
    setEditingApp(app);
    setModalOpen(true);
  };

  const handleDelete = async (app: AppEntry) => {
    if (!window.confirm(`Supprimer definitivement "${app.nom}" ?`)) return;
    try {
      const { error: delError } = await supabase.from('appstore').delete().eq('id', app.id);
      if (delError) throw delError;
      fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filteredApps = (() => {
    const filtered = apps.filter((a) => {
      if (activeTab === 'active' && a.active !== 1) return false;
      if (activeTab === 'draft' && a.active === 1) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          a.nom.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.nompage.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const sorted = [...filtered];
    if (sortBy === 'category') {
      sorted.sort((a, b) => getTypeLabel(a.typeapp).localeCompare(getTypeLabel(b.typeapp), 'fr'));
    } else if (sortBy === 'price-asc') {
      sorted.sort((a, b) => parseInt(a.prix || '0', 10) - parseInt(b.prix || '0', 10));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => parseInt(b.prix || '0', 10) - parseInt(a.prix || '0', 10));
    }
    return sorted;
  })();

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">App Builder</h2>
          <p className="text-sm text-foreground-500 mt-1">Gérez les applications et modules de la plateforme</p>
        </div>
        {view === 'catalog' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Nouvelle app
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-1 w-fit mb-6">
        <button
          onClick={() => setView('catalog')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            view === 'catalog' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          Catalogue d'apps
        </button>
        <button
          onClick={() => setView('installed')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            view === 'installed' ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          Apps installées
        </button>
      </div>

      {view === 'catalog' ? (
        <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5 w-fit">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'active', label: 'Publiées' },
            { key: 'draft', label: 'Brouillons' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-background-50 text-foreground-900 shadow-sm'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher une app..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
        <div className="relative">
          <i className="ri-arrow-up-down-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="pl-9 pr-8 py-2 bg-background-50 border border-background-200/70 rounded-full text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors appearance-none cursor-pointer"
          >
            <option value="default">Tri : par défaut</option>
            <option value="category">Tri : catégorie</option>
            <option value="price-asc">Tri : prix croissant</option>
            <option value="price-desc">Tri : prix décroissant</option>
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
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
          <button
            onClick={fetchApps}
            className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-apps-2-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucune application</p>
          <p className="text-foreground-400 text-xs mt-1">Créez votre première app pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group flex flex-col"
            >
              <div className="aspect-[16/10] bg-background-100 flex items-center justify-center relative overflow-hidden">
                {app.image ? (
                  <img
                    src={app.image}
                    alt={app.nom}
                    title={`${app.nom} — ${getTypeLabel(app.typeapp)}`}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Minimalist%20abstract%20app%20interface%20with%20soft%20neutral%20background%2C%20clean%20modern%20software%20aesthetic%2C%20professional%20design&width=400&height=250&seq=superadmin-app-fallback&orientation=landscape';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <i className="ri-apps-2-line text-3xl text-foreground-300"></i>
                    <span className="text-xs text-foreground-400">{app.nom}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(app)}
                    className="w-8 h-8 rounded-md bg-background-50/90 flex items-center justify-center cursor-pointer hover:bg-background-50"
                    title="Éditer"
                  >
                    <i className="ri-edit-line text-sm text-foreground-700"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(app)}
                    className="w-8 h-8 rounded-md bg-background-50/90 flex items-center justify-center cursor-pointer hover:bg-red-50"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-sm text-red-500"></i>
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-foreground-900 truncate">{app.nom}</h4>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${app.active === 1 ? 'bg-accent-500' : 'bg-foreground-300'}`}></span>
                </div>
                <p className="text-xs text-foreground-500 line-clamp-2 mb-3 flex-1">{app.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {getTypeLabel(app.typeapp)}
                  </span>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${app.free === 1 ? 'text-accent-600' : 'text-foreground-600'}`}>
                    {app.free === 1 ? 'Gratuite' : `${parseInt(app.prix || '0', 10)} MAD`}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/superadmin/apps/${app.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-background-50 bg-foreground-950 hover:bg-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-tools-line"></i>
                    Configurer l'app
                  </Link>
                  <button
                    onClick={() => openEdit(app)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-foreground-600 bg-background-100 hover:bg-background-200/70 transition-colors cursor-pointer whitespace-nowrap"
                    title="Modifier les détails"
                  >
                    <i className="ri-edit-line"></i>
                    Détails
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      ) : (
        <InstalledAppsTab />
      )}

      {/* Form Modal */}
      {modalOpen && (
        <AppFormModal
          mode={editingApp ? 'edit' : 'create'}
          app={editingApp}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchApps();
          }}
        />
      )}
    </div>
  );
}