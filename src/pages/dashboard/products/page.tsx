import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadMediaFile, MEDIA_LIMITS } from '@/hooks/useUpload';
import IconPicker from '@/components/feature/IconPicker';
import ImagePicker from '@/components/feature/ImagePicker';

async function urlToFile(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Echec telechargement image: ${response.status}`);
  const blob = await response.blob();
  const parts = url.split('/').pop()?.split('?')[0]?.split('.') || ['image', 'jpg'];
  const ext = parts.length > 1 ? parts.pop()! : 'jpg';
  const name = parts.join('.').slice(0, 50) || 'image';
  return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/jpeg' });
}

function getMediaArray(media: unknown): { url: string; type: string }[] {
  if (!media) return [];
  if (Array.isArray(media)) return media;
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface ProductItem {
  id: number;
  name: string;
  category_id: number | null;
  status: string;
  description: string | null;
  pricing_mode: number;
  currency: string;
  price: number;
  stock: number;
  discount_enabled: boolean;
  discount_price: number | null;
  media: { url: string; type: string }[] | null;
  ville: string | null;
  pays: string | null;
  created_at: string;
  updated_at: string;
  product_categories?: { id: number; name: string } | null;
}

interface ProductCategory {
  id: number;
  nom: string;
  image_couverture?: string;
  icon?: string;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const [categoryImageUploading, setCategoryImageUploading] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductItem | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editingDetailSaving, setEditingDetailSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscountEnabled, setEditDiscountEnabled] = useState(false);
  const [editDiscountPrice, setEditDiscountPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editCurrency, setEditCurrency] = useState('MAD');
  const [editStatus, setEditStatus] = useState('active');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editPricingMode, setEditPricingMode] = useState(0);
  const [editVille, setEditVille] = useState('');
  const [editPays, setEditPays] = useState('');
  const [editMedia, setEditMedia] = useState<{ url: string; type: string }[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  const [uploadingNew, setUploadingNew] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingExistingImageUrl, setEditingExistingImageUrl] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<'image' | 'icon'>('image');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState<string | null>(null);
  const categoryFileRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('categorie')
        .select('id, nom, image_couverture, icon')
        .eq('idcommerce', user.id)
        .order('nom');
      setCategories(data || []);
    } catch {
      // silent
    }
  }, [user]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('product_items')
        .select('*, product_categories(id, name)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', parseInt(categoryFilter, 10));
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    setCategorySaving(true);
    setCategoryMsg(null);
    try {
      let imageUrl = '';
      if (categoryTab === 'image' && (selectedLibraryUrl || categoryImage)) {
        setCategoryImageUploading(true);
        try {
          const file = selectedLibraryUrl ? await urlToFile(selectedLibraryUrl) : categoryImage!;
          imageUrl = await uploadMediaFile(file, 'categories');
          setCategoryMsg('Catégorie créée avec succès');
        } catch (uploadErr: unknown) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Erreur upload';
          console.error('[createCategory] upload failed:', msg);
          setCategoryMsg(`Image non téléchargée : ${msg}`);
          imageUrl = '';
        }
        setCategoryImageUploading(false);
      }

      console.log('[createCategory] inserting:', { nom: newCategoryName.trim(), idcommerce: user.id, image_couverture: imageUrl, icon: categoryTab === 'icon' ? selectedIcon : null });
      const { data: newCat, error: insertError } = await supabase
        .from('categorie')
        .insert({
          nom: newCategoryName.trim(),
          idcommerce: user.id,
          afficher: 1,
          description: newCategoryName.trim(),
          type: 'produit',
          image_couverture: categoryTab === 'image' ? imageUrl : '',
          icon: categoryTab === 'icon' ? selectedIcon : null,
        })
        .select('id')
        .single();
      if (insertError) {
        console.error('[createCategory] insert error:', insertError);
        throw insertError;
      }
      if (newCat) {
        await supabase.from('product_categories').upsert({
          id: newCat.id,
          name: newCategoryName.trim(),
          sort_order: newCat.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
      setNewCategoryName('');
      setCategoryImage(null);
      setCategoryImagePreview(null);
      setSelectedIcon(null);
      setSelectedLibraryUrl(null);
      setCategoryTab('image');
      setEditingCategory(null);
      setEditingExistingImageUrl(null);
      if (!categoryMsg || categoryMsg.includes('sans image')) {
        setCategoryMsg('Catégorie créée avec succès');
      }
      fetchCategories();
    } catch (err: unknown) {
      console.error('[createCategory] caught error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setCategoryMsg(message || 'Erreur lors de la création');
    } finally {
      setCategorySaving(false);
      setCategoryImageUploading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const { error: delError } = await supabase
        .from('categorie')
        .delete()
        .eq('id', id);
      if (delError) throw delError;
      await supabase.from('product_categories').delete().eq('id', id);
      setDeleteConfirm(null);
      fetchCategories();
      fetchProducts();
    } catch {
      setCategoryMsg('Erreur lors de la suppression');
    }
  };

  const handleStartEditCategory = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.nom);
    setEditingExistingImageUrl(cat.image_couverture || null);
    setCategoryImagePreview(cat.image_couverture || null);
    setCategoryImage(null);
    setSelectedIcon(cat.icon || null);
    setSelectedLibraryUrl(null);
    setCategoryTab(cat.icon ? 'icon' : 'image');
    setCategoryMsg(null);
    setDeleteConfirm(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setCategoryImage(null);
    setCategoryImagePreview(null);
    setSelectedIcon(null);
    setCategoryTab('image');
    setEditingExistingImageUrl(null);
    setSelectedLibraryUrl(null);
    setCategoryMsg(null);
    setDeleteConfirm(null);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim() || !user) return;
    setCategorySaving(true);
    setCategoryMsg(null);
    try {
      let imageUrl: string = editingExistingImageUrl || '';
      if (categoryTab === 'image' && (selectedLibraryUrl || categoryImage)) {
        setCategoryImageUploading(true);
        try {
          const file = selectedLibraryUrl ? await urlToFile(selectedLibraryUrl) : categoryImage!;
          imageUrl = await uploadMediaFile(file, 'categories');
        } catch (uploadErr: unknown) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Erreur upload';
          console.error('[updateCategory] upload failed:', msg);
          setCategoryMsg(`Image non téléchargée : ${msg}`);
          imageUrl = editingExistingImageUrl || '';
        }
        setCategoryImageUploading(false);
      } else if (categoryTab === 'image' && categoryImagePreview === null && editingExistingImageUrl && !selectedLibraryUrl && !categoryImage) {
        imageUrl = '';
      }

      console.log('[updateCategory] updating:', { id: editingCategory.id, nom: newCategoryName.trim(), image_couverture: imageUrl, icon: categoryTab === 'icon' ? selectedIcon : null });
      const { error: updateError } = await supabase
        .from('categorie')
        .update({
          nom: newCategoryName.trim(),
          image_couverture: categoryTab === 'image' ? imageUrl : '',
          icon: categoryTab === 'icon' ? selectedIcon : null,
        })
        .eq('id', editingCategory.id);
      if (updateError) {
        console.error('[updateCategory] update error:', updateError);
        throw updateError;
      }
      await supabase.from('product_categories').upsert({
        id: editingCategory.id,
        name: newCategoryName.trim(),
        sort_order: editingCategory.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      handleCancelEditCategory();
      if (!categoryMsg || categoryMsg.includes('sans nouvelle image')) {
        setCategoryMsg('Catégorie mise à jour avec succès');
      }
      fetchCategories();
    } catch (err: unknown) {
      console.error('[updateCategory] caught error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setCategoryMsg(message || 'Erreur lors de la mise à jour');
    } finally {
      setCategorySaving(false);
      setCategoryImageUploading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const { error: delError } = await supabase
        .from('product_items')
        .delete()
        .eq('id', productId);
      if (delError) throw delError;
      setDeletingProductId(null);
      fetchProducts();
    } catch {
      // silent
    }
  };

  const initEditFromProduct = (product: ProductItem) => {
    setDetailProduct(product);
    setEditingDetail(false);
    setEditName(product.name || '');
    setEditDescription(product.description || '');
    setEditPrice(String(product.price ?? ''));
    setEditDiscountEnabled(product.discount_enabled || false);
    setEditDiscountPrice(String(product.discount_price ?? ''));
    setEditStock(String(product.stock ?? ''));
    setEditCurrency(product.currency || 'MAD');
    setEditStatus(product.status || 'active');
    setEditCategoryId(String(product.category_id ?? ''));
    setEditPricingMode(product.pricing_mode || 0);
    setEditVille(product.ville || '');
    setEditPays(product.pays || '');
    setEditMedia(getMediaArray(product.media));
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
  };

  const handleSaveDetail = async () => {
    if (!detailProduct || !user) return;
    setEditingDetailSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (newMediaFiles.length > 0) {
        setUploadingNew(true);
        const results = await Promise.all(
          newMediaFiles.map((f) => uploadMediaFile(f, 'products').catch((err) => {
            console.error('[handleSaveDetail] upload failed for', f.name, err);
            return null;
          }))
        );
        uploadedUrls = results.filter((r): r is string => r !== null);
        setUploadingNew(false);
      }

      const mergedMedia = [
        ...editMedia.filter((m) => m.url),
        ...uploadedUrls.map((url) => ({ url, type: 'image' as const })),
      ];
      const categoryId = editCategoryId ? parseInt(editCategoryId, 10) : null;

      const { error: updateError } = await supabase
        .from('product_items')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          price: parseFloat(editPrice) || 0,
          discount_enabled: editDiscountEnabled,
          discount_price: editDiscountEnabled ? (parseFloat(editDiscountPrice) || null) : null,
          stock: parseInt(editStock, 10) || 0,
          currency: editCurrency,
          status: editStatus,
          category_id: categoryId,
          pricing_mode: editPricingMode,
          ville: editVille.trim() || null,
          pays: editPays.trim() || null,
          media: mergedMedia.length > 0 ? mergedMedia : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', detailProduct.id);

      if (updateError) throw updateError;

      setEditingDetail(false);
      setDetailProduct(null);
      setNewMediaFiles([]);
      setNewMediaPreviews([]);
      fetchProducts();
    } catch (err: unknown) {
      console.error('[handleSaveDetail] error:', err);
    } finally {
      setEditingDetailSaving(false);
      setUploadingNew(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      active: { label: 'Actif', className: 'bg-accent-100 text-accent-700' },
      draft: { label: 'Brouillon', className: 'bg-secondary-100 text-secondary-700' },
      inactive: { label: 'Inactif', className: 'bg-background-200/70 text-foreground-600' },
    };
    const c = config[status] || { label: status, className: 'bg-background-200/70 text-foreground-600' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>;
  };

  const getProductImage = (product: ProductItem) => {
    const mediaArr = getMediaArray(product.media);
    if (mediaArr.length > 0 && mediaArr[0].url) {
      return mediaArr[0].url;
    }
    return 'https://readdy.ai/api/search-image?query=Minimalist%20product%20placeholder%20on%20clean%20white%20background%20with%20subtle%20shadow%2C%20ecommerce%20product%20photography%20style%2C%20neutral%20tones&width=400&height=400&seq=prod-placeholder-01&orientation=squarish';
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Produits</h2>
          <p className="text-sm text-foreground-500 mt-1">Gérez votre catalogue de produits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-50 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-folder-line"></i>
            Catégories
          </button>
          <button
            onClick={() => navigate('/dashboard/products/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Nouveau produit
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-1.5 mb-6 pb-4 border-b border-background-200/70 overflow-x-auto">
        <button
          onClick={() => navigate('/dashboard/products')}
          className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-primary-50 text-primary-700"
        >
          <i className="ri-shopping-bag-3-line mr-1"></i>
          Catalogue
        </button>
        <button
          onClick={() => navigate('/dashboard/products/stock')}
          className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100"
        >
          <i className="ri-archive-line mr-1"></i>
          Gestion de stock
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'active', label: 'Actifs' },
            { value: 'draft', label: 'Brouillons' },
            { value: 'inactive', label: 'Inactifs' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>{cat.nom}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchProducts} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-shopping-bag-3-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun produit</h3>
          <p className="text-sm text-foreground-500 mb-4">Ajoutez votre premier produit pour commencer</p>
          <button
            onClick={() => navigate('/dashboard/products/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-primary-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouveau produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const mediaArr = getMediaArray(product.media);
            const coverUrl = mediaArr.length > 0 && mediaArr[0].url ? mediaArr[0].url : '';
            return (
              <div key={product.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors">
                {/* Image */}
                <div className="h-44 bg-background-100 overflow-hidden">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.insertAdjacentHTML('afterend', '<div class="w-full h-full flex items-center justify-center absolute inset-0"><div class="text-center"><i class="ri-image-line text-2xl text-foreground/30 mb-1 block"></i><span class="text-xs text-foreground/40">Image indisponible</span></div></div>');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-background-200/70 flex items-center justify-center">
                          <i className="ri-shopping-bag-3-line text-xl text-foreground-400"></i>
                        </div>
                        <span className="text-xs text-foreground-400">Aucune image</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground-900 leading-snug line-clamp-2">{product.name}</h3>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {product.discount_enabled && product.discount_price ? (
                        <>
                          <span className="text-sm font-bold text-primary-600 whitespace-nowrap">{product.discount_price.toLocaleString()} {product.currency || 'MAD'}</span>
                          <span className="text-xs text-foreground-400 line-through">{product.price.toLocaleString()} {product.currency || 'MAD'}</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-primary-600 whitespace-nowrap">{product.price?.toLocaleString() || '—'} {product.currency || 'MAD'}</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-foreground-500 mb-3 line-clamp-2">
                    {product.description || 'Aucune description'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium">
                      {product.product_categories?.name || 'Non catégorisé'}
                    </span>
                    {getStatusBadge(product.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      product.stock === 0 ? 'text-red-500' :
                      product.stock < 10 ? 'text-amber-500' :
                      'text-foreground-500'
                    }`}>
                      <i className="ri-archive-line mr-0.5"></i>
                      Stock : {product.stock ?? '—'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => initEditFromProduct(product)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Voir détails">
                        <i className="ri-eye-line text-sm"></i>
                      </button>
                      <button onClick={() => navigate(`/dashboard/products/${product.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer" title="Modifier">
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeletingProductId(product.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {products.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{products.length} produit{products.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Category Management Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => { setCategoryModalOpen(false); setDeleteConfirm(null); handleCancelEditCategory(); }}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-heading text-foreground-950">Gérer les catégories</h3>
              <button onClick={() => { setCategoryModalOpen(false); setDeleteConfirm(null); handleCancelEditCategory(); }} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-foreground-500"></i>
              </button>
            </div>

            {/* Create / Edit form */}
            {editingCategory ? (
              <div className="mb-5 pb-5 border-b border-background-200/70">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <i className="ri-edit-line"></i> Modification
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Nom de la catégorie..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                    className="flex-1 px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-accent-300 transition-colors"
                  />
                  <button
                    onClick={handleUpdateCategory}
                    disabled={categorySaving || !newCategoryName.trim()}
                    className="px-4 py-2 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {categorySaving ? <i className="ri-loader-4-line animate-spin"></i> : 'Enregistrer'}
                  </button>
                  <button
                    onClick={handleCancelEditCategory}
                    disabled={categorySaving}
                    className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                {/* Tab toggle - Image / Icône */}
                <div className="flex items-center gap-1 mb-3 bg-background-100 rounded-full p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setCategoryTab('image')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      categoryTab === 'image'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-image-line mr-1"></i>Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryTab('icon')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      categoryTab === 'icon'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-shapes-line mr-1"></i>Icône
                  </button>
                </div>

                {categoryTab === 'image' ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label
                      onClick={() => categoryFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-accent-300 hover:text-accent-600 cursor-pointer transition-colors"
                    >
                      <i className="ri-image-add-line"></i>
                      <span className="whitespace-nowrap">{categoryImagePreview || editingExistingImageUrl ? 'Changer' : 'Image couv.'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setImagePickerOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-accent-300 hover:text-accent-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-image-line"></i>
                      <span className="whitespace-nowrap">Biblioth&egrave;que</span>
                    </button>
                    <input
                      ref={categoryFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="absolute w-px h-px opacity-0 pointer-events-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCategoryImage(file);
                        setSelectedLibraryUrl(null);
                        setCategoryImagePreview(URL.createObjectURL(file));
                      }}
                    />
                    {(categoryImagePreview || selectedLibraryUrl) && (
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                        <img src={selectedLibraryUrl || categoryImagePreview || ''} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); setSelectedLibraryUrl(null); }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                        >
                          <i className="ri-close-line text-[8px]"></i>
                        </button>
                      </div>
                    )}
                    {editingExistingImageUrl && !categoryImagePreview && !selectedLibraryUrl && (
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                        <img src={editingExistingImageUrl} alt="Actuelle" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">Actuelle</span>
                      </div>
                    )}
                    {categoryImageUploading && (
                      <div className="w-28">
                        <div className="flex items-center gap-2 mb-0.5">
                          <i className="ri-loader-4-line animate-spin text-accent-500 text-sm"></i>
                          <span className="text-xs text-accent-600 font-semibold">Upload en cours...</span>
                        </div>
                        <div className="h-1.5 bg-background-200/70 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-accent-300 hover:text-accent-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-shapes-line"></i>
                      <span className="whitespace-nowrap">{selectedIcon ? 'Changer' : 'Choisir une icône'}</span>
                    </button>
                    {selectedIcon && (
                      <div className="relative w-10 h-10 rounded-md bg-background-100 flex items-center justify-center flex-shrink-0">
                        <i className={`${selectedIcon} text-lg text-accent-600`}></i>
                        <button
                          onClick={() => setSelectedIcon(null)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                        >
                          <i className="ri-close-line text-[8px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Nom de la catégorie..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    className="flex-1 px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                  />
                  <button
                    onClick={handleCreateCategory}
                    disabled={categorySaving || !newCategoryName.trim()}
                    className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {categorySaving ? <i className="ri-loader-4-line animate-spin"></i> : 'Ajouter'}
                  </button>
                </div>

                {/* Tab toggle - Image / Icône */}
                <div className="flex items-center gap-1 mb-3 bg-background-100 rounded-full p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setCategoryTab('image')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      categoryTab === 'image'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-image-line mr-1"></i>Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryTab('icon')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      categoryTab === 'icon'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-shapes-line mr-1"></i>Icône
                  </button>
                </div>

                {categoryTab === 'image' ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label
                      onClick={() => categoryFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 cursor-pointer transition-colors"
                    >
                      <i className="ri-image-add-line"></i>
                      <span className="whitespace-nowrap">{categoryImagePreview ? 'Changer' : 'Image couv.'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setImagePickerOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-image-line"></i>
                      <span className="whitespace-nowrap">Biblioth&egrave;que</span>
                    </button>
                    <input
                      ref={categoryFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="absolute w-px h-px opacity-0 pointer-events-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCategoryImage(file);
                        setSelectedLibraryUrl(null);
                        setCategoryImagePreview(URL.createObjectURL(file));
                      }}
                    />
                    {(categoryImagePreview || selectedLibraryUrl) && (
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                        <img src={selectedLibraryUrl || categoryImagePreview || ''} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); setSelectedLibraryUrl(null); }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                        >
                          <i className="ri-close-line text-[8px]"></i>
                        </button>
                      </div>
                    )}
                    {categoryImageUploading && (
                      <div className="w-28">
                        <div className="flex items-center gap-2 mb-0.5">
                          <i className="ri-loader-4-line animate-spin text-primary-500 text-sm"></i>
                          <span className="text-xs text-primary-600 font-semibold">Upload en cours...</span>
                        </div>
                        <div className="h-1.5 bg-background-200/70 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-shapes-line"></i>
                      <span className="whitespace-nowrap">{selectedIcon ? 'Changer' : 'Choisir une icône'}</span>
                    </button>
                    {selectedIcon && (
                      <div className="relative w-10 h-10 rounded-md bg-background-100 flex items-center justify-center flex-shrink-0">
                        <i className={`${selectedIcon} text-lg text-primary-600`}></i>
                        <button
                          onClick={() => setSelectedIcon(null)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors"
                        >
                          <i className="ri-close-line text-[8px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {categoryMsg && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs animate-fade-in-up ${categoryMsg.includes('succès') ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
                <span className="break-all">{categoryMsg}</span>
              </div>
            )}

            {/* Category list */}
            {categories.length === 0 ? (
              <p className="text-sm text-foreground-400 text-center py-4">Aucune catégorie créée</p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {cat.icon ? (
                        <div className="w-8 h-8 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                          <i className={`${cat.icon} text-sm text-accent-600`}></i>
                        </div>
                      ) : cat.image_couverture ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                          <img src={cat.image_couverture} alt={cat.nom} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-background-100 flex items-center justify-center flex-shrink-0">
                          <i className="ri-folder-line text-sm text-foreground-400"></i>
                        </div>
                      )}
                      <span className="text-sm text-foreground-800">{cat.nom}</span>
                    </div>
                    {editingCategory?.id === cat.id ? (
                      <span className="text-xs text-accent-600 font-medium px-2 py-0.5 bg-accent-50 rounded-full">En cours</span>
                    ) : deleteConfirm === cat.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium cursor-pointer hover:bg-red-600 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 bg-background-100 text-foreground-600 rounded text-xs cursor-pointer hover:bg-background-200/70 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleStartEditCategory(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cat.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deletingProductId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setDeletingProductId(null)}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer le produit ?</h3>
            <p className="text-sm text-foreground-500 mb-5">Cette action est irréversible.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeletingProductId(null)} className="px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDeleteProduct(deletingProductId)} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => { setDetailProduct(null); setEditingDetail(false); }}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <i className="ri-shopping-bag-3-line text-primary-600"></i>
                </div>
                {editingDetail ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-base font-bold font-heading text-foreground-950 bg-background-50 border border-background-200/70 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 min-w-[200px]"
                    placeholder="Nom du produit"
                  />
                ) : (
                  <h3 className="text-base font-bold font-heading text-foreground-950">{detailProduct.name}</h3>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!editingDetail ? (
                  <button
                    onClick={() => setEditingDetail(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-50 text-accent-600 hover:bg-accent-100 transition-colors cursor-pointer"
                    title="Éditer"
                  >
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                ) : null}
                <button
                  onClick={() => { setDetailProduct(null); setEditingDetail(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
              {/* Images gallery */}
              <div className="space-y-2 sm:space-y-3">
                {(() => {
                  const existingImages = editMedia.map((m) => m.url).filter(Boolean);
                  const allPreviews = [...existingImages, ...newMediaPreviews];
                  if (allPreviews.length === 0 && !editingDetail) {
                    return (
                      <div className="w-full h-40 sm:h-44 rounded-lg bg-background-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-background-200/70 flex items-center justify-center">
                            <i className="ri-image-line text-xl text-foreground-400"></i>
                          </div>
                          <span className="text-xs text-foreground-400">Aucune image</span>
                        </div>
                      </div>
                    );
                  }
                  if (allPreviews.length === 0 && editingDetail) {
                    return (
                      <div className="w-full h-40 sm:h-44 rounded-lg bg-background-100 border-2 border-dashed border-background-300/60 flex items-center justify-center">
                        <div className="text-center">
                          <i className="ri-image-add-line text-3xl text-foreground-300 mb-2 block"></i>
                          <span className="text-xs text-foreground-400">Ajoutez des images ci-dessous</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <>
                      {/* Cover image */}
                      <div
                        className="relative w-full h-40 sm:h-52 rounded-lg overflow-hidden bg-background-100 group"
                      >
                        <img
                          src={allPreviews[0]}
                          alt={detailProduct.name}
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setFullscreenData({ images: allPreviews, index: 0 })}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <i className="ri-zoom-in-line text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity drop-shadow-lg"></i>
                        </div>
                        {editingDetail && (
                          <button
                            onClick={() => {
                              const idx = existingImages.indexOf(allPreviews[0]);
                              if (idx >= 0) {
                                const newMedia = editMedia.filter((_, i) => i !== idx);
                                setEditMedia(newMedia);
                              } else {
                                const previewIdx = newMediaPreviews.indexOf(allPreviews[0]);
                                if (previewIdx >= 0) {
                                  setNewMediaPreviews((p) => p.filter((_, i) => i !== previewIdx));
                                  setNewMediaFiles((f) => f.filter((_, i) => i !== previewIdx));
                                }
                              }
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                            title="Supprimer cette image"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        )}
                      </div>
                      {/* Gallery of all images */}
                      {allPreviews.length > 1 && (
                        <div>
                          <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">
                            <i className="ri-image-line mr-1"></i>Galerie ({allPreviews.length} images)
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {allPreviews.map((imgUrl, idx) => (
                              <div
                                key={imgUrl}
                                className="relative aspect-square rounded-lg overflow-hidden bg-background-100 border border-background-200/70 group"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`${detailProduct.name} - Image ${idx + 1}`}
                                  className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                  onClick={() => setFullscreenData({ images: allPreviews, index: idx })}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                {idx === 0 && (
                                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-500 text-background-50 rounded text-[10px] font-medium z-10 pointer-events-none">Cover</span>
                                )}
                                {editingDetail && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const existingIdx = existingImages.indexOf(imgUrl);
                                      if (existingIdx >= 0) {
                                        const newMediaArr = editMedia.filter((_, i) => i !== existingIdx);
                                        setEditMedia(newMediaArr);
                                      } else {
                                        const previewIdx = newMediaPreviews.indexOf(imgUrl);
                                        if (previewIdx >= 0) {
                                          setNewMediaPreviews((p) => p.filter((_, i) => i !== previewIdx));
                                          setNewMediaFiles((f) => f.filter((_, i) => i !== previewIdx));
                                        }
                                      }
                                    }}
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
                                    title="Supprimer"
                                  >
                                    <i className="ri-close-line text-[8px]"></i>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* Add image button - only in edit mode */}
                {editingDetail && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      onClick={() => detailFileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-background-50 border border-dashed border-accent-300/60 rounded-lg text-xs text-accent-600 hover:bg-accent-50 cursor-pointer transition-colors"
                    >
                      <i className="ri-image-add-line"></i>
                      <span className="whitespace-nowrap">Ajouter des images</span>
                    </label>
                    <input
                      ref={detailFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const previews = files.map((f) => URL.createObjectURL(f));
                        setNewMediaFiles((prev) => [...prev, ...files]);
                        setNewMediaPreviews((prev) => [...prev, ...previews]);
                        if (detailFileRef.current) detailFileRef.current.value = '';
                      }}
                    />
                    {uploadingNew && (
                      <span className="text-xs text-accent-600 flex items-center gap-1">
                        <i className="ri-loader-4-line animate-spin"></i> Upload...
                      </span>
                    )}
                    {(editMedia.length > 0 || newMediaPreviews.length > 0) && (
                      <span className="text-xs text-foreground-400">
                        {editMedia.length + newMediaPreviews.length} image{(editMedia.length + newMediaPreviews.length) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Price */}
              <div>
                {editingDetail ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-sm font-bold text-primary-600 focus:outline-none focus:border-primary-300"
                        placeholder="Prix"
                      />
                      <select
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value)}
                        className="px-2 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
                      >
                        <option value="MAD">MAD</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editDiscountEnabled}
                          onChange={(e) => setEditDiscountEnabled(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-background-300/60 text-accent-500 focus:ring-accent-400 cursor-pointer"
                        />
                        <span className="text-xs text-foreground-600">Promo</span>
                      </label>
                    </div>
                    {editDiscountEnabled && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground-400">Prix promo :</span>
                        <input
                          value={editDiscountPrice}
                          onChange={(e) => setEditDiscountPrice(e.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 px-2 py-1 bg-background-50 border border-accent-200/70 rounded-lg text-sm font-semibold text-accent-600 focus:outline-none focus:border-accent-400"
                          placeholder="Prix réduit"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-bold font-heading text-foreground-950">{detailProduct.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      {detailProduct.discount_enabled && detailProduct.discount_price ? (
                        <>
                          <span className="text-xl font-bold text-primary-600">
                            {detailProduct.discount_price.toLocaleString()} {detailProduct.currency || 'MAD'}
                          </span>
                          <span className="text-sm text-foreground-400 line-through">
                            {detailProduct.price?.toLocaleString()} {detailProduct.currency || 'MAD'}
                          </span>
                          <span className="px-2 py-0.5 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold">
                            Promo
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-primary-600">
                          {detailProduct.price?.toLocaleString() || '—'} {detailProduct.currency || 'MAD'}
                        </span>
                      )}
                      <span className="ml-1">{getStatusBadge(detailProduct.status)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Category & Status & Pricing - editable */}
              {editingDetail ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
                  >
                    <option value="">Non catégorisé</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.nom}</option>
                    ))}
                  </select>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
                  >
                    <option value="active">Actif</option>
                    <option value="draft">Brouillon</option>
                    <option value="inactive">Inactif</option>
                  </select>
                  <select
                    value={String(editPricingMode)}
                    onChange={(e) => setEditPricingMode(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
                  >
                    <option value="0">Prix uniforme</option>
                    <option value="1">Prix par variante</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-secondary-50 text-secondary-700 rounded-full text-xs font-semibold">
                    <i className="ri-folder-line mr-1"></i>
                    {detailProduct.product_categories?.name || 'Non catégorisé'}
                  </span>
                  <span className="px-3 py-1 bg-background-100 text-foreground-700 rounded-full text-xs font-medium">
                    <i className="ri-price-tag-3-line mr-1"></i>
                    Mode prix : {detailProduct.pricing_mode === 1 ? 'Par variante' : 'Uniforme'}
                  </span>
                </div>
              )}

              {/* Description */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none transition-colors"
                    placeholder="Description du produit..."
                  />
                </div>
              ) : (
                detailProduct.description && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Description</h5>
                    <p className="text-sm text-foreground-700 leading-relaxed">{detailProduct.description}</p>
                  </div>
                )
              )}

              {/* Info Grid */}
              {editingDetail ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Stock</span>
                    <input
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      type="number"
                      min="0"
                      className="w-full px-2 py-1.5 bg-transparent border border-background-200/70 rounded-md text-sm font-semibold text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Ville</span>
                    <input
                      value={editVille}
                      onChange={(e) => setEditVille(e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent border border-background-200/70 rounded-md text-sm font-medium text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                      placeholder="Ville"
                    />
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Pays</span>
                    <input
                      value={editPays}
                      onChange={(e) => setEditPays(e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent border border-background-200/70 rounded-md text-sm font-medium text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                      placeholder="Pays"
                    />
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Devise</span>
                    <span className="text-sm font-medium text-foreground-800">{editCurrency}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">ID Produit</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">#{detailProduct.id}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3 col-span-1 sm:col-span-2">
                    <span className="block text-xs text-foreground-400 mb-1">Dates</span>
                    <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-foreground-600">
                      <span><i className="ri-calendar-line mr-1"></i>Créé : {new Date(detailProduct.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span><i className="ri-time-line mr-1"></i>MAJ : {new Date(detailProduct.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Stock</span>
                    <span className={`text-sm font-semibold ${
                      detailProduct.stock === 0 ? 'text-red-500' :
                      detailProduct.stock < 10 ? 'text-amber-500' :
                      'text-foreground-800'
                    }`}>
                      <i className="ri-archive-line mr-1 text-foreground-400"></i>
                      {detailProduct.stock ?? '—'} unités
                    </span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Devise</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-money-dollar-circle-line mr-1 text-foreground-400"></i>
                      {detailProduct.currency || 'MAD'}
                    </span>
                  </div>
                  {(detailProduct.ville || detailProduct.pays) && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">Localisation</span>
                      <span className="text-sm font-medium text-foreground-800">
                        <i className="ri-map-pin-line mr-1 text-foreground-400"></i>
                        {[detailProduct.ville, detailProduct.pays].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">ID Produit</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">#{detailProduct.id}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailProduct.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Mis à jour le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-time-line mr-1 text-foreground-400"></i>
                      {new Date(detailProduct.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-t border-background-200/70 flex-shrink-0 bg-background-50">
              {editingDetail ? (
                <>
                  <button
                    onClick={() => setEditingDetail(false)}
                    disabled={editingDetailSaving}
                    className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveDetail}
                    disabled={editingDetailSaving || !editName.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {editingDetailSaving ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-sm"></i>
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line text-sm"></i>
                        Enregistrer
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setDetailProduct(null); setEditingDetail(false); }}
                    className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDetail(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent-50 text-accent-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-edit-line text-sm"></i>
                      Éditer
                    </button>
                    <button
                      onClick={() => {
                        setDetailProduct(null);
                        navigate(`/dashboard/products/${detailProduct.id}/edit`);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer"
                    >
                      <i className="ri-external-link-line text-sm"></i>
                      Page édition
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer with navigation */}
      {fullscreenData && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 animate-fade-in"
          onClick={() => setFullscreenData(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFullscreenData(null);
            if (e.key === 'ArrowLeft' && fullscreenData.index > 0) {
              e.stopPropagation();
              setFullscreenData({ images: fullscreenData.images, index: fullscreenData.index - 1 });
            }
            if (e.key === 'ArrowRight' && fullscreenData.index < fullscreenData.images.length - 1) {
              e.stopPropagation();
              setFullscreenData({ images: fullscreenData.images, index: fullscreenData.index + 1 });
            }
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {/* Close button */}
          <button
            onClick={() => setFullscreenData(null)}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer z-10"
          >
            <i className="ri-close-line text-lg md:text-xl"></i>
          </button>

          {/* Previous button */}
          {fullscreenData.index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenData({ images: fullscreenData.images, index: fullscreenData.index - 1 });
              }}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/35 transition-colors cursor-pointer z-10"
            >
              <i className="ri-arrow-left-s-line text-xl md:text-2xl"></i>
            </button>
          )}

          {/* Next button */}
          {fullscreenData.index < fullscreenData.images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenData({ images: fullscreenData.images, index: fullscreenData.index + 1 });
              }}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/35 transition-colors cursor-pointer z-10"
            >
              <i className="ri-arrow-right-s-line text-xl md:text-2xl"></i>
            </button>
          )}

          {/* Image counter */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium z-10 whitespace-nowrap">
            {fullscreenData.index + 1} / {fullscreenData.images.length}
          </div>

          {/* Thumbnail strip */}
          {fullscreenData.images.length > 1 && (
            <div className="absolute bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 max-w-[85vw] overflow-x-auto px-2 py-1">
              {fullscreenData.images.map((img, idx) => (
                <button
                  key={img}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenData({ images: fullscreenData.images, index: idx });
                  }}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                    idx === fullscreenData.index
                      ? 'border-white opacity-100 scale-110'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Miniature ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          <img
            src={fullscreenData.images[fullscreenData.index]}
            alt={`Vue agrandie ${fullscreenData.index + 1}`}
            className="max-w-[90vw] max-h-[75vh] md:max-h-[85vh] object-contain rounded-lg select-none"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Icon Picker Modal */}
      <IconPicker
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconClass) => setSelectedIcon(iconClass)}
        selectedIcon={selectedIcon}
      />

      {/* Image Picker Modal */}
      <ImagePicker
        isOpen={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onSelect={(url) => {
          setSelectedLibraryUrl(url);
          setCategoryImagePreview(url);
          setCategoryImage(null);
        }}
        selectedUrl={selectedLibraryUrl}
      />
    </div>
  );
}