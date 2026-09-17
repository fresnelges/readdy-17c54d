import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import CategoryManager from './components/CategoryManager';

interface Formation {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  souscategorie: string;
  duree: string;
  prix: number;
  status: string;
}

interface Category {
  id: number;
  titre: string;
}

interface SubCategory {
  id: number;
  idformationcategorie: number;
  titre: string;
}

export default function FormationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [dureeHeures, setDureeHeures] = useState<number>(0);
  const [dureeMinutes, setDureeMinutes] = useState<number>(0);
  const [newFormation, setNewFormation] = useState({
    titre: '',
    description: '',
    categorie: '',
    souscategorie: '',
    duree: '',
    prix: 0,
  });

  const fetchFormations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('formations').select('*').order('titre');
      if (error) {
        alert('Erreur chargement : ' + error.message);
      }
      setFormations(data || []);
    } catch (err: any) {
      alert('Erreur inattendue : ' + (err?.message || 'Inconnue'));
    }
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const { data: cats, error: e1 } = await supabase
        .from('formationcategorie')
        .select('*')
        .eq('user_id', user.id)
        .order('titre');
      if (e1) throw e1;
      const { data: subRows, error: e2 } = await supabase
        .from('formationsouscategorie')
        .select('*')
        .eq('user_id', user.id)
        .order('titre');
      if (e2) throw e2;
      setCategories(cats || []);
      setSubs(subRows || []);
    } catch (err: any) {
      alert('Erreur catégories : ' + (err?.message || 'Inconnue'));
    }
  }, [user]);

  useEffect(() => { fetchFormations(); }, [fetchFormations]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleCreate = async () => {
    if (!newFormation.titre || !user) return;
    const dureeParts: string[] = [];
    if (dureeHeures > 0) dureeParts.push(`${dureeHeures} h`);
    if (dureeMinutes > 0) dureeParts.push(`${dureeMinutes} min`);
    const dureeStr = dureeParts.length > 0 ? dureeParts.join(' ') : '';
    try {
      const { data: created, error } = await supabase.from('formations').insert({
        titre: newFormation.titre,
        description: newFormation.description,
        categorie: newFormation.categorie,
        souscategorie: newFormation.souscategorie,
        duree: dureeStr,
        prix: newFormation.prix,
        id_formateur: user.id,
        status: 'published',
      }).select('id').single();
      if (error) {
        alert('Erreur création : ' + error.message);
        return;
      }
      setNewFormation({ titre: '', description: '', categorie: '', souscategorie: '', duree: '', prix: 0 });
      setSelectedCategoryId('');
      setDureeHeures(0);
      setDureeMinutes(0);
      setShowCreate(false);
      fetchFormations();
      if (created?.id) {
        navigate(`/dashboard/formation/${created.id}`);
      }
    } catch (err: any) {
      alert('Erreur inattendue : ' + (err?.message || 'Inconnue'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('formations').delete().eq('id', id);
      if (error) {
        alert('Erreur suppression : ' + error.message);
        return;
      }
      setFormations((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert('Erreur inattendue : ' + (err?.message || 'Inconnue'));
    }
  };

  const handleCategorySelect = (catId: number | '') => {
    setSelectedCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    setNewFormation((prev) => ({ ...prev, categorie: cat ? cat.titre : '', souscategorie: '' }));
  };

  const handleSubcategorySelect = (subId: number | '') => {
    const sub = subs.find((s) => s.id === subId);
    setNewFormation((prev) => ({ ...prev, souscategorie: sub ? sub.titre : '' }));
  };

  const filteredSubs = selectedCategoryId ? subs.filter((s) => s.idformationcategorie === selectedCategoryId) : [];

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-graduation-cap-line mr-2 text-primary-500"></i>
            Formation
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Créez et gérez vos formations en ligne</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 text-foreground-900 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200 transition-colors"
          >
            <i className="ri-folder-2-line"></i>
            Mes catégories
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouvelle formation
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground-600 mb-1">Titre</label>
              <input type="text" value={newFormation.titre} onChange={(e) => setNewFormation({ ...newFormation, titre: e.target.value })} placeholder="Titre de la formation" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Catégorie</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategorySelect(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50"
              >
                <option value="">Choisir une catégorie…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.titre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Sous-catégorie</label>
              <select
                value={subs.find((s) => s.titre === newFormation.souscategorie)?.id ?? ''}
                onChange={(e) => handleSubcategorySelect(e.target.value ? parseInt(e.target.value, 10) : '')}
                disabled={!selectedCategoryId}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 disabled:opacity-50"
              >
                <option value="">{selectedCategoryId ? 'Choisir une sous-catégorie…' : 'Choisir d\u2019abord une catégorie'}</option>
                {filteredSubs.map((s) => (
                  <option key={s.id} value={s.id}>{s.titre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Durée</label>
              <div className="flex items-center gap-2">
                <select
                  value={dureeHeures}
                  onChange={(e) => setDureeHeures(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50"
                >
                  {Array.from({ length: 101 }, (_, h) => (
                    <option key={h} value={h}>{h} h</option>
                  ))}
                </select>
                <select
                  value={dureeMinutes}
                  onChange={(e) => setDureeMinutes(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Prix (MAD)</label>
              <input type="number" value={newFormation.prix} onChange={(e) => setNewFormation({ ...newFormation, prix: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
            <textarea value={newFormation.description} onChange={(e) => setNewFormation({ ...newFormation, description: e.target.value })} rows={3} placeholder="Description de la formation" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={!newFormation.titre} className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 disabled:opacity-50">Créer</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-background-100 rounded-full text-sm cursor-pointer">Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
      ) : formations.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <i className="ri-graduation-cap-line text-4xl text-foreground-300 mb-3"></i>
          <p className="text-foreground-500">Aucune formation créée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formations.map((f) => (
            <Link
              key={f.id}
              to={`/dashboard/formation/${f.id}`}
              className="group block bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-primary-300/60 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground-900 line-clamp-2">{f.titre}</h3>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(f.id); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer flex-shrink-0"
                  title="Supprimer"
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
              <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{f.description || 'Aucune description'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {f.categorie && <span className="px-2 py-0.5 rounded-full text-xs bg-background-100 text-foreground-500">{f.categorie}</span>}
                {f.souscategorie && <span className="px-2 py-0.5 rounded-full text-xs bg-accent-100 text-accent-900">{f.souscategorie}</span>}
                {f.duree && <span className="text-xs text-foreground-400"><i className="ri-time-line mr-1"></i>{f.duree}</span>}
                <span className="text-sm font-bold text-primary-600 ml-auto">{f.prix > 0 ? `${f.prix} MAD` : 'Gratuit'}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-background-200/70 text-xs font-medium text-primary-600 flex items-center gap-1">
                Gérer le contenu
                <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5"></i>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCategories && user && (
        <CategoryManager userId={user.id} onClose={() => setShowCategories(false)} onChanged={fetchCategories} />
      )}
    </div>
  );
}