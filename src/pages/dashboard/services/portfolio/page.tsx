import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getCommerceId } from '@/lib/ownership';
import { uploadMediaFile } from '@/hooks/useUpload';

interface PortfolioItem {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  categorie_id: number;
  tags: string | null;
  owner: number;
  pays: string | null;
  ville: string | null;
  slug: string;
  created_at: string;
  taille: number;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Detail / inline edit
  const [detailItem, setDetailItem] = useState<PortfolioItem | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editingDetailSaving, setEditingDetailSaving] = useState(false);
  const [editTitre, setEditTitre] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDetailssup, setEditDetailssup] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editPrix, setEditPrix] = useState('');
  const [editVille, setEditVille] = useState('');
  const [editPays, setEditPays] = useState('');
  const [editImage, setEditImage] = useState('');
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState('');
  const [uploadingNew, setUploadingNew] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('portfolio')
        .select('*')
        .eq('idcommerce', getCommerceId(user))
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('titre', `%${search}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du portfolio');
    } finally {
      setLoading(false);
    }
  }, [search, user]);

  useEffect(() => {
    if (user) fetchPortfolio();
  }, [fetchPortfolio, user]);

  const handleDelete = async (id: number) => {
    try {
      const { error: delError } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', id);
      if (delError) throw delError;
      setDeleteConfirm(null);
      fetchPortfolio();
    } catch {
      // silent
    }
  };

  const initEditFromItem = (item: PortfolioItem) => {
    setDetailItem(item);
    setEditingDetail(false);
    setEditTitre(item.titre || '');
    setEditDescription(item.description || '');
    setEditDetailssup(item.detailssup || '');
    setEditTags(item.tags || '');
    setEditPrix(String(item.prix ?? ''));
    setEditVille(item.ville || '');
    setEditPays(item.pays || '');
    setEditImage(item.product_image || '');
    setNewMediaFile(null);
    setNewMediaPreview('');
  };

  const handleSaveItem = async () => {
    if (!detailItem || !user) return;
    setEditingDetailSaving(true);
    try {
      let finalImage = editImage;
      let finalTaille = detailItem.taille || 0;
      if (newMediaFile) {
        setUploadingNew(true);
        const url = await uploadMediaFile(newMediaFile, 'portfolio').catch(() => null);
        if (url) {
          finalImage = url;
          finalTaille = newMediaFile.size;
        }
        setUploadingNew(false);
      }

      const { error: updateError } = await supabase
        .from('portfolio')
        .update({
          titre: editTitre.trim(),
          description: editDescription.trim(),
          detailssup: editDetailssup.trim() || null,
          tags: editTags.trim() || null,
          prix: parseFloat(editPrix) || 0,
          ville: editVille.trim() || null,
          pays: editPays.trim() || null,
          product_image: finalImage || '',
          taille: finalTaille,
        })
        .eq('id', detailItem.id);

      if (updateError) throw updateError;

      setEditingDetail(false);
      setDetailItem(null);
      setNewMediaFile(null);
      setNewMediaPreview('');
      fetchPortfolio();
    } catch (err: unknown) {
      console.error('[handleSaveItem] error:', err);
    } finally {
      setEditingDetailSaving(false);
      setUploadingNew(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Sub nav */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/dashboard/services')} className="px-4 py-2.5 bg-background-50 border border-background-200/70 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer">
          <i className="ri-arrow-left-line mr-1"></i> Services
        </button>
        <div className="h-6 w-px bg-background-200/70 hidden sm:block"></div>
        <span className="text-sm font-bold text-foreground-950">Portfolio</span>
        <button
          onClick={() => navigate('/dashboard/services/portfolio/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer ml-auto"
        >
          <i className="ri-add-line"></i>
          Ajouter un projet
        </button>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Portfolio</h2>
        <p className="text-sm text-foreground-500 mt-1">Gérez vos projets réalisés</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher un projet..."
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
          <button onClick={fetchPortfolio} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-briefcase-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun projet</h3>
          <p className="text-sm text-foreground-500 mb-4">Ajoutez votre premier projet au portfolio</p>
          <button
            onClick={() => navigate('/dashboard/services/portfolio/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Ajouter un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group">
              <div className="h-44 bg-background-100 overflow-hidden">
                <img
                  src={item.product_image || 'https://readdy.ai/api/search-image?query=Professional%20portfolio%20project%20showcase%20with%20clean%20modern%20aesthetic%20soft%20gradient%20background%20abstract%20geometric%20design%20elements%20corporate%20style&width=600&height=400&seq=portfolio-card-01&orientation=landscape'}
                  alt={item.titre}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Minimalist%20placeholder%20with%20soft%20neutral%20gradient%20background%20professional%20clean%20aesthetic&width=600&height=400&seq=portfolio-card-fallback&orientation=landscape';
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground-900 leading-snug line-clamp-2">{item.titre}</h3>
                  {item.prix > 0 && (
                    <span className="text-sm font-bold text-primary-600 whitespace-nowrap flex-shrink-0">{item.prix.toLocaleString()} MAD</span>
                  )}
                </div>
                <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{item.description}</p>
                {item.tags && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {item.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-400">
                    {item.ville && item.pays ? `${item.ville}, ${item.pays}` : item.ville || item.pays || ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => initEditFromItem(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                      title="Voir détails"
                    >
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
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

      {items.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
          <span>{items.length} projet{items.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer le projet ?</h3>
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

      {/* Portfolio Detail / Inline Edit Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setDetailItem(null); setEditingDetail(false); }}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <i className="ri-briefcase-line text-primary-600"></i>
                </div>
                {editingDetail ? (
                  <input
                    value={editTitre}
                    onChange={(e) => setEditTitre(e.target.value)}
                    className="text-base font-bold font-heading text-foreground-950 bg-background-50 border border-background-200/70 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 min-w-[200px]"
                    placeholder="Titre du projet"
                  />
                ) : (
                  <h3 className="text-base font-bold font-heading text-foreground-950">{detailItem.titre}</h3>
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
                  onClick={() => { setDetailItem(null); setEditingDetail(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
              {/* Price - shown in both modes */}
              {editingDetail ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground-400">Budget (MAD) :</span>
                  <input
                    value={editPrix}
                    onChange={(e) => setEditPrix(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-36 px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-sm font-bold text-primary-600 focus:outline-none focus:border-primary-300"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                detailItem.prix > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary-600">{detailItem.prix.toLocaleString()} MAD</span>
                  </div>
                )
              )}

              {/* Image */}
              <div>
                <div className="relative w-full h-44 sm:h-52 rounded-lg overflow-hidden bg-background-100 group">
                  {(() => {
                    const displayImg = editingDetail && newMediaPreview ? newMediaPreview : (editingDetail ? editImage : detailItem.product_image);
                    if (!displayImg) {
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <i className="ri-image-line text-3xl text-foreground-300 mb-2 block"></i>
                            <span className="text-xs text-foreground-400">Aucune image</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <>
                        <img
                          src={displayImg}
                          alt={detailItem.titre}
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setFullscreenImage(displayImg)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {editingDetail && displayImg && (
                          <button
                            onClick={() => { setEditImage(''); setNewMediaFile(null); setNewMediaPreview(''); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                            title="Supprimer cette image"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
                {editingDetail && (
                  <div className="flex items-center gap-2 mt-2">
                    <label
                      onClick={() => detailFileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-background-50 border border-dashed border-accent-300/60 rounded-lg text-xs text-accent-600 hover:bg-accent-50 cursor-pointer transition-colors"
                    >
                      <i className="ri-image-add-line"></i>
                      <span className="whitespace-nowrap">Changer l'image</span>
                    </label>
                    <input
                      ref={detailFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setNewMediaFile(file);
                        setNewMediaPreview(URL.createObjectURL(file));
                      }}
                    />
                    {uploadingNew && (
                      <span className="text-xs text-accent-600 flex items-center gap-1">
                        <i className="ri-loader-4-line animate-spin"></i> Upload...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none transition-colors"
                    placeholder="Description du projet..."
                  />
                </div>
              ) : (
                detailItem.description && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Description</h5>
                    <p className="text-sm text-foreground-700 leading-relaxed">{detailItem.description}</p>
                  </div>
                )
              )}

              {/* Tags */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Tags (séparés par des virgules)</label>
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                    placeholder="design, web, mobile"
                  />
                </div>
              ) : (
                detailItem.tags && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground-400 flex-shrink-0">
                      <i className="ri-hashtag mr-0.5"></i>Tags :
                    </span>
                    {detailItem.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium">{tag.trim()}</span>
                    ))}
                  </div>
                )
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
                detailItem.detailssup && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Détails supplémentaires</h5>
                    <div className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap bg-background-50 border border-background-200/70 rounded-lg p-4">
                      {detailItem.detailssup}
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
                    <span className="block text-xs text-foreground-400 mb-1">Slug</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailItem.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailItem.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(detailItem.ville || detailItem.pays) && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">Localisation</span>
                      <span className="text-sm font-medium text-foreground-800">
                        <i className="ri-map-pin-line mr-1 text-foreground-400"></i>
                        {[detailItem.ville, detailItem.pays].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Slug</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailItem.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailItem.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                    onClick={handleSaveItem}
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
                    onClick={() => { setDetailItem(null); setEditingDetail(false); }}
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85"
          onClick={() => setFullscreenImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setFullscreenImage(null); }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer z-10"
          >
            <i className="ri-close-line text-lg md:text-xl"></i>
          </button>
          <img
            src={fullscreenImage}
            alt="Vue agrandie"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg select-none"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}