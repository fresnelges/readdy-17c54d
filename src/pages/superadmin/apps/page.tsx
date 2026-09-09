import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AppEntry {
  id: number;
  nom?: string;
  description?: string;
  categorie?: string;
  prix?: number;
  active?: number;
  image?: string;
  created_at?: string;
  app_id?: string;
}

export default function AppBuilderPage() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppCategory, setNewAppCategory] = useState('productivite');

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('appstore').select('*').order('id', { ascending: false });
      setApps((data as AppEntry[]) || []);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newAppName.trim()) return;
    try {
      await supabase.from('appstore').insert({
        nom: newAppName.trim(),
        description: newAppDesc.trim(),
        categorie: newAppCategory,
        prix: 0,
        active: 0,
      });
      setShowNewModal(false);
      setNewAppName('');
      setNewAppDesc('');
      setNewAppCategory('productivite');
      fetchApps();
    } catch { /* */ }
  };

  const filteredApps = apps.filter((a) => {
    if (activeTab === 'active') return a.active === 1;
    if (activeTab === 'draft') return a.active !== 1;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">App Builder</h2>
          <p className="text-sm text-foreground-500 mt-1">Gérez les applications et modules de la plateforme</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer"
        >
          <i className="ri-add-line"></i>
          Nouvelle app
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5 w-fit mb-6">
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

      {/* App Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-apps-2-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucune application</p>
          <p className="text-foreground-400 text-xs mt-1">Créez votre première app pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group">
              <div className="aspect-[16/10] bg-background-100 flex items-center justify-center relative">
                {app.image ? (
                  <img src={app.image} alt={app.nom || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <i className="ri-apps-2-line text-3xl text-foreground-300"></i>
                    <span className="text-xs text-foreground-400">{app.nom || 'App'}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-7 h-7 rounded-md bg-background-50/90 flex items-center justify-center cursor-pointer" title="Éditer">
                    <i className="ri-edit-line text-xs text-foreground-600"></i>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-foreground-900 truncate">{app.nom || 'Sans nom'}</h4>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${app.active === 1 ? 'bg-accent-500' : 'bg-foreground-300'}`}></span>
                </div>
                <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{app.description || 'Aucune description'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full">
                    {app.categorie || 'productivite'}
                  </span>
                  <span className={`text-[11px] font-medium ${app.active === 1 ? 'text-accent-600' : 'text-foreground-500'}`}>
                    {app.active === 1 ? 'Publiée' : 'Brouillon'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New App Modal */}
      {showNewModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowNewModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background-50 rounded-lg border border-background-200/70 p-6">
            <h3 className="text-base font-semibold text-foreground-950 mb-4">Nouvelle application</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="Mon app"
                  className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Description</label>
                <textarea
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="Description..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Catégorie</label>
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                >
                  <option value="productivite">Productivité</option>
                  <option value="marketing">Marketing</option>
                  <option value="ventes">Ventes</option>
                  <option value="analytics">Analytics</option>
                  <option value="design">Design</option>
                  <option value="ia">Intelligence Artificielle</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap">Annuler</button>
              <button
                onClick={handleCreate}
                disabled={!newAppName.trim()}
                className="px-5 py-2 rounded-full text-sm font-medium bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}