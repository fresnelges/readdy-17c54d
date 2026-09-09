import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Formation {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  duree: string;
  prix: number;
  status: string;
}

export default function FormationPage() {
  const { user } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFormation, setNewFormation] = useState({ titre: '', description: '', categorie: '', duree: '', prix: 0 });

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

  useEffect(() => { fetchFormations(); }, [fetchFormations]);

  const handleCreate = async () => {
    if (!newFormation.titre || !user) return;
    try {
      const { error } = await supabase.from('formations').insert({
        titre: newFormation.titre,
        description: newFormation.description,
        categorie: newFormation.categorie,
        duree: newFormation.duree,
        prix: newFormation.prix,
        status: 'published',
      });
      if (error) {
        alert('Erreur création : ' + error.message);
        return;
      }
      setNewFormation({ titre: '', description: '', categorie: '', duree: '', prix: 0 });
      setShowCreate(false);
      fetchFormations();
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
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
        >
          <i className="ri-add-line"></i>
          Nouvelle formation
        </button>
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
              <input type="text" value={newFormation.categorie} onChange={(e) => setNewFormation({ ...newFormation, categorie: e.target.value })} placeholder="Ex: Marketing" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Durée</label>
              <input type="text" value={newFormation.duree} onChange={(e) => setNewFormation({ ...newFormation, duree: e.target.value })} placeholder="Ex: 10 heures" className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm" />
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
            <div key={f.id} className="bg-background-50 border border-background-200/70 rounded-lg p-5 hover:border-background-300/60 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground-900 line-clamp-2">{f.titre}</h3>
                <button onClick={() => handleDelete(f.id)} className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-300 hover:text-red-500 cursor-pointer flex-shrink-0">
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
              <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{f.description || 'Aucune description'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {f.categorie && <span className="px-2 py-0.5 rounded-full text-xs bg-background-100 text-foreground-500">{f.categorie}</span>}
                {f.duree && <span className="text-xs text-foreground-400"><i className="ri-time-line mr-1"></i>{f.duree}</span>}
                <span className="text-sm font-bold text-primary-600 ml-auto">{f.prix > 0 ? `${f.prix} MAD` : 'Gratuit'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}