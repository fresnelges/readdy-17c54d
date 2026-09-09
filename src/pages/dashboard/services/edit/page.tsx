import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function EditServicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const serviceId = parseInt(id || '0', 10);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [detailssup, setDetailssup] = useState('');
  const [prix, setPrix] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [tags, setTags] = useState('');
  const [pays, setPays] = useState('');
  const [ville, setVille] = useState('');
  const [typeservice, setTypeservice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [prixPromo, setPrixPromo] = useState('');

  const [coverFile, setCoverFile] = useState<MediaFile | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<MediaFile[]>([]);
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [existingMedias, setExistingMedias] = useState<string[]>([]);
  const [existingVideo, setExistingVideo] = useState<string>('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !serviceId) return;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch idcommerce first for categories
        const { data: userData } = await supabase.from('users').select('idcommerce').eq('id', user.id).maybeSingle();
        const commerceId = userData?.idcommerce;
        if (commerceId) {
          const { data: cats } = await supabase.from('categorieservices').select('id, nom').eq('idcommerce', commerceId).order('nom');
          setCategories(cats || []);

          const { data: typesData } = await supabase.from('categorieservices').select('type').eq('idcommerce', commerceId);
          const types = [...new Set((typesData || []).map((d: { type: string }) => d.type).filter(Boolean))];
          setServiceTypes(types as string[]);
        }

        // Load service data regardless
        const { data: service, error: svcErr } = await supabase.from('nospartenairesservices').select('*').eq('id', serviceId).maybeSingle();
        if (svcErr || !service) { navigate('/dashboard/services'); return; }

        setTitre(service.titre || '');
        setDescription(service.description || '');
        setDetailssup(service.detailssup || '');
        setPrix(service.prix ? String(service.prix) : '');
        if (service.prix_promo) {
          setPromoEnabled(true);
          setPrixPromo(String(service.prix_promo));
        }
        setCategorieId(service.categorie_id ? String(service.categorie_id) : '');
        setTags(service.tags || '');
        setPays(service.pays || '');
        setVille(service.ville || '');
        setTypeservice(service.typeservice || '');

        // Parse existing medias (pipe-separated URLs)
        const rawMedias = (service.product_image || '').split('|').filter(Boolean);
        const imagesOnly: string[] = [];
        let video: string = '';
        rawMedias.forEach((url: string) => {
          const lower = url.toLowerCase();
          if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
            if (!video) video = url;
          } else {
            imagesOnly.push(url);
          }
        });
        setExistingMedias(imagesOnly);
        setExistingVideo(video);
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [user, serviceId, navigate]);

  const createPreview = useCallback((file: File): string => URL.createObjectURL(file), []);
  const revokePreview = useCallback((preview: string) => URL.revokeObjectURL(preview), []);

  useEffect(() => {
    return () => {
      if (coverFile) revokePreview(coverFile.preview);
      additionalFiles.forEach((f) => revokePreview(f.preview));
      if (videoFile) revokePreview(videoFile.preview);
    };
  }, []);

  const validateFile = (file: File, isVideo: boolean): string | null => {
    const limit = isVideo ? MEDIA_LIMITS.video : MEDIA_LIMITS.image;
    if (file.size > limit.maxBytes) {
      return `Le fichier "${file.name}" depasse la limite de ${limit.label} (${formatFileSize(file.size)})`;
    }
    if (isVideo) {
      if (!file.type.startsWith('video/')) return `"${file.name}" n'est pas une video valide`;
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

  const removeExistingImage = (idx: number) => {
    setExistingMedias((prev) => prev.filter((_, i) => i !== idx));
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

  const removeExistingVideo = () => {
    setExistingVideo('');
  };

  const handleReplaceCover = () => {
    setExistingMedias((prev) => prev.slice(1));
    coverInputRef.current?.click();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!titre.trim()) errs.titre = 'Le titre est requis';
    if (!description.trim()) errs.description = 'La description est requise';
    if (!prix.trim() || isNaN(Number(prix)) || Number(prix) < 0) errs.prix = 'Prix invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mediaError) { setMsg({ type: 'error', text: mediaError }); return; }

    setSaving(true);
    setMsg(null);

    try {
      const allMediaUrls: string[] = [];
      const folder = `services/${Date.now()}`;

      // Upload new cover
      if (coverFile) {
        setUploading(true);
        const url = await uploadMediaFile(coverFile.file, `${folder}/cover`);
        allMediaUrls.push(url);
        setUploading(false);
      }

      // Upload additional images
      if (additionalFiles.length > 0) {
        setUploading(true);
        for (const f of additionalFiles) {
          const url = await uploadMediaFile(f.file, `${folder}/images`);
          allMediaUrls.push(url);
        }
        setUploading(false);
      }

      // Upload new video
      if (videoFile) {
        setUploading(true);
        const url = await uploadMediaFile(videoFile.file, `${folder}/video`);
        allMediaUrls.push(url);
        setUploading(false);
      }

      // Keep existing medias (that weren't removed)
      allMediaUrls.unshift(...existingMedias);
      if (existingVideo) allMediaUrls.push(existingVideo);

      const productImage = allMediaUrls.join('|');

      const slug = titre
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .replace(/^-+|-+$/g, '');

      const { error: updateErr } = await supabase.from('nospartenairesservices').update({
        titre: titre.trim(),
        description: description.trim(),
        detailssup: detailssup.trim() || '',
        prix: parseFloat(prix) || 0,
        prix_promo: promoEnabled && prixPromo.trim() ? parseFloat(prixPromo) : null,
        product_image: productImage,
        categorie_id: categorieId ? parseInt(categorieId, 10) : 0,
        tags: tags.trim() || null,
        pays: pays.trim() || null,
        ville: ville.trim() || null,
        typeservice: typeservice || null,
        slug,
      }).eq('id', serviceId);

      if (updateErr) throw updateErr;

      setMsg({ type: 'success', text: 'Service mis a jour avec succes !' });
      setTimeout(() => navigate('/dashboard/services'), 1200);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la mise a jour' });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const dropZoneClasses = (hasFile: boolean) =>
    `relative border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${hasFile ? 'border-primary-200/70 bg-primary-50/30 p-0 min-h-[180px]' : 'border-background-300/60 bg-background-50 hover:border-primary-300/50 hover:bg-background-100/50 p-6 min-h-[140px]'}`;

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard/services')} className="w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-background-200/70 text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line"></i>
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Modifier le service</h2>
          <p className="text-sm text-foreground-500 mt-1">{titre || 'Chargement...'}</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {uploading && (
        <div className="mb-5 px-4 py-3 rounded-lg text-sm font-medium bg-secondary-50 text-secondary-700 flex items-center gap-2">
          <i className="ri-loader-4-line animate-spin"></i> Telechargement des medias en cours...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos generales */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Titre du service <span className="text-red-500">*</span></label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.titre ? 'border-red-300' : 'border-background-200/70'}`} />
            {errors.titre && <p className="text-xs text-red-500 mt-1">{errors.titre}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors resize-none ${errors.description ? 'border-red-300' : 'border-background-200/70'}`} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Details supplementaires</label>
            <textarea value={detailssup} onChange={(e) => setDetailssup(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Prix (MAD) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={prix} onChange={(e) => setPrix(e.target.value)}
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.prix ? 'border-red-300' : 'border-background-200/70'}`} />
              {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Type de service</label>
              <select value={typeservice} onChange={(e) => setTypeservice(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer">
                <option value="">Selectionner un type</option>
                {serviceTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </div>

          {/* Prix promotionnel */}
          <div className="bg-background-100/70 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={promoEnabled} onChange={(e) => { setPromoEnabled(e.target.checked); if (!e.target.checked) setPrixPromo(''); }}
                className="w-4 h-4 rounded border-background-300/60 text-primary-500 focus:ring-primary-400 cursor-pointer" />
              <span className="text-sm font-semibold text-foreground-800">Activer la promotion</span>
            </label>
            {promoEnabled && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground-700 mb-1">Prix promotionnel (MAD)</label>
                <input type="number" step="0.01" min="0" value={prixPromo} onChange={(e) => setPrixPromo(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Categorie</label>
              <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer">
                <option value="">Aucune categorie</option>
                {categories.map((cat) => (<option key={cat.id} value={String(cat.id)}>{cat.nom}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Tags</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Pays</label>
              <input type="text" value={pays} onChange={(e) => setPays(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Ville</label>
              <input type="text" value={ville} onChange={(e) => setVille(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors" />
            </div>
          </div>
        </div>

        {/* Medias */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          <h3 className="text-base font-bold font-heading text-foreground-900 pb-3 border-b border-background-200/70">Medias</h3>

          {mediaError && (
            <div className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium">{mediaError}</div>
          )}

          {/* Medias existants */}
          {(existingMedias.length > 0 || existingVideo) && (
            <div className="bg-background-100/70 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground-700 uppercase tracking-wide">Medias existants</h4>

              {/* Existing cover image (first element) */}
              {existingMedias.length > 0 && (
                <div>
                  <p className="text-xs text-foreground-500 mb-2">Image de couverture</p>
                  <div className="relative w-40 h-28 rounded-lg overflow-hidden bg-background-200/70">
                    <img src={existingMedias[0]} alt="Couverture" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(0)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer"
                      title="Supprimer l'image de couverture"
                    >
                      <i className="ri-close-line text-xs"></i>
                    </button>
                    <button
                      type="button"
                      onClick={handleReplaceCover}
                      className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/50 text-white rounded text-[10px] hover:bg-accent-500 transition-colors cursor-pointer"
                    >
                      Remplacer
                    </button>
                  </div>
                </div>
              )}

              {/* Existing additional images (rest) */}
              {existingMedias.length > 1 && (
                <div>
                  <p className="text-xs text-foreground-500 mb-2">Images supplementaires ({existingMedias.length - 1})</p>
                  <div className="flex flex-wrap gap-2">
                    {existingMedias.slice(1).map((url, idx) => (
                      <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-background-200/70 group">
                        <img src={url} alt={`Image ${idx + 2}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(idx + 1)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <i className="ri-close-line text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing video */}
              {existingVideo && (
                <div>
                  <p className="text-xs text-foreground-500 mb-2">Video</p>
                  <div className="relative w-64 rounded-lg overflow-hidden bg-black group">
                    <video src={existingVideo} controls className="w-full max-h-[180px]" />
                    <button
                      type="button"
                      onClick={removeExistingVideo}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer z-10"
                    >
                      <i className="ri-close-line text-xs"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nouvelle image de couverture */}
          <input ref={coverInputRef} type="file" accept={MEDIA_LIMITS.image.accept} onChange={handleCoverChange} className="hidden" />
          {!coverFile && existingMedias.length === 0 && (
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-2">Image de couverture</label>
              <div onClick={() => coverInputRef.current?.click()} className={dropZoneClasses(false)}>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background-100 text-foreground-400">
                  <i className="ri-image-line text-xl"></i>
                </div>
                <div className="text-center">
                  <p className="text-sm text-foreground-600 font-medium">Cliquez ou glissez une image</p>
                  <p className="text-xs text-foreground-400 mt-0.5">Max {MEDIA_LIMITS.image.label} — JPG, PNG, WebP, GIF</p>
                </div>
              </div>
            </div>
          )}

          {coverFile && (
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-2">Nouvelle image de couverture</label>
              <div className="relative w-full rounded-xl overflow-hidden" style={{ minHeight: '180px' }}>
                <img src={coverFile.preview} alt="Nouvelle couverture" className="w-full h-full object-cover rounded-xl max-h-[300px]" />
                <button type="button" onClick={(ev) => { ev.stopPropagation(); removeCover(); }}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors cursor-pointer">
                  <i className="ri-close-line text-sm"></i>
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white rounded text-xs">
                  {formatFileSize(coverFile.file.size)}
                </div>
              </div>
            </div>
          )}

          {/* Nouvelles images supplementaires */}
          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-2">Images supplementaires ({additionalFiles.length})</label>
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

          {/* Nouvelle video */}
          {!existingVideo && (
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-2">Video courte</label>
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
                      <p className="text-sm text-foreground-600 font-medium">Cliquez ou glissez une video</p>
                      <p className="text-xs text-foreground-400 mt-0.5">Max {MEDIA_LIMITS.video.label} — MP4, WebM</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
            {saving ? (<><i className="ri-loader-4-line animate-spin"></i>{uploading ? 'Telechargement...' : 'Enregistrement...'}</>) : (<><i className="ri-check-line"></i>Enregistrer</>)}
          </button>
          <button type="button" onClick={() => navigate('/dashboard/services')}
            className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}