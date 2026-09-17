import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  titre: string;
}

interface SubCategory {
  id: number;
  idformationcategorie: number;
  titre: string;
}

interface CategoryManagerProps {
  userId: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function CategoryManager({ userId, onClose, onChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newSub, setNewSub] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cats, error: e1 } = await supabase
        .from('formationcategorie')
        .select('*')
        .eq('user_id', userId)
        .order('titre');
      if (e1) throw e1;
      const { data: subRows, error: e2 } = await supabase
        .from('formationsouscategorie')
        .select('*')
        .eq('user_id', userId)
        .order('titre');
      if (e2) throw e2;
      setCategories(cats || []);
      setSubs(subRows || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erreur inconnue');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addCategory = async () => {
    const titre = newCat.trim();
    if (!titre) return;
    const { error: err } = await supabase
      .from('formationcategorie')
      .insert({ titre, description: '', image: '', pointasavoir: '', user_id: userId });
    if (err) { setError(err.message); return; }
    setNewCat('');
    await fetchData();
    onChanged();
  };

  const addSubcategory = async () => {
    const titre = newSub.trim();
    if (!titre || !selectedCat) return;
    const { error: err } = await supabase
      .from('formationsouscategorie')
      .insert({ titre, idformationcategorie: selectedCat, description: '', image: '', pointasavoir: '', user_id: userId });
    if (err) { setError(err.message); return; }
    setNewSub('');
    await fetchData();
    onChanged();
  };

  const deleteCategory = async (id: number) => {
    await supabase.from('formationsouscategorie').delete().eq('idformationcategorie', id).eq('user_id', userId);
    await supabase.from('formationcategorie').delete().eq('id', id).eq('user_id', userId);
    await fetchData();
    onChanged();
  };

  const deleteSubcategory = async (id: number) => {
    await supabase.from('formationsouscategorie').delete().eq('id', id).eq('user_id', userId);
    await fetchData();
    onChanged();
  };

  const subsForCategory = (catId: number) => subs.filter((s) => s.idformationcategorie === catId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-background-50 border border-background-200/70 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70">
          <h3 className="text-base font-semibold font-heading text-foreground-950">
            <i className="ri-folder-2-line mr-2 text-primary-500"></i>
            Mes catégories de formation
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-400 hover:bg-background-100 cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Créer une catégorie */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-2">Nouvelle catégorie</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                placeholder="Ex: Marketing, Développement…"
                className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm"
              />
              <button
                onClick={addCategory}
                disabled={!newCat.trim()}
                className="px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50"
              >
                <i className="ri-add-line mr-1"></i>Ajouter
              </button>
            </div>
          </div>

          {/* Créer une sous-catégorie */}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-2">Nouvelle sous-catégorie</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50"
              >
                <option value="">Choisir une catégorie…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.titre}</option>
                ))}
              </select>
              <input
                type="text"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSubcategory(); }}
                placeholder="Nom de la sous-catégorie"
                className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm"
              />
              <button
                onClick={addSubcategory}
                disabled={!newSub.trim() || !selectedCat}
                className="px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50"
              >
                <i className="ri-add-line mr-1"></i>Ajouter
              </button>
            </div>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-sm text-foreground-500">
              Aucune catégorie. Créez-en une ci-dessus pour organiser vos formations.
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const catSubs = subsForCategory(cat.id);
                return (
                  <div key={cat.id} className="border border-background-200/70 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground-900">
                        <i className="ri-folder-2-fill mr-2 text-primary-500"></i>{cat.titre}
                      </span>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer"
                        title="Supprimer la catégorie"
                      >
                        <i className="ri-delete-bin-line text-xs"></i>
                      </button>
                    </div>
                    {catSubs.length > 0 && (
                      <div className="mt-2 pl-6 space-y-1.5">
                        {catSubs.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <span className="text-xs text-foreground-600">
                              <i className="ri-arrow-right-s-line mr-1"></i>{s.titre}
                            </span>
                            <button
                              onClick={() => deleteSubcategory(s.id)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer"
                              title="Supprimer la sous-catégorie"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}