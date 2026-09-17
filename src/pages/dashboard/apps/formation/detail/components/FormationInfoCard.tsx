import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Formation } from '@/pages/dashboard/apps/formation/detail/types';

interface Category {
  id: number;
  titre: string;
}

interface SubCategory {
  id: number;
  idformationcategorie: number;
  titre: string;
}

interface Props {
  formation: Formation;
  userId?: number;
  onSaved: () => void;
}

export default function FormationInfoCard({ formation, userId, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<SubCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | ''>('');
  const [form, setForm] = useState({
    titre: formation.titre,
    description: formation.description || '',
    categorie: formation.categorie || '',
    souscategorie: formation.souscategorie || '',
    prix: formation.prix || 0,
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: cats } = await supabase
        .from('formationcategorie')
        .select('*')
        .eq('user_id', userId)
        .order('titre');
      const { data: subRows } = await supabase
        .from('formationsouscategorie')
        .select('*')
        .eq('user_id', userId)
        .order('titre');
      setCategories(cats || []);
      setSubs(subRows || []);
    })();
  }, [userId]);

  const startEdit = () => {
    setForm({
      titre: formation.titre,
      description: formation.description || '',
      categorie: formation.categorie || '',
      souscategorie: formation.souscategorie || '',
      prix: formation.prix || 0,
    });
    const cat = categories.find((c) => c.titre === formation.categorie);
    setSelectedCatId(cat ? cat.id : '');
    setError('');
    setEditing(true);
  };

  const filteredSubs = selectedCatId ? subs.filter((s) => s.idformationcategorie === selectedCatId) : [];

  const handleCategorySelect = (catId: number | '') => {
    setSelectedCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    setForm((prev) => ({ ...prev, categorie: cat ? cat.titre : '', souscategorie: '' }));
  };

  const save = async () => {
    if (!form.titre.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('formations')
        .update({
          titre: form.titre.trim(),
          description: form.description,
          categorie: form.categorie,
          souscategorie: form.souscategorie,
          prix: form.prix,
        })
        .eq('id', formation.id);
      if (err) throw err;
      setEditing(false);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\u2019enregistrement');
    }
    setSaving(false);
  };

  return (
    <section className="bg-background-50 border border-background-200/70 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground-900">
          <i className="ri-information-line mr-2 text-primary-500"></i>
          Informations de la formation
        </h4>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-background-100 text-foreground-900 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-background-200 transition-colors"
          >
            <i className="ri-edit-line"></i>
            Modifier
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground-700">
            {formation.description || <span className="text-foreground-400">Aucune description</span>}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {formation.categorie && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-background-100 text-foreground-600">
                <i className="ri-folder-2-line mr-1"></i>{formation.categorie}
              </span>
            )}
            {formation.souscategorie && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-accent-100 text-accent-900">
                <i className="ri-folder-3-line mr-1"></i>{formation.souscategorie}
              </span>
            )}
            {formation.duree && (
              <span className="px-2.5 py-1 rounded-full text-xs bg-background-100 text-foreground-600">
                <i className="ri-time-line mr-1"></i>{formation.duree}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-xs bg-primary-100 text-primary-700 font-semibold">
              {formation.prix > 0 ? `${formation.prix} MAD` : 'Gratuit'}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">Titre</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Rédigez la présentation de votre formation…"
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1">Catégorie</label>
              <select
                value={selectedCatId}
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
                value={subs.find((s) => s.titre === form.souscategorie)?.id ?? ''}
                onChange={(e) => {
                  const sub = subs.find((s) => s.id === parseInt(e.target.value, 10));
                  setForm((prev) => ({ ...prev, souscategorie: sub ? sub.titre : '' }));
                }}
                disabled={!selectedCatId}
                className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm bg-background-50 disabled:opacity-50"
              >
                <option value="">{selectedCatId ? 'Choisir une sous-catégorie…' : 'Choisir d\u2019abord une catégorie'}</option>
                {filteredSubs.map((s) => (
                  <option key={s.id} value={s.id}>{s.titre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">Prix (MAD)</label>
            <input
              type="number"
              value={form.prix}
              onChange={(e) => setForm({ ...form, prix: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2.5 border border-background-200/70 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={!form.titre.trim() || saving}
              className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? <i className="ri-loader-4-line animate-spin mr-1"></i> : <i className="ri-check-line mr-1"></i>}
              Enregistrer
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 bg-background-100 rounded-full text-sm cursor-pointer whitespace-nowrap"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}