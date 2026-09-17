import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';
import { uploadMediaFile } from '@/hooks/useUpload';

interface ServiceItem {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  prix_promo: number | null;
  categorie_id: number;
  tags: string | null;
  owner: number;
  pays: string | null;
  ville: string | null;
  slug: string;
  created_at: string;
  typeservice: string | null;
  typecompte: string | null;
  sp: string | null;
  programme: string | null;
}

interface ServiceCategory {
  id: number;
  nom: string;
  description: string | null;
  type: string | null;
  image_couverture?: string;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [detailService, setDetailService] = useState<ServiceItem | null>(null);
  const [fullscreenData, setFullscreenData] = useState<{ images: string[]; index: number } | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editingDetailSaving, setEditingDetailSaving] = useState(false);
  const [editTitre, setEditTitre] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDetailssup, setEditDetailssup] = useState('');
  const [editPrix, setEditPrix] = useState('');
  const [editPrixPromo, setEditPrixPromo] = useState('');
  const [editCategorieId, setEditCategorieId] = useState<string>('');
  const [editTags, setEditTags] = useState('');
  const [editVille, setEditVille] = useState('');
  const [editPays, setEditPays] = useState('');
  const [editTypeservice, setEditTypeservice] = useState('');
  const [editTypecompte, setEditTypecompte] = useState('');
  const [editSp, setEditSp] = useState('');
  const [editProgramme, setEditProgramme] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  const [uploadingNew, setUploadingNew] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map());
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] = useState<number | null>(null);
  const [idcommerce, setIdcommerce] = useState<number | null>(null);
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const [categoryImageUploading, setCategoryImageUploading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingExistingImageUrl, setEditingExistingImageUrl] = useState<string | null>(null);
  const categoryFileRef = useRef<HTMLInputElement>(null);

  // Fetch user's idcommerce
  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('idcommerce')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIdcommerce(data.idcommerce);
      });
  }, [user]);

  const fetchCategories = useCallback(async () => {
    if (!idcommerce) return;
    setCategoriesLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('categorieservices')
        .select('id, nom, description, type, image_couverture')
        .eq('idcommerce', idcommerce)
        .order('nom');
      if (fetchErr) throw fetchErr;
      setCategories(data || []);
      const map = new Map<number, string>();
      (data || []).forEach((cat: ServiceCategory) => map.set(cat.id, cat.nom));
      setCategoryMap(map);
    } catch {
      // silent
    } finally {
      setCategoriesLoading(false);
    }
  }, [idcommerce]);

  useEffect(() => {
    if (showCategoryModal && idcommerce) fetchCategories();
  }, [showCategoryModal, idcommerce, fetchCategories]);

  // Fetch categories for lookup on mount
  useEffect(() => {
    if (idcommerce) fetchCategories();
  }, [idcommerce, fetchCategories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    setCategorySaving(true);
    setCategoryMsg(null);
    try {
      let imageUrl: string | null = null;
      if (categoryImage) {
        setCategoryImageUploading(true);
        imageUrl = await uploadMediaFile(categoryImage, 'categories-services');
        setCategoryImageUploading(false);
      }

      const { error: insertErr } = await supabase.from('categorieservices').insert({
        nom: newCategoryName.trim(),
        type: newCategoryType.trim() || null,
        idcommerce: idcommerce,
        ville: user.Ville || null,
        pays: user.Pays || null,
        afficher: 1,
        image_couverture: imageUrl,
      });
      if (insertErr) throw insertErr;
      setNewCategoryName('');
      setNewCategoryType('');
      setCategoryImage(null);
      setCategoryImagePreview(null);
      setEditingCategory(null);
      setEditingExistingImageUrl(null);
      setCategoryMsg({ type: 'success', text: 'Catégorie créée avec succès !' });
      fetchCategories();
    } catch (err: unknown) {
      setCategoryMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la création' });
    } finally {
      setCategorySaving(false);
      setCategoryImageUploading(false);
      setTimeout(() => setCategoryMsg(null), 3000);
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    try {
      const { error: delErr } = await supabase.from('categorieservices').delete().eq('id', catId);
      if (delErr) throw delErr;
      setCategoryDeleteConfirm(null);
      fetchCategories();
    } catch {
      // silent
    }
  };

  const handleStartEditCategory = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.nom);
    setNewCategoryType(cat.type || '');
    setEditingExistingImageUrl(cat.image_couverture || null);
    setCategoryImagePreview(cat.image_couverture || null);
    setCategoryImage(null);
    setCategoryMsg(null);
    setCategoryDeleteConfirm(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryType('');
    setCategoryImage(null);
    setCategoryImagePreview(null);
    setEditingExistingImageUrl(null);
    setCategoryMsg(null);
    setCategoryDeleteConfirm(null);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim() || !user) return;
    setCategorySaving(true);
    setCategoryMsg(null);
    try {
      let imageUrl: string | null = editingExistingImageUrl;
      if (categoryImage) {
        setCategoryImageUploading(true);
        imageUrl = await uploadMediaFile(categoryImage, 'categories-services');
        setCategoryImageUploading(false);
      } else if (categoryImagePreview === null && editingExistingImageUrl) {
        imageUrl = null;
      }

      const { error: updateErr } = await supabase.from('categorieservices').update({
        nom: newCategoryName.trim(),
        type: newCategoryType.trim() || null,
        image_couverture: imageUrl,
      }).eq('id', editingCategory.id);
      if (updateErr) throw updateErr;

      handleCancelEditCategory();
      setCategoryMsg({ type: 'success', text: 'Catégorie mise à jour avec succès !' });
      fetchCategories();
    } catch (err: unknown) {
      setCategoryMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' });
    } finally {
      setCategorySaving(false);
      setCategoryImageUploading(false);
      setTimeout(() => setCategoryMsg(null), 3000);
    }
  };

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('nospartenairesservices')
        .select('*')
        .eq('idcommerce', getCommerceId(user))
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('titre', `%${search}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setServices(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  }, [search, user]);

  useEffect(() => {
    if (user) fetchServices();
  }, [fetchServices, user]);

  const handleDelete = async (serviceId: number) => {
    try {
      const { error: delError } = await supabase
        .from('nospartenairesservices')
        .delete()
        .eq('id', serviceId);
      if (delError) throw delError;
      setDeleteConfirm(null);
      fetchServices();
    } catch {
      // silent
    }
  };

  const initEditFromService = (service: ServiceItem) => {
    setDetailService(service);
    setEditingDetail(false);
    setEditTitre(service.titre || '');
    setEditDescription(service.description || '');
    setEditDetailssup(service.detailssup || '');
    setEditPrix(String(service.prix ?? ''));
    setEditPrixPromo(String(service.prix_promo ?? ''));
    setEditCategorieId(String(service.categorie_id ?? ''));
    setEditTags(service.tags || '');
    setEditVille(service.ville || '');
    setEditPays(service.pays || '');
    setEditTypeservice(service.typeservice || '');
    setEditTypecompte(service.typecompte || '');
    setEditSp(service.sp || '');
    setEditProgramme(service.programme || '');
    setEditImages(getServiceImages(service.product_image));
    setNewMediaFiles([]);
    setNewMediaPreviews([]);
  };

  const handleSaveService = async () => {
    if (!detailService || !user) return;
    setEditingDetailSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (newMediaFiles.length > 0) {
        setUploadingNew(true);
        const results = await Promise.all(
          newMediaFiles.map((f) => uploadMediaFile(f, 'services').catch((err) => {
            console.error('[handleSaveService] upload failed for', f.name, err);
            return null;
          }))
        );
        uploadedUrls = results.filter((r): r is string => r !== null);
        setUploadingNew(false);
      }

      const mergedImages = [...editImages.filter((u) => u), ...uploadedUrls];
      const productImage = mergedImages.join('|');
      const categorieId = editCategorieId ? parseInt(editCategorieId, 10) : 0;

      const { error: updateError } = await supabase
        .from('nospartenairesservices')
        .update({
          titre: editTitre.trim(),
          description: editDescription.trim(),
          detailssup: editDetailssup.trim() || null,
          prix: parseFloat(editPrix) || 0,
          prix_promo: editPrixPromo ? parseFloat(editPrixPromo) : null,
          categorie_id: categorieId,
          tags: editTags.trim() || null,
          ville: editVille.trim() || null,
          pays: editPays.trim() || null,
          typeservice: editTypeservice.trim() || null,
          typecompte: editTypecompte.trim() || null,
          sp: editSp.trim() || null,
          programme: editProgramme.trim() || null,
          product_image: productImage || '',
        })
        .eq('id', detailService.id);

      if (updateError) throw updateError;

      setEditingDetail(false);
      setDetailService(null);
      setNewMediaFiles([]);
      setNewMediaPreviews([]);
      fetchServices();
      fetchCategories();
    } catch (err: unknown) {
      console.error('[handleSaveService] error:', err);
    } finally {
      setEditingDetailSaving(false);
      setUploadingNew(false);
    }
  };

  // Parse product_image (pipe-separated) into image URLs only
  const getServiceImages = (productImage: string): string[] => {
    if (!productImage) return [];
    return productImage.split('|').filter(Boolean).filter((url) => {
      const lower = url.toLowerCase();
      return !(lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov'));
    });
  };

  const getCoverImage = (productImage: string): string => {
    return getServiceImages(productImage)[0] || '';
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Services</h2>
          <p className="text-sm text-foreground-500 mt-1">Gérez vos offres de services</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary-50 text-secondary-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-secondary-100 transition-colors cursor-pointer"
          >
            <i className="ri-price-tag-3-line"></i>
            Catégories
          </button>
          <button
            onClick={() => navigate('/dashboard/services/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Nouveau service
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-1.5 mb-6 pb-4 border-b border-background-200/70 overflow-x-auto">
        <button
          onClick={() => navigate('/dashboard/services')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-primary-50 text-primary-700`}
        >
          <i className="ri-service-line mr-1"></i>
          Mes services
        </button>
        <button
          onClick={() => navigate('/dashboard/services/portfolio')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100`}
        >
          <i className="ri-briefcase-line mr-1"></i>
          Portfolio
        </button>
        <button
          onClick={() => navigate('/dashboard/services/partenaires')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100`}
        >
          <i className="ri-team-line mr-1"></i>
          Mes partenaires
        </button>
        <button
          onClick={() => navigate('/dashboard/services/equipe')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100`}
        >
          <i className="ri-user-star-line mr-1"></i>
          Notre équipe
        </button>
        <button
          onClick={() => navigate('/dashboard/services/users')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100`}
        >
          <i className="ri-user-settings-line mr-1"></i>
          Gestion utilisateurs
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher un service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
        />
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
          <button onClick={fetchServices} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-service-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun service</h3>
          <p className="text-sm text-foreground-500 mb-4">Créez votre premier service pour commencer</p>
          <button
            onClick={() => navigate('/dashboard/services/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Nouveau service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-all duration-200 hover:shadow-sm">
              <div className="h-44 bg-background-100 overflow-hidden">
                {(() => {
                  const coverUrl = getCoverImage(service.product_image);
                  if (!coverUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-background-200/70 flex items-center justify-center">
                            <i className="ri-service-line text-xl text-foreground-400"></i>
                          </div>
                          <span className="text-xs text-foreground-400">Aucune image</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <img
                      src={coverUrl}
                      alt={service.titre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.insertAdjacentHTML('afterend', '<div class="w-full h-full flex items-center justify-center absolute inset-0"><div class="text-center"><i class="ri-image-line text-2xl text-foreground-300 mb-1 block"></i><span class="text-xs text-foreground-400">Image indisponible</span></div></div>');
                      }}
                    />
                  );
                })()}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground-900 leading-snug line-clamp-2">{service.titre}</h3>
                  <div className="flex flex-col items-end flex-shrink-0">
                    {service.prix_promo ? (
                      <>
                        <span className="text-sm font-bold text-primary-600 whitespace-nowrap">{service.prix_promo.toLocaleString()} MAD</span>
                        <span className="text-xs text-foreground-400 line-through">{service.prix?.toLocaleString()} MAD</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-primary-600 whitespace-nowrap">{service.prix?.toLocaleString()} MAD</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{service.description}</p>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {service.categorie_id > 0 && categoryMap.has(service.categorie_id) && (
                    <span className="px-2 py-0.5 bg-accent-50 text-accent-700 rounded-full text-xs font-medium">
                      {categoryMap.get(service.categorie_id)}
                    </span>
                  )}
                  {service.tags && service.tags.split(',').map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-400">
                    {service.ville && service.pays ? `${service.ville}, ${service.pays}` : service.ville || service.pays || ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => initEditFromService(service)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Voir détails">
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                    <button onClick={() => navigate(`/dashboard/services/${service.id}/edit`)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer" title="Modifier">
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(service.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {services.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{services.length} service{services.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer le service ?</h3>
            <p className="text-sm text-foreground-500 mb-5">Cette action est irréversible.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Detail Modal */}
      {detailService && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => { setDetailService(null); setEditingDetail(false); }}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <i className="ri-service-line text-primary-600"></i>
                </div>
                {editingDetail ? (
                  <input
                    value={editTitre}
                    onChange={(e) => setEditTitre(e.target.value)}
                    className="text-base font-bold font-heading text-foreground-950 bg-background-50 border border-background-200/70 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 min-w-[200px]"
                    placeholder="Titre du service"
                  />
                ) : (
                  <h3 className="text-base font-bold font-heading text-foreground-950">{detailService.titre}</h3>
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
                  onClick={() => { setDetailService(null); setEditingDetail(false); }}
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
                  const allPreviews = [...editImages.filter(Boolean), ...newMediaPreviews];
                  if (allPreviews.length === 0 && !editingDetail) {
                    return (
                      <div className="w-full h-40 rounded-lg bg-background-100 flex items-center justify-center">
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
                      <div className="w-full h-40 rounded-lg bg-background-100 border-2 border-dashed border-background-300/60 flex items-center justify-center">
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
                      <div className="relative w-full h-40 sm:h-52 rounded-lg overflow-hidden bg-background-100 group">
                        <img
                          src={allPreviews[0]}
                          alt={detailService.titre}
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
                              const idx = editImages.indexOf(allPreviews[0]);
                              if (idx >= 0) {
                                setEditImages((prev) => prev.filter((_, i) => i !== idx));
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
                                  alt={`${detailService.titre} - Image ${idx + 1}`}
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
                                      const existingIdx = editImages.indexOf(imgUrl);
                                      if (existingIdx >= 0) {
                                        setEditImages((prev) => prev.filter((_, i) => i !== existingIdx));
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
                    {(editImages.length > 0 || newMediaPreviews.length > 0) && (
                      <span className="text-xs text-foreground-400">
                        {editImages.length + newMediaPreviews.length} image{(editImages.length + newMediaPreviews.length) > 1 ? 's' : ''}
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
                        value={editPrix}
                        onChange={(e) => setEditPrix(e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-sm font-bold text-primary-600 focus:outline-none focus:border-primary-300"
                        placeholder="Prix"
                      />
                      <span className="text-xs font-semibold text-foreground-500">MAD</span>
                      <span className="text-xs text-foreground-400 mx-1">|</span>
                      <span className="text-xs text-foreground-500">Promo :</span>
                      <input
                        value={editPrixPromo}
                        onChange={(e) => setEditPrixPromo(e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28 px-3 py-1.5 bg-background-50 border border-accent-200/70 rounded-lg text-sm font-semibold text-accent-600 focus:outline-none focus:border-accent-400"
                        placeholder="Prix promo"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-bold font-heading text-foreground-950">{detailService.titre}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      {detailService.prix_promo ? (
                        <>
                          <span className="text-xl font-bold text-primary-600">{detailService.prix_promo.toLocaleString()} MAD</span>
                          <span className="text-sm text-foreground-400 line-through">{detailService.prix?.toLocaleString()} MAD</span>
                          <span className="px-2 py-0.5 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold">
                            Promo
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-primary-600">{detailService.prix?.toLocaleString()} MAD</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Badges row - editable */}
              {editingDetail ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={editCategorieId}
                    onChange={(e) => setEditCategorieId(e.target.value)}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 cursor-pointer"
                  >
                    <option value="">Non catégorisé</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.nom}</option>
                    ))}
                  </select>
                  <input
                    value={editTypeservice}
                    onChange={(e) => setEditTypeservice(e.target.value)}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 w-28"
                    placeholder="Type"
                  />
                  <input
                    value={editProgramme}
                    onChange={(e) => setEditProgramme(e.target.value)}
                    className="px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-full text-xs font-medium text-foreground-700 focus:outline-none focus:border-primary-300 w-28"
                    placeholder="Programme"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {detailService.categorie_id > 0 && categoryMap.has(detailService.categorie_id) && (
                    <span className="px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold">
                      <i className="ri-price-tag-3-line mr-1"></i>
                      {categoryMap.get(detailService.categorie_id)}
                    </span>
                  )}
                  {detailService.typeservice && (
                    <span className="px-3 py-1 bg-secondary-50 text-secondary-700 rounded-full text-xs font-semibold">
                      <i className="ri-bar-chart-2-line mr-1"></i>
                      {detailService.typeservice}
                    </span>
                  )}
                  {detailService.programme && (
                    <span className="px-3 py-1 bg-background-100 text-foreground-700 rounded-full text-xs font-medium">
                      <i className="ri-calendar-line mr-1"></i>
                      {detailService.programme}
                    </span>
                  )}
                </div>
              )}

              {/* Tags */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Tags (séparés par des virgules)</label>
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                    placeholder="design, web, marketing"
                  />
                </div>
              ) : (
                detailService.tags && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground-400 flex-shrink-0">
                      <i className="ri-hashtag mr-0.5"></i>Tags :
                    </span>
                    {detailService.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )
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
                    placeholder="Description du service..."
                  />
                </div>
              ) : (
                <div>
                  <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Description</h5>
                  <p className="text-sm text-foreground-700 leading-relaxed">{detailService.description}</p>
                </div>
              )}

              {/* Détails supplémentaires */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Détails supplémentaires</label>
                  <textarea
                    value={editDetailssup}
                    onChange={(e) => setEditDetailssup(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none transition-colors"
                    placeholder="Détails supplémentaires..."
                  />
                </div>
              ) : (
                detailService.detailssup && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Détails supplémentaires</h5>
                    <div className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap bg-background-50 border border-background-200/70 rounded-lg p-4">
                      {detailService.detailssup}
                    </div>
                  </div>
                )
              )}

              {/* Info Grid */}
              {editingDetail ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <span className="block text-xs text-foreground-400 mb-1">Type de compte</span>
                    <input
                      value={editTypecompte}
                      onChange={(e) => setEditTypecompte(e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent border border-background-200/70 rounded-md text-sm font-medium text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                      placeholder="Type de compte"
                    />
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">SP</span>
                    <input
                      value={editSp}
                      onChange={(e) => setEditSp(e.target.value)}
                      className="w-full px-2 py-1.5 bg-transparent border border-background-200/70 rounded-md text-sm font-medium text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                      placeholder="SP"
                    />
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Slug</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailService.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailService.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(detailService.ville || detailService.pays) && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">Localisation</span>
                      <span className="text-sm font-medium text-foreground-800">
                        <i className="ri-map-pin-line mr-1 text-foreground-400"></i>
                        {[detailService.ville, detailService.pays].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {detailService.typecompte && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">Type de compte</span>
                      <span className="text-sm font-medium text-foreground-800">{detailService.typecompte}</span>
                    </div>
                  )}
                  {detailService.sp && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">SP</span>
                      <span className="text-sm font-medium text-foreground-800">{detailService.sp}</span>
                    </div>
                  )}
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Slug</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailService.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailService.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                    onClick={handleSaveService}
                    disabled={editingDetailSaving || !editTitre.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                    onClick={() => { setDetailService(null); setEditingDetail(false); }}
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
                        setDetailService(null);
                        navigate(`/dashboard/services/${detailService.id}/edit`);
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

          {/* Thumbnail strip - bottom */}
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => { setShowCategoryModal(false); setCategoryMsg(null); setCategoryDeleteConfirm(null); handleCancelEditCategory(); }}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-heading text-foreground-950">Gérer les catégories</h3>
              <button onClick={() => { setShowCategoryModal(false); setCategoryMsg(null); setCategoryDeleteConfirm(null); handleCancelEditCategory(); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 transition-colors cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {categoryMsg && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ${categoryMsg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
                {categoryMsg.text}
              </div>
            )}

            {/* Create / Edit form */}
            {editingCategory ? (
              <div className="mb-5 pb-5 border-b border-background-200/70">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <i className="ri-edit-line"></i> Modification
                  </span>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-foreground-700 mb-1">Nom de la catégorie</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Développement"
                      className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-accent-300 transition-colors"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(); }}
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-semibold text-foreground-700 mb-1">Type (optionnel)</label>
                    <input
                      type="text"
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value)}
                      placeholder="Ex: Conseil"
                      className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-accent-300 transition-colors"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(); }}
                    />
                  </div>
                  <button
                    onClick={handleUpdateCategory}
                    disabled={categorySaving || !newCategoryName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-background-50 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {categorySaving ? (
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                    ) : (
                      <i className="ri-save-line text-sm"></i>
                    )}
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancelEditCategory}
                    disabled={categorySaving}
                    className="flex items-center gap-2 px-4 py-2 bg-background-100 text-foreground-600 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-background-200/70 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label
                    onClick={() => categoryFileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-accent-300 hover:text-accent-600 cursor-pointer transition-colors"
                  >
                    <i className="ri-image-add-line"></i>
                    <span className="whitespace-nowrap">{categoryImagePreview ? 'Changer' : 'Image de couverture'}</span>
                  </label>
                  <input
                    ref={categoryFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="absolute w-px h-px opacity-0 pointer-events-none"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCategoryImage(file);
                      setCategoryImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  {categoryImagePreview && (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                      <img src={categoryImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); }}
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
              </div>
            ) : (
              <div className="mb-5 pb-5 border-b border-background-200/70">
                <div className="flex items-end gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-foreground-700 mb-1">Nom de la catégorie</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Développement"
                      className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-semibold text-foreground-700 mb-1">Type (optionnel)</label>
                    <input
                      type="text"
                      value={newCategoryType}
                      onChange={(e) => setNewCategoryType(e.target.value)}
                      placeholder="Ex: Conseil"
                      className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                    />
                  </div>
                  <button
                    onClick={handleCreateCategory}
                    disabled={categorySaving || !newCategoryName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-background-50 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {categorySaving ? (
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                    ) : (
                      <i className="ri-add-line text-sm"></i>
                    )}
                    Ajouter
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label
                    onClick={() => categoryFileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-background-50 border border-dashed border-background-300/60 rounded-lg text-sm text-foreground-500 hover:border-primary-300 hover:text-primary-600 cursor-pointer transition-colors"
                  >
                    <i className="ri-image-add-line"></i>
                    <span className="whitespace-nowrap">{categoryImagePreview ? 'Changer' : 'Image de couverture'}</span>
                  </label>
                  <input
                    ref={categoryFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="absolute w-px h-px opacity-0 pointer-events-none"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCategoryImage(file);
                      setCategoryImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  {categoryImagePreview && (
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                      <img src={categoryImagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); }}
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
              </div>
            )}

            {/* Categories list */}
            <div className="flex-1 overflow-y-auto">
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <i className="ri-loader-4-line animate-spin text-xl text-primary-500"></i>
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
                    <i className="ri-price-tag-3-line text-xl text-foreground-400"></i>
                  </div>
                  <p className="text-sm text-foreground-500">Aucune catégorie pour le moment</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background-100/70 transition-all duration-200 group">
                      <div className="flex items-center gap-2.5">
                        {cat.image_couverture ? (
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                            <img src={cat.image_couverture} alt={cat.nom} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-background-100 flex items-center justify-center flex-shrink-0">
                            <i className="ri-price-tag-3-line text-sm text-foreground-400"></i>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-foreground-800">{cat.nom}</span>
                          {cat.type && (
                            <span className="ml-2 px-2 py-0.5 bg-secondary-50 text-secondary-600 rounded-full text-xs">{cat.type}</span>
                          )}
                        </div>
                      </div>
                      {editingCategory?.id === cat.id ? (
                        <span className="text-xs text-accent-600 font-medium px-2 py-0.5 bg-accent-50 rounded-full">En cours</span>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleStartEditCategory(cat)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Modifier"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => setCategoryDeleteConfirm(cat.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
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
        </div>
      )}

      {/* Category Delete Confirmation */}
      {categoryDeleteConfirm !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setCategoryDeleteConfirm(null)}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer la catégorie ?</h3>
            <p className="text-sm text-foreground-500 mb-5">Les services associés ne seront pas supprimés.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setCategoryDeleteConfirm(null)} className="px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDeleteCategory(categoryDeleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}