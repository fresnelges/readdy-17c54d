import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadMediaFile, formatFileSize, MEDIA_LIMITS } from '@/hooks/useUpload';

interface ServiceCategory {
  id: number;
  nom: string;
}

interface MediaFile {
  file: File;
  preview: string;
}

interface FormData {
  titre: string;
  description: string;
  detailssup: string;
  prix: string;
  categorie_id: string;
  tags: string;
  typeservice: string;
}

const initialFormData: FormData = {
  titre: '',
  description: '',
  detailssup: '',
  prix: '',
  categorie_id: '',
  tags: '',
  typeservice: '',
};

export default function NewServicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [prixPromo, setPrixPromo] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [coverFile, setCoverFile] = useState<MediaFile | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<MediaFile[]>([]);
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch idcommerce first, then categories
    supabase
      .from('users')
      .select('idcommerce')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data: userData }) => {
        const commerceId = userData?.idcommerce;
        if (!commerceId) return;
        
        supabase
          .from('categorieservices')
          .select('id, nom')
          .eq('idcommerce', commerceId)
          .order('nom')
          .then(({ data }) => setCategories(data || []));
        
        supabase
          .from('categorieservices')
          .select('type')
          .eq('idcommerce', commerceId)
          .then(({ data }) => {
            const types = [...new Set((data || []).map((d: { type: string }) => d.type).filter(Boolean))];
            setServiceTypes(types);
          });
      });
  }, [user]);

  const createPreview = useCallback((file: File): string => URL.createObjectURL(file), []);

  const revokePreview = useCallback((preview: string) => {
    URL.revokeObjectURL(preview);
  }, []);

  useEffect(() => {
    return () => {
      if (coverFile) revokePreview(coverFile.preview);
      additionalFiles.forEach((f) => revokePreview(f.preview));
      if (videoFile) revokePreview(videoFile.preview);
    };
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateFile = (file: File, isVideo: boolean): string | null => {
    const limit = isVideo ? MEDIA_LIMITS.video : MEDIA_LIMITS.image;
    if (file.size > limit.maxBytes) {
      return `Le fichier "${file.name}" dépasse la limite de ${limit.label} (${formatFileSize(file.size)})`;
    }
    if (isVideo) {
      if (!file.type.startsWith('video/')) return `"${file.name}" n'est pas une vidéo valide`;
    } else {
      if (!file.type.startsWith('image/')) return `"${file.name}" n'est pas une image valide`;
    }
    return null;
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f, false);
    if (err) { setMediaError(err); return; }
    if (coverFile) revokePreview(coverFile.preview);
    setCoverFile({ file: f, preview: createPreview(f) });
  };

  const handleAdditionalImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const err = validateFile(f, false);
      if (err) { setMediaError(err); return; }
    }
    const newFiles = files.map((f) => ({ file: f, preview: createPreview(f) }));
    setAdditionalFiles((prev) => [...prev, ...newFiles]);
    if (imagesInputRef.current) imagesInputRef.current.value = '';
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f, true);
    if (err) { setMediaError(err); return; }
    if (videoFile) revokePreview(videoFile.preview);
    setVideoFile({ file: f, preview: createPreview(f) });
  };

  const removeCover = () => {
    if (coverFile) revokePreview(coverFile.preview);
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const removeAdditionalImage = (idx: number) => {
    setAdditionalFiles((prev) => {
      const next = [...prev];
      revokePreview(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const removeVideo = () => {
    if (videoFile) revokePreview(videoFile.preview);
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const generateSlug = (titre: string): string => {
    return titre
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.titre.trim()) errs.titre = 'Le titre est requis';
    if (!form.description.trim()) errs.description = 'La description est requise';
    if (!form.prix.trim() || isNaN(Number(form.prix)) || Number(form.prix) < 0) errs.prix = 'Prix invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    if (mediaError) { setMsg({ type: 'error', text: mediaError }); return; }

    setSaving(true);
    setUploading(true);
    setMsg(null);

    try {
      const mediaUrls: string[] = [];
      const folder = `services/${Date.now()}`;

      if (coverFile) {
        const url = await uploadMediaFile(coverFile.file, `${folder}/cover`);
        mediaUrls.push(url);
      }

      for (const f of additionalFiles) {
        const url = await uploadMediaFile(f.file, `${folder}/images`);
        mediaUrls.push(url);
      }

      if (videoFile) {
        const url = await uploadMediaFile(videoFile.file, `${folder}/video`);
        mediaUrls.push(url);
      }

      setUploading(false);

      const productImage = mediaUrls.length > 0 ? mediaUrls.join('|') : '';

      const slug = generateSlug(form.titre);
      const payload = {
        titre: form.titre.trim(),
        description: form.description.trim(),
        detailssup: form.detailssup.trim() || '',
        prix: parseFloat(form.prix) || 0,
        prix_promo: promoEnabled && prixPromo.trim() ? parseFloat(prixPromo) : null,
        product_image: productImage,
        categorie_id: form.categorie_id ? parseInt(form.categorie_id, 10) : 0,
        tags: form.tags.trim() || null,
        pays: user.Pays || null,
        ville: user.Ville || null,
        typeservice: form.typeservice || null,
        owner: user.id,
        slug,
      };

      const { error: insertError } = await supabase.from('nospartenairesservices').insert(payload);
      if (insertError) throw insertError;

      setMsg({ type: 'success', text: 'Service créé avec succès !' });
      setTimeout(() => navigate('/dashboard/services'), 1200);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la création du service' });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const dropZoneClasses = (hasFile: boolean) =>
    `relative border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${hasFile ? 'border-primary-200/70 bg-primary-50/30 p-0 min-h-[180px]' : 'border-background-300/60 bg-background-50 hover:border-primary-300/50 hover:bg-background-100/50 p-6 min-h-[140px]'}`;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard/services')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-background-200/70 text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
        >
          <i className="ri-arrow-left-line"></i>
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Nouveau service</h2>
          <p className="text-sm text-foreground-500 mt-1">Ajoutez une offre de service à votre catalogue</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {uploading && (
        <div className="mb-5 px-4 py-3 rounded-lg text-sm font-medium bg-secondary-50 text-secondary-700 flex items-center gap-2">
          <i className="ri-loader-4-line animate-spin"></i> Téléchargement des médias en cours...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos générales */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          {/* Titre */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Titre du service <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => updateField('titre', e.target.value)}
              placeholder="Ex: Développement Web sur mesure"
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.titre ? 'border-red-300' : 'border-background-200/70'}`}
            />
            {errors.titre && <p className="text-xs text-red-500 mt-1">{errors.titre}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Décrivez votre service en détail..."
              rows={4}
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none ${errors.description ? 'border-red-300' : 'border-background-200/70'}`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Détails supplémentaires */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Détails supplémentaires</label>
            <textarea
              value={form.detailssup}
              onChange={(e) => updateField('detailssup', e.target.value)}
              placeholder="Informations complémentaires, conditions, livrables..."
              rows={3}
              className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none"
            />
          </div>

          {/* Prix + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Prix (MAD) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.prix}
                onChange={(e) => updateField('prix', e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.prix ? 'border-red-300' : 'border-background-200/70'}`}
              />
              {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Type de service</label>
              <select
                value={form.typeservice}
                onChange={(e) => updateField('typeservice', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer"
              >
                <option value="">Sélectionner un type</option>
                {serviceTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prix promotionnel */}
          <div className="bg-background-100/70 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-background-300/60 text-primary-500 focus:ring-primary-400 cursor-pointer" />
              <span className="text-sm font-semibold text-foreground-800">Activer la promotion</span>
            </label>
            {promoEnabled && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground-700 mb-1">Prix promotionnel (MAD)</label>
                <input type="number" step="0.01" min="0" value={prixPromo} onChange={(e) => setPrixPromo(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.prixPromo ? 'border-red-300' : 'border-background-200/70'}`} />
                {errors.prixPromo && <p className="text-xs text-red-500 mt-1">{errors.prixPromo}</p>}
              </div>
            )}
          </div>

          {/* Catégorie + Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Catégorie</label>
              <select
                value={form.categorie_id}
                onChange={(e) => updateField('categorie_id', e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>{cat.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => updateField('tags', e.target.value)}
                placeholder="Ex: web, design, rapide"
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Médias */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          <h3 className="text-base font-bold font-heading text-foreground-900 pb-3 border-b border-background-200/70">Médias</h3>

          {mediaError && (
            <div className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium">{mediaError}</div>
          )}

          {/* Image de couverture */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-2">Image de couverture</label>
            <input ref={coverInputRef} type="file" accept={MEDIA_LIMITS.image.accept} onChange={handleCoverChange} className="hidden" />
            <div onClick={() => coverInputRef.current?.click()} className={dropZoneClasses(!!coverFile)}>
              {coverFile ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <img src={coverFile.preview} alt="Couverture" className="w-full h-full object-cover rounded-xl" />
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); removeCover(); }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer">
                    <i className="ri-close-line text-sm"></i>
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white rounded text-xs">
                    {formatFileSize(coverFile.file.size)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background-100 text-foreground-400">
                    <i className="ri-image-line text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground-600 font-medium">Cliquez ou glissez une image</p>
                    <p className="text-xs text-foreground-400 mt-0.5">Max {MEDIA_LIMITS.image.label} — JPG, PNG, WebP, GIF</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Images supplémentaires */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-2">Images supplémentaires ({additionalFiles.length})</label>
            <div className="flex flex-wrap gap-3">
              {additionalFiles.map((f, idx) => (
                <div key={f.preview} className="relative w-24 h-24 rounded-lg border border-background-200/70 overflow-hidden bg-background-100 flex-shrink-0 group">
                  <img src={f.preview} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeAdditionalImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white rounded text-[10px]">{formatFileSize(f.file.size)}</div>
                </div>
              ))}
              <input ref={imagesInputRef} type="file" accept={MEDIA_LIMITS.image.accept} multiple onChange={handleAdditionalImages} className="hidden" />
              <div onClick={() => imagesInputRef.current?.click()}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-background-300/60 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary-300/50 hover:bg-background-100/50 transition-colors flex-shrink-0">
                <i className="ri-add-line text-foreground-400"></i>
                <span className="text-[10px] text-foreground-400">Ajouter</span>
              </div>
            </div>
            <p className="text-xs text-foreground-400 mt-1.5">Max {MEDIA_LIMITS.image.label} par image</p>
          </div>

          {/* Vidéo courte */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-2">Vidéo courte</label>
            <input ref={videoInputRef} type="file" accept={MEDIA_LIMITS.video.accept} onChange={handleVideoChange} className="hidden" />
            <div onClick={() => videoInputRef.current?.click()} className={dropZoneClasses(!!videoFile)}>
              {videoFile ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-black">
                  <video src={videoFile.preview} controls className="w-full h-full object-contain max-h-[300px]" />
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); removeVideo(); }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer z-10">
                    <i className="ri-close-line text-sm"></i>
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white rounded text-xs z-10">
                    {formatFileSize(videoFile.file.size)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background-100 text-foreground-400">
                    <i className="ri-video-line text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground-600 font-medium">Cliquez ou glissez une vidéo</p>
                    <p className="text-xs text-foreground-400 mt-0.5">Max {MEDIA_LIMITS.video.label} — MP4, WebM</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                {uploading ? 'Téléchargement...' : 'Création...'}
              </>
            ) : (
              <>
                <i className="ri-check-line"></i>
                Créer le service
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/services')}
            className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}