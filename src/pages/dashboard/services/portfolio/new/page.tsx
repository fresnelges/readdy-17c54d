import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';
import { uploadMediaFile } from '@/hooks/useUpload';

export default function NewPortfolioPage() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    detailssup: '',
    tags: '',
    prix: '',
    product_image: '',
  });

  const [imageUploading, setImageUploading] = useState(false);
  const [imageTaille, setImageTaille] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImageUploading(true);
    try {
      const url = await uploadMediaFile(file, 'portfolio');
      if (url) {
        setFormData((prev) => ({ ...prev, product_image: url }));
        setImageTaille(file.size);
      }
    } catch {
      // silent
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titre.trim() || !user) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase.from('portfolio').insert({
        titre: formData.titre.trim(),
        description: formData.description.trim(),
        detailssup: formData.detailssup.trim() || null,
        tags: formData.tags.trim() || null,
        prix: parseFloat(formData.prix) || 0,
        product_image: formData.product_image || '',
        taille: imageTaille,
        owner: user.id,
        idcommerce: getCommerceId(user),
        pays: user.Pays || null,
        ville: user.Ville || null,
        slug: formData.titre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
      if (error) throw error;
      setMsg({ type: 'success', text: 'Projet ajouté avec succès !' });
      setTimeout(() => navigate('/dashboard/services/portfolio'), 1000);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la création' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Sub nav */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/dashboard/services/portfolio')} className="px-4 py-2.5 bg-background-50 border border-background-200/70 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line mr-1"></i> Portfolio
        </button>
        <span className="text-sm font-bold text-foreground-950">Nouveau projet</span>
      </div>

      <div className="max-w-2xl">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-6">Ajouter un projet réalisé</h2>

        {msg && (
          <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Image du projet</label>
            {formData.product_image ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-background-100 mb-2">
                <img src={formData.product_image} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setFormData((prev) => ({ ...prev, product_image: '' })); setImageTaille(0); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            ) : (
              <>
                <label
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-background-200/70 rounded-lg cursor-pointer hover:border-primary-300 transition-colors bg-background-50"
                >
                  {imageUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                      <span className="text-sm text-primary-500 font-medium">Upload en cours...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-image-add-line text-2xl text-foreground-400"></i>
                      <span className="text-sm text-foreground-500">Cliquez pour ajouter une image</span>
                      <span className="text-xs text-foreground-400">PNG, JPG, WEBP</span>
                    </div>
                  )}
                </label>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="absolute w-px h-px opacity-0 pointer-events-none" />
              </>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Titre du projet *</label>
            <input
              type="text"
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              required
              placeholder="Ex: Refonte site e-commerce"
              className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Décrivez le projet..."
              className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none"
            />
          </div>

          {/* Détails supplémentaires */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Détails supplémentaires</label>
            <textarea
              value={formData.detailssup}
              onChange={(e) => handleChange('detailssup', e.target.value)}
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none"
            />
          </div>

          {/* Prix */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Budget/Prix du projet (MAD)</label>
            <input
              type="number"
              value={formData.prix}
              onChange={(e) => handleChange('prix', e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-foreground-700 mb-1.5">Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="Ex: web, design, mobile"
              className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !formData.titre.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Enregistrement...
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i>
                  Enregistrer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/services/portfolio')}
              className="px-6 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}