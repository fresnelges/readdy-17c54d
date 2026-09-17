import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';
import { uploadMediaFile, formatFileSize, MEDIA_LIMITS } from '@/hooks/useUpload';

interface ProductCategory {
  id: number;
  name: string;
}

interface VariantDef {
  id: string;
  name: string;
  optionsText: string;
}

interface SkuRow {
  label: string;
  options: string[];
  price: string;
  stock: string;
  discount_enabled: boolean;
  discount_price: string;
}

interface MediaFile {
  file: File;
  preview: string;
}

type PricingMode = 'same' | 'per_variant';

export default function NewProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPrice, setDiscountPrice] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('same');
  const [hasVariants, setHasVariants] = useState(false);
  const [variantDefs, setVariantDefs] = useState<VariantDef[]>([]);
  const [skus, setSkus] = useState<SkuRow[]>([]);
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
    supabase
      .from('product_categories')
      .select('id, name')
      .order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, [user]);

  const createPreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

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

  const generateCombinations = (defs: VariantDef[]): string[][] => {
    if (defs.length === 0 || defs.some((d) => !d.optionsText.trim())) return [];
    const optionArrays = defs.map((d) =>
      d.optionsText.split(',').map((o) => o.trim()).filter(Boolean)
    );
    if (optionArrays.some((arr) => arr.length === 0)) return [];
    let combos: string[][] = [[]];
    for (const arr of optionArrays) {
      const next: string[][] = [];
      for (const combo of combos) {
        for (const opt of arr) {
          next.push([...combo, opt]);
        }
      }
      combos = next;
    }
    return combos;
  };

  const rebuildSkus = (defs: VariantDef[]) => {
    const combos = generateCombinations(defs);
    setSkus(
      combos.map((combo) => ({
        label: combo.join(' / '),
        options: combo,
        price: pricingMode === 'same' ? '' : price,
        stock: pricingMode === 'same' ? '' : stock,
        discount_enabled: false,
        discount_price: '',
      }))
    );
  };

  const addVariantDef = () => {
    const newDef: VariantDef = { id: crypto.randomUUID(), name: '', optionsText: '' };
    const updated = [...variantDefs, newDef];
    setVariantDefs(updated);
  };

  const removeVariantDef = (id: string) => {
    const updated = variantDefs.filter((d) => d.id !== id);
    setVariantDefs(updated);
    rebuildSkus(updated);
  };

  const updateVariantDef = (id: string, field: 'name' | 'optionsText', value: string) => {
    const updated = variantDefs.map((d) => (d.id === id ? { ...d, [field]: value } : d));
    setVariantDefs(updated);
    if (field === 'optionsText') rebuildSkus(updated);
  };

  const updateSkuField = (index: number, field: keyof SkuRow, value: string | boolean) => {
    setSkus((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Le nom est requis';
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) errs.price = 'Prix invalide';
    if (stock.trim() && (isNaN(Number(stock)) || Number(stock) < 0)) errs.stock = 'Stock invalide';
    if (discountEnabled && discountPrice.trim() && (isNaN(Number(discountPrice)) || Number(discountPrice) < 0)) {
      errs.discountPrice = 'Prix promo invalide';
    }
    if (hasVariants && pricingMode !== 'same') {
      for (let i = 0; i < skus.length; i++) {
        const s = skus[i];
        if (!s.price.trim() || isNaN(Number(s.price)) || Number(s.price) < 0) {
          errs[`sku_price_${i}`] = `Prix invalide pour "${s.label}"`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mediaError) { setMsg({ type: 'error', text: mediaError }); return; }

    setSaving(true);
    setUploading(true);
    setMsg(null);

    try {
      const media: { url: string; type: string }[] = [];
      const folder = `products/${Date.now()}`;

      if (coverFile) {
        const url = await uploadMediaFile(coverFile.file, `${folder}/cover`);
        media.push({ url, type: 'image' });
      }

      for (const f of additionalFiles) {
        const url = await uploadMediaFile(f.file, `${folder}/images`);
        media.push({ url, type: 'image' });
      }

      if (videoFile) {
        const url = await uploadMediaFile(videoFile.file, `${folder}/video`);
        media.push({ url, type: 'video' });
      }

      setUploading(false);

      const productPayload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        status,
        price: parseFloat(price) || 0,
        stock: parseInt(stock, 10) || 0,
        discount_enabled: discountEnabled,
        discount_price: discountEnabled && discountPrice.trim() ? parseFloat(discountPrice) : null,
        pricing_mode: hasVariants ? (pricingMode === 'per_variant' ? 1 : 0) : 0,
        media: JSON.stringify(media),
        owner: user?.id,
        idcommerce: getCommerceId(user),
        ville: user?.Ville || null,
        pays: user?.Pays || null,
      };

      const { data: productData, error: insertError } = await supabase
        .from('product_items')
        .insert(productPayload)
        .select('id')
        .single();

      if (insertError) throw insertError;
      const productId = productData.id;

      if (hasVariants && variantDefs.length > 0) {
        for (let i = 0; i < variantDefs.length; i++) {
          const def = variantDefs[i];
          const opts = def.optionsText.split(',').map((o) => o.trim()).filter(Boolean);
          await supabase.from('product_variants').insert({
            product_id: productId,
            name: def.name.trim(),
            options: JSON.stringify(opts),
            sort_order: i,
          });
        }

        const skuPayloads = skus.map((s) => ({
          product_id: productId,
          label: s.label,
          options: JSON.stringify(s.options),
          price: pricingMode === 'per_variant' ? parseFloat(s.price) || 0 : null,
          stock: parseInt(s.stock, 10) || 0,
          discount_enabled: s.discount_enabled,
          discount_price: s.discount_enabled && s.discount_price.trim() ? parseFloat(s.discount_price) : null,
        }));
        await supabase.from('product_skus').insert(skuPayloads);
      }

      setMsg({ type: 'success', text: 'Produit créé avec succès !' });
      setTimeout(() => navigate('/dashboard/products'), 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err)
            ? String((err as Record<string, unknown>).message)
            : 'Erreur lors de la création du produit';
      setMsg({ type: 'error', text: message });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const dropZoneClasses = (hasFile: boolean) =>
    `relative border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${hasFile ? 'border-primary-200/70 bg-primary-50/30 p-0 min-h-[180px]' : 'border-background-300/60 bg-background-50 hover:border-primary-300/50 hover:bg-background-100/50 p-6 min-h-[140px]'}`;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard/products')} className="w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-background-200/70 text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line"></i>
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Nouveau produit</h2>
          <p className="text-sm text-foreground-500 mt-1">Ajoutez un produit à votre catalogue</p>
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
          <h3 className="text-base font-bold font-heading text-foreground-900 pb-3 border-b border-background-200/70">Informations générales</h3>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Nom du produit <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: T-shirt Premium"
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.name ? 'border-red-300' : 'border-background-200/70'}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre produit..." rows={3}
              className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Catégorie</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer">
                <option value="">Aucune catégorie</option>
                {categories.map((cat) => (<option key={cat.id} value={String(cat.id)}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 cursor-pointer">
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Prix (MAD) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.price ? 'border-red-300' : 'border-background-200/70'}`} />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Stock</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0"
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.stock ? 'border-red-300' : 'border-background-200/70'}`} />
              {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
          </div>

          <div className="bg-background-100/70 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-background-300/60 text-primary-500 focus:ring-primary-400 cursor-pointer" />
              <span className="text-sm font-semibold text-foreground-800">Activer la promotion</span>
            </label>
            {discountEnabled && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground-700 mb-1">Prix promotionnel (MAD)</label>
                <input type="number" step="0.01" min="0" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors ${errors.discountPrice ? 'border-red-300' : 'border-background-200/70'}`} />
                {errors.discountPrice && <p className="text-xs text-red-500 mt-1">{errors.discountPrice}</p>}
              </div>
            )}
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

        {/* Variantes */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-background-200/70">
            <h3 className="text-base font-bold font-heading text-foreground-900">Variantes</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasVariants} onChange={(e) => { setHasVariants(e.target.checked); if (!e.target.checked) { setVariantDefs([]); setSkus([]); } }}
                className="w-4 h-4 rounded border-background-300/60 text-primary-500 focus:ring-primary-400 cursor-pointer" />
              <span className="text-sm text-foreground-600">Ce produit a des variantes (tailles, couleurs...)</span>
            </label>
          </div>

          {hasVariants && (
            <>
              <div className="space-y-3">
                {variantDefs.map((def) => (
                  <div key={def.id} className="flex items-start gap-3 p-3 bg-background-100/70 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={def.name} onChange={(e) => updateVariantDef(def.id, 'name', e.target.value)}
                        placeholder="Type (ex: Taille)" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300" />
                      <input type="text" value={def.optionsText} onChange={(e) => updateVariantDef(def.id, 'optionsText', e.target.value)}
                        placeholder="Options (ex: S, M, L)" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300" />
                    </div>
                    <button type="button" onClick={() => removeVariantDef(def.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0 mt-0.5">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addVariantDef}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary-50 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-secondary-100 transition-colors cursor-pointer">
                  <i className="ri-add-line"></i> Ajouter un type de variante
                </button>
              </div>

              {skus.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground-800">Combinaisons générées ({skus.length})</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-foreground-500">Tarification :</span>
                      <button type="button" onClick={() => setPricingMode('same')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${pricingMode === 'same' ? 'bg-primary-50 text-primary-700' : 'bg-background-100 text-foreground-500 hover:bg-background-200/70'}`}>
                        Prix unique
                      </button>
                      <button type="button" onClick={() => setPricingMode('per_variant')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${pricingMode === 'per_variant' ? 'bg-primary-50 text-primary-700' : 'bg-background-100 text-foreground-500 hover:bg-background-200/70'}`}>
                        Prix par variante
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-background-200/70">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-background-100 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                          <th className="text-left px-4 py-2.5">Combinaison</th>
                          {pricingMode === 'per_variant' && <th className="text-left px-4 py-2.5">Prix (MAD)</th>}
                          <th className="text-left px-4 py-2.5">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-background-200/70">
                        {skus.map((sku, idx) => (
                          <tr key={idx} className="hover:bg-background-50/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="text-foreground-800 font-medium">{sku.label}</span>
                            </td>
                            {pricingMode === 'per_variant' && (
                              <td className="px-4 py-2.5">
                                <input type="number" step="0.01" min="0" value={sku.price}
                                  onChange={(e) => updateSkuField(idx, 'price', e.target.value)}
                                  className={`w-24 px-2 py-1.5 bg-background-50 border rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 ${errors[`sku_price_${idx}`] ? 'border-red-300' : 'border-background-200/70'}`} />
                                {errors[`sku_price_${idx}`] && <p className="text-xs text-red-500 mt-0.5">{errors[`sku_price_${idx}`]}</p>}
                              </td>
                            )}
                            <td className="px-4 py-2.5">
                              <input type="number" min="0" value={sku.stock}
                                onChange={(e) => updateSkuField(idx, 'stock', e.target.value)}
                                className="w-20 px-2 py-1.5 bg-background-50 border border-background-200/70 rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
            {saving ? (<><i className="ri-loader-4-line animate-spin"></i>{uploading ? 'Téléchargement...' : 'Création...'}</>) : (<><i className="ri-check-line"></i>Créer le produit</>)}
          </button>
          <button type="button" onClick={() => navigate('/dashboard/products')}
            className="px-4 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}