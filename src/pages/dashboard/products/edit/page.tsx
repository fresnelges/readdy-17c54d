import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ProductCategory {
  id: number;
  name: string;
  image_couverture?: string;
  icon?: string;
}

interface ProductItem {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  status: string;
  price: number;
  stock: number;
  discount_enabled: boolean;
  discount_price: number | null;
  media: { url: string; type: string }[] | null;
  pricing_mode: number;
}

interface ExistingVariant {
  id: number;
  name: string;
  options: string[];
}

interface ExistingSku {
  id: number;
  label: string;
  options: string[];
  price: number | null;
  stock: number;
  discount_enabled: boolean;
  discount_price: number | null;
}

interface VariantDef {
  id: string;
  name: string;
  optionsText: string;
  existingId?: number;
}

interface SkuRow {
  key: string;
  label: string;
  options: string[];
  price: string;
  stock: string;
  discount_enabled: boolean;
  discount_price: string;
  existingId?: number;
}

type PricingMode = 'same' | 'per_variant';

export default function EditProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || '0', 10);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPrice, setDiscountPrice] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('same');
  const [hasVariants, setHasVariants] = useState(false);
  const [variantDefs, setVariantDefs] = useState<VariantDef[]>([]);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !productId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: cats } = await supabase.from('product_categories').select('id, name').order('name');
        setCategories(cats || []);

        const { data: product, error: prodErr } = await supabase.from('product_items').select('*').eq('id', productId).maybeSingle();
        if (prodErr || !product) { navigate('/dashboard/products'); return; }

        setName(product.name || '');
        setDescription(product.description || '');
        setCategoryId(product.category_id ? String(product.category_id) : '');
        setStatus(product.status || 'draft');
        setPrice(String(product.price || ''));
        setStock(String(product.stock || 0));
        setDiscountEnabled(product.discount_enabled || false);
        setDiscountPrice(product.discount_price ? String(product.discount_price) : '');
        if (product.media && product.media.length > 0) setMediaUrl(product.media[0].url || '');
        setPricingMode(product.pricing_mode === 1 ? 'per_variant' : 'same');

        const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', productId).order('sort_order');
        if (variants && variants.length > 0) {
          setHasVariants(true);
          setVariantDefs(variants.map((v) => ({
            id: crypto.randomUUID(), name: v.name, optionsText: (v.options || []).join(', '), existingId: v.id,
          })));
        }

        const { data: existingSkus } = await supabase.from('product_skus').select('*').eq('product_id', productId);
        if (existingSkus && existingSkus.length > 0) {
          setSkus(existingSkus.map((s) => ({
            key: crypto.randomUUID(),
            label: s.label,
            options: s.options || [],
            price: s.price ? String(s.price) : '',
            stock: String(s.stock || 0),
            discount_enabled: s.discount_enabled || false,
            discount_price: s.discount_price ? String(s.discount_price) : '',
            existingId: s.id,
          })));
        }
      } catch { /* silent */ } finally { setLoading(false); }
    };
    load();
  }, [user, productId, navigate]);

  const generateCombinations = (defs: VariantDef[]): string[][] => {
    if (defs.length === 0 || defs.some((d) => !d.optionsText.trim())) return [];
    const optionArrays = defs.map((d) => d.optionsText.split(',').map((o) => o.trim()).filter(Boolean));
    if (optionArrays.some((arr) => arr.length === 0)) return [];
    let combos: string[][] = [[]];
    for (const arr of optionArrays) {
      const next: string[][] = [];
      for (const combo of combos) { for (const opt of arr) { next.push([...combo, opt]); } }
      combos = next;
    }
    return combos;
  };

  const rebuildSkus = (defs: VariantDef[]) => {
    const combos = generateCombinations(defs);
    const currentMap = new Map<string, SkuRow>();
    skus.forEach((s) => currentMap.set(s.label, s));

    setSkus(combos.map((combo) => {
      const label = combo.join(' / ');
      const existing = currentMap.get(label);
      return existing || {
        key: crypto.randomUUID(),
        label,
        options: combo,
        price: '',
        stock: '',
        discount_enabled: false,
        discount_price: '',
      };
    }));
  };

  const addVariantDef = () => {
    const updated = [...variantDefs, { id: crypto.randomUUID(), name: '', optionsText: '' }];
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
    if (discountEnabled && discountPrice.trim() && (isNaN(Number(discountPrice)) || Number(discountPrice) < 0)) errs.discountPrice = 'Prix promo invalide';
    if (hasVariants && pricingMode === 'per_variant') {
      for (let i = 0; i < skus.length; i++) {
        const s = skus[i];
        if (!s.price.trim() || isNaN(Number(s.price)) || Number(s.price) < 0) errs[`sku_price_${i}`] = `Prix invalide pour "${s.label}"`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setMsg(null);

    try {
      const media: { url: string; type: string }[] = mediaUrl.trim() ? [{ url: mediaUrl.trim(), type: 'image' }] : [];

      await supabase.from('product_items').update({
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
      }).eq('id', productId);

      // Handle variants: delete all, re-insert
      await supabase.from('product_variants').delete().eq('product_id', productId);
      await supabase.from('product_skus').delete().eq('product_id', productId);

      if (hasVariants && variantDefs.length > 0) {
        for (let i = 0; i < variantDefs.length; i++) {
          const def = variantDefs[i];
          const opts = def.optionsText.split(',').map((o) => o.trim()).filter(Boolean);
          await supabase.from('product_variants').insert({ product_id: productId, name: def.name.trim(), options: JSON.stringify(opts), sort_order: i });
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
        if (skuPayloads.length > 0) await supabase.from('product_skus').insert(skuPayloads);
      }

      setMsg({ type: 'success', text: 'Produit mis à jour avec succès !' });
      setTimeout(() => navigate('/dashboard/products'), 1200);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard/products')} className="w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-background-200/70 text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line"></i>
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Modifier le produit</h2>
          <p className="text-sm text-foreground-500 mt-1">{name || 'Chargement...'}</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 space-y-5">
          <h3 className="text-base font-bold font-heading text-foreground-900 pb-3 border-b border-background-200/70">Informations générales</h3>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Nom du produit <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.name ? 'border-red-300' : 'border-background-200/70'}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
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
              <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.price ? 'border-red-300' : 'border-background-200/70'}`} />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Stock</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.stock ? 'border-red-300' : 'border-background-200/70'}`} />
              {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground-800 mb-1.5">Image (URL)</label>
              <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors" />
            </div>
          </div>

          {mediaUrl && (
            <div className="w-24 h-24 rounded-lg border border-background-200/70 overflow-hidden bg-background-100">
              <img src={mediaUrl} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          <div className="bg-background-100/70 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-background-300/60 text-primary-500 focus:ring-primary-400 cursor-pointer" />
              <span className="text-sm font-semibold text-foreground-800">Activer la promotion</span>
            </label>
            {discountEnabled && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground-700 mb-1">Prix promotionnel (MAD)</label>
                <input type="number" step="0.01" min="0" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)}
                  className={`w-full px-3 py-2.5 bg-background-50 border rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors ${errors.discountPrice ? 'border-red-300' : 'border-background-200/70'}`} />
                {errors.discountPrice && <p className="text-xs text-red-500 mt-1">{errors.discountPrice}</p>}
              </div>
            )}
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
                      <input type="text" value={def.name} onChange={(e) => updateVariantDef(def.id, 'name', e.target.value)} placeholder="Type (ex: Taille)"
                        className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300" />
                      <input type="text" value={def.optionsText} onChange={(e) => updateVariantDef(def.id, 'optionsText', e.target.value)} placeholder="Options (ex: S, M, L)"
                        className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300" />
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
                    <span className="text-sm font-semibold text-foreground-800">Combinaisons ({skus.length})</span>
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
                          <tr key={sku.key} className="hover:bg-background-50/50 transition-colors">
                            <td className="px-4 py-2.5"><span className="text-foreground-800 font-medium">{sku.label}</span></td>
                            {pricingMode === 'per_variant' && (
                              <td className="px-4 py-2.5">
                                <input type="number" step="0.01" min="0" value={sku.price} onChange={(e) => updateSkuField(idx, 'price', e.target.value)}
                                  className={`w-24 px-2 py-1.5 bg-background-50 border rounded text-sm text-foreground-900 focus:outline-none focus:border-primary-300 ${errors[`sku_price_${idx}`] ? 'border-red-300' : 'border-background-200/70'}`} />
                                {errors[`sku_price_${idx}`] && <p className="text-xs text-red-500 mt-0.5">{errors[`sku_price_${idx}`]}</p>}
                              </td>
                            )}
                            <td className="px-4 py-2.5">
                              <input type="number" min="0" value={sku.stock} onChange={(e) => updateSkuField(idx, 'stock', e.target.value)}
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

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
            {saving ? (<><i className="ri-loader-4-line animate-spin"></i>Enregistrement...</>) : (<><i className="ri-check-line"></i>Enregistrer</>)}
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