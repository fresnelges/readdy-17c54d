import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadMediaFile } from '@/hooks/useUpload';

interface PartnerItem {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  tags: string | null;
  owner: number;
  pays: string | null;
  ville: string | null;
  slug: string;
  created_at: string;
}

export default function PartenairesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ titre: '', description: '', detailssup: '', tags: '', product_image: '' });
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Detail / inline edit
  const [detailPartner, setDetailPartner] = useState<PartnerItem | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editingDetailSaving, setEditingDetailSaving] = useState(false);
  const [editTitre, setEditTitre] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDetailssup, setEditDetailssup] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVille, setEditVille] = useState('');
  const [editPays, setEditPays] = useState('');
  const [editImage, setEditImage] = useState('');
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState('');
  const [uploadingNew, setUploadingNew] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('partenaires')
        .select('*')
        .eq('owner', user!.id)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('titre', `%${search}%`);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setPartners(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  }, [search, user]);

  useEffect(() => {
    if (user) fetchPartners();
  }, [fetchPartners, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImageUploading(true);
    try {
      const url = await uploadMediaFile(file, 'partenaires');
      if (url) {
        setFormData((prev) => ({ ...prev, product_image: url }));
      }
    } catch {
      // silent
    } finally {
      setImageUploading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titre.trim() || !user) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error: insertErr } = await supabase.from('partenaires').insert({
        titre: formData.titre.trim(),
        description: formData.description.trim(),
        detailssup: formData.detailssup.trim() || null,
        tags: formData.tags.trim() || null,
        prix: 0,
        product_image: formData.product_image || '',
        owner: user.id,
        pays: user.Pays || null,
        ville: user.Ville || null,
        slug: formData.titre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
      if (insertErr) throw insertErr;
      setMsg({ type: 'success', text: 'Partenaire ajouté avec succès !' });
      setFormData({ titre: '', description: '', detailssup: '', tags: '', product_image: '' });
      fetchPartners();
      setTimeout(() => { setShowModal(false); setMsg(null); }, 1000);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de l\'ajout' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error: delErr } = await supabase.from('partenaires').delete().eq('id', id);
      if (delErr) throw delErr;
      setDeleteConfirm(null);
      fetchPartners();
    } catch {
      // silent
    }
  };

  const initEditFromPartner = (partner: PartnerItem) => {
    setDetailPartner(partner);
    setEditingDetail(false);
    setEditTitre(partner.titre || '');
    setEditDescription(partner.description || '');
    setEditDetailssup(partner.detailssup || '');
    setEditTags(partner.tags || '');
    setEditVille(partner.ville || '');
    setEditPays(partner.pays || '');
    setEditImage(partner.product_image || '');
    setNewMediaFile(null);
    setNewMediaPreview('');
  };

  const handleSavePartner = async () => {
    if (!detailPartner || !user) return;
    setEditingDetailSaving(true);
    try {
      let finalImage = editImage;
      if (newMediaFile) {
        setUploadingNew(true);
        const url = await uploadMediaFile(newMediaFile, 'partenaires').catch(() => null);
        if (url) finalImage = url;
        setUploadingNew(false);
      }

      const { error: updateError } = await supabase
        .from('partenaires')
        .update({
          titre: editTitre.trim(),
          description: editDescription.trim(),
          detailssup: editDetailssup.trim() || null,
          tags: editTags.trim() || null,
          ville: editVille.trim() || null,
          pays: editPays.trim() || null,
          product_image: finalImage || '',
        })
        .eq('id', detailPartner.id);

      if (updateError) throw updateError;

      setEditingDetail(false);
      setDetailPartner(null);
      setNewMediaFile(null);
      setNewMediaPreview('');
      fetchPartners();
    } catch (err: unknown) {
      console.error('[handleSavePartner] error:', err);
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
        <span className="text-sm font-bold text-foreground-950">Mes partenaires</span>
        <button
          onClick={() => { setShowModal(true); setMsg(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer ml-auto"
        >
          <i className="ri-add-line"></i>
          Ajouter un partenaire
        </button>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Mes partenaires</h2>
        <p className="text-sm text-foreground-500 mt-1">Gérez vos partenaires et collaborateurs</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
        <input
          type="text"
          placeholder="Rechercher un partenaire..."
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
          <button onClick={fetchPartners} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-team-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun partenaire</h3>
          <p className="text-sm text-foreground-500 mb-4">Ajoutez vos partenaires pour les voir apparaître ici</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Ajouter un partenaire
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <div key={partner.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group">
                <div className="h-44 bg-background-100 overflow-hidden">
                  <img
                    src={partner.product_image || 'https://readdy.ai/api/search-image?query=Professional%20business%20partner%20illustration%20with%20clean%20modern%20aesthetic%20soft%20gradient%20background%20corporate%20style%20minimalist%20design&width=600&height=400&seq=partner-card-01&orientation=landscape'}
                    alt={partner.titre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Soft%20neutral%20gradient%20background%20minimalist%20placeholder%20professional%20clean%20design%20light%20tones&width=600&height=400&seq=partner-card-fallback&orientation=landscape';
                    }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground-900 leading-snug">{partner.titre}</h3>
                  </div>
                  <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{partner.description}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {partner.tags && partner.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground-400">
                      {partner.ville && partner.pays ? `${partner.ville}, ${partner.pays}` : partner.ville || partner.pays || ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => initEditFromPartner(partner)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                        title="Voir détails"
                      >
                        <i className="ri-eye-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(partner.id)}
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

          <div className="flex items-center justify-between mt-4 text-sm text-foreground-500">
            <span>{partners.length} partenaire{partners.length > 1 ? 's' : ''}</span>
          </div>
        </>
      )}

      {/* Add Partner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowModal(false); setMsg(null); }}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-heading text-foreground-950">Ajouter un partenaire</h3>
              <button onClick={() => { setShowModal(false); setMsg(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {msg && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ${msg.type === 'success' ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              {formData.product_image ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden bg-background-100">
                  <img src={formData.product_image} alt="Aperçu" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, product_image: '' }))} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              ) : (
                <>
                  <label
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-background-200/70 rounded-lg cursor-pointer hover:border-primary-300 transition-colors bg-background-50"
                  >
                    {imageUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                        <span className="text-xs text-primary-500 font-medium">Upload...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <i className="ri-image-add-line text-xl text-foreground-400"></i>
                        <span className="text-xs text-foreground-400">Logo ou image du partenaire</span>
                      </div>
                    )}
                  </label>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="absolute w-px h-px opacity-0 pointer-events-none" />
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Nom du partenaire *</label>
                <input type="text" value={formData.titre} onChange={(e) => setFormData((p) => ({ ...p, titre: e.target.value }))} required placeholder="Nom de l'entreprise ou du partenaire" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Description courte</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Agence de design partenaire" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Détails supplémentaires</label>
                <textarea value={formData.detailssup} onChange={(e) => setFormData((p) => ({ ...p, detailssup: e.target.value }))} rows={3} placeholder="Informations complémentaires sur le partenariat..." className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Tags / Secteurs (séparés par des virgules)</label>
                <input type="text" value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} placeholder="Ex: Design, Marketing, Tech" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving || !formData.titre.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  {saving ? <><i className="ri-loader-4-line animate-spin"></i> Ajout...</> : <><i className="ri-check-line"></i> Ajouter</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer ce partenaire ?</h3>
            <p className="text-sm text-foreground-500 mb-5">Cette action est irréversible.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Detail / Inline Edit Modal */}
      {detailPartner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setDetailPartner(null); setEditingDetail(false); }}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center">
                  <i className="ri-team-line text-accent-600"></i>
                </div>
                {editingDetail ? (
                  <input
                    value={editTitre}
                    onChange={(e) => setEditTitre(e.target.value)}
                    className="text-base font-bold font-heading text-foreground-950 bg-background-50 border border-background-200/70 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 min-w-[200px]"
                    placeholder="Nom du partenaire"
                  />
                ) : (
                  <h3 className="text-base font-bold font-heading text-foreground-950">{detailPartner.titre}</h3>
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
                  onClick={() => { setDetailPartner(null); setEditingDetail(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
              {/* Image */}
              <div>
                <div className="relative w-full h-44 sm:h-52 rounded-lg overflow-hidden bg-background-100 group">
                  {(() => {
                    const displayImg = editingDetail && newMediaPreview ? newMediaPreview : (editingDetail ? editImage : detailPartner.product_image);
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
                          alt={detailPartner.titre}
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
                    rows={2}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none transition-colors"
                    placeholder="Description courte..."
                  />
                </div>
              ) : (
                detailPartner.description && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Description</h5>
                    <p className="text-sm text-foreground-700 leading-relaxed">{detailPartner.description}</p>
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
                    placeholder="design, marketing, tech"
                  />
                </div>
              ) : (
                detailPartner.tags && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground-400 flex-shrink-0">
                      <i className="ri-hashtag mr-0.5"></i>Tags :
                    </span>
                    {detailPartner.tags.split(',').map((tag) => (
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
                detailPartner.detailssup && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Détails supplémentaires</h5>
                    <div className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap bg-background-50 border border-background-200/70 rounded-lg p-4">
                      {detailPartner.detailssup}
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
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailPartner.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-1">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailPartner.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(detailPartner.ville || detailPartner.pays) && (
                    <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                      <span className="block text-xs text-foreground-400 mb-0.5">Localisation</span>
                      <span className="text-sm font-medium text-foreground-800">
                        <i className="ri-map-pin-line mr-1 text-foreground-400"></i>
                        {[detailPartner.ville, detailPartner.pays].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Slug</span>
                    <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailPartner.slug}</span>
                  </div>
                  <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                    <span className="block text-xs text-foreground-400 mb-0.5">Créé le</span>
                    <span className="text-sm font-medium text-foreground-800">
                      <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                      {new Date(detailPartner.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                    onClick={handleSavePartner}
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
                    onClick={() => { setDetailPartner(null); setEditingDetail(false); }}
                    className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => setEditingDetail(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent-50 text-accent-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-edit-line text-sm"></i>
                    Éditer
                  </button>
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