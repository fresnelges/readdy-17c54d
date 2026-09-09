import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadMediaFile } from '@/hooks/useUpload';

interface TeamMember {
  id: number;
  titre: string;
  description: string;
  detailssup: string | null;
  product_image: string;
  prix: number;
  tags: string | null;
  owner: number;
  created_at: string;
}

export default function EquipePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editingDetailSaving, setEditingDetailSaving] = useState(false);
  const [editTitre, setEditTitre] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDetailssup, setEditDetailssup] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editImage, setEditImage] = useState('');
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState('');
  const [uploadingNew, setUploadingNew] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('equipe')
        .select('*')
        .eq('owner', user!.id)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setMembers(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchTeam();
  }, [fetchTeam, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImageUploading(true);
    try {
      const url = await uploadMediaFile(file, 'equipe');
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
      const { error: insertErr } = await supabase.from('equipe').insert({
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
      setMsg({ type: 'success', text: 'Membre ajouté avec succès !' });
      setFormData({ titre: '', description: '', detailssup: '', tags: '', product_image: '' });
      fetchTeam();
      setTimeout(() => { setShowModal(false); setMsg(null); }, 1000);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de l\'ajout' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error: delErr } = await supabase.from('equipe').delete().eq('id', id);
      if (delErr) throw delErr;
      setDeleteConfirm(null);
      fetchTeam();
    } catch {
      // silent
    }
  };

  const initEditFromMember = (member: TeamMember) => {
    setDetailMember(member);
    setEditingDetail(false);
    setEditTitre(member.titre || '');
    setEditDescription(member.description || '');
    setEditDetailssup(member.detailssup || '');
    setEditTags(member.tags || '');
    setEditImage(member.product_image || '');
    setNewMediaFile(null);
    setNewMediaPreview('');
  };

  const handleSaveMember = async () => {
    if (!detailMember || !user) return;
    setEditingDetailSaving(true);
    try {
      let finalImage = editImage;
      if (newMediaFile) {
        setUploadingNew(true);
        const url = await uploadMediaFile(newMediaFile, 'equipe').catch(() => null);
        if (url) finalImage = url;
        setUploadingNew(false);
      }

      const { error: updateError } = await supabase
        .from('equipe')
        .update({
          titre: editTitre.trim(),
          description: editDescription.trim(),
          detailssup: editDetailssup.trim() || null,
          tags: editTags.trim() || null,
          product_image: finalImage || '',
        })
        .eq('id', detailMember.id);

      if (updateError) throw updateError;

      setEditingDetail(false);
      setDetailMember(null);
      setNewMediaFile(null);
      setNewMediaPreview('');
      fetchTeam();
    } catch (err: unknown) {
      console.error('[handleSaveMember] error:', err);
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
        <span className="text-sm font-bold text-foreground-950">Notre équipe</span>
        <button
          onClick={() => { setShowModal(true); setMsg(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer ml-auto"
        >
          <i className="ri-add-line"></i>
          Ajouter un membre
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Notre équipe</h2>
        <p className="text-sm text-foreground-500 mt-1">Gérez les membres de votre équipe</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-error-warning-line text-4xl text-red-400 mb-3"></i>
          <p className="text-foreground-600 mb-3">{error}</p>
          <button onClick={fetchTeam} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-user-star-line text-2xl text-foreground-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-800 mb-1">Aucun membre</h3>
          <p className="text-sm text-foreground-500 mb-4">Ajoutez les membres de votre équipe</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-600 transition-colors"
          >
            <i className="ri-add-line"></i>
            Ajouter un membre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors text-center group">
              <div className="h-40 bg-background-100 overflow-hidden">
                <img
                  src={member.product_image || 'https://readdy.ai/api/search-image?query=Professional%20team%20member%20portrait%20with%20clean%20neutral%20background%20soft%20lighting%20corporate%20headshot%20style%20modern%20aesthetic&width=400&height=400&seq=team-card-01&orientation=squarish'}
                  alt={member.titre}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Generic%20professional%20avatar%20placeholder%20with%20soft%20gradient%20background%20clean%20minimalist%20design&width=400&height=400&seq=team-card-fallback&orientation=squarish';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground-900 mb-1">{member.titre}</h3>
                <p className="text-xs text-foreground-500 mb-2 line-clamp-2">{member.description}</p>
                {member.tags && (
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mb-3">
                    {member.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs">{tag.trim()}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => initEditFromMember(member)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                    title="Voir détails"
                  >
                    <i className="ri-eye-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(member.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowModal(false); setMsg(null); }}></div>
          <div className="relative bg-background-50 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold font-heading text-foreground-950">Ajouter un membre</h3>
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
              {/* Image */}
              {formData.product_image ? (
                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-background-100">
                  <img src={formData.product_image} alt="Aperçu" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, product_image: '' }))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              ) : (
                <>
                  <label
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-32 h-32 mx-auto border-2 border-dashed border-background-200/70 rounded-full cursor-pointer hover:border-primary-300 transition-colors bg-background-50"
                  >
                    {imageUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                        <span className="text-xs text-primary-500 font-medium">Upload...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <i className="ri-camera-line text-xl text-foreground-400"></i>
                        <span className="text-xs text-foreground-400">Photo</span>
                      </div>
                    )}
                  </label>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="absolute w-px h-px opacity-0 pointer-events-none" />
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Nom *</label>
                <input type="text" value={formData.titre} onChange={(e) => setFormData((p) => ({ ...p, titre: e.target.value }))} required placeholder="Nom du membre" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Rôle / Poste</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Développeur Senior" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Bio / Détails</label>
                <textarea value={formData.detailssup} onChange={(e) => setFormData((p) => ({ ...p, detailssup: e.target.value }))} rows={2} placeholder="Courte biographie..." className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-700 mb-1">Compétences / Tags (séparés par des virgules)</label>
                <input type="text" value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} placeholder="Ex: React, Node.js, UI/UX" className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors" />
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
            <h3 className="text-lg font-bold font-heading text-foreground-950 mb-2">Supprimer ce membre ?</h3>
            <p className="text-sm text-foreground-500 mb-5">Cette action est irréversible.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-red-600 transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Detail / Inline Edit Modal */}
      {detailMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setDetailMember(null); setEditingDetail(false); }}></div>
          <div className="relative bg-background-50 rounded-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-background-200/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <i className="ri-user-star-line text-primary-600"></i>
                </div>
                {editingDetail ? (
                  <input
                    value={editTitre}
                    onChange={(e) => setEditTitre(e.target.value)}
                    className="text-base font-bold font-heading text-foreground-950 bg-background-50 border border-background-200/70 rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 min-w-[200px]"
                    placeholder="Nom du membre"
                  />
                ) : (
                  <h3 className="text-base font-bold font-heading text-foreground-950">{detailMember.titre}</h3>
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
                  onClick={() => { setDetailMember(null); setEditingDetail(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 text-foreground-500 hover:text-foreground-800 hover:bg-background-200/70 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
              {/* Profile Image */}
              <div className="flex justify-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-background-100 group">
                  {(() => {
                    const displayImg = editingDetail && newMediaPreview ? newMediaPreview : (editingDetail ? editImage : detailMember.product_image);
                    if (!displayImg) {
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <i className="ri-user-line text-3xl text-foreground-300"></i>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <>
                        <img
                          src={displayImg}
                          alt={detailMember.titre}
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setFullscreenImage(displayImg)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {editingDetail && displayImg && (
                          <button
                            onClick={() => { setEditImage(''); setNewMediaFile(null); setNewMediaPreview(''); }}
                            className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                            title="Supprimer cette photo"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {editingDetail && (
                <div className="flex justify-center">
                  <label
                    onClick={() => detailFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-background-50 border border-dashed border-accent-300/60 rounded-lg text-xs text-accent-600 hover:bg-accent-50 cursor-pointer transition-colors"
                  >
                    <i className="ri-camera-line"></i>
                    <span className="whitespace-nowrap">Changer la photo</span>
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
                    <span className="text-xs text-accent-600 flex items-center gap-1 ml-2">
                      <i className="ri-loader-4-line animate-spin"></i> Upload...
                    </span>
                  )}
                </div>
              )}

              {/* Role / Description */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Rôle / Poste</label>
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                    placeholder="Ex: Développeur Senior"
                  />
                </div>
              ) : (
                detailMember.description && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Rôle</h5>
                    <p className="text-sm font-medium text-primary-600">{detailMember.description}</p>
                  </div>
                )
              )}

              {/* Tags */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Compétences (séparés par des virgules)</label>
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                    placeholder="React, Node.js, UI/UX"
                  />
                </div>
              ) : (
                detailMember.tags && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground-400 flex-shrink-0">
                      <i className="ri-hashtag mr-0.5"></i>Compétences :
                    </span>
                    {detailMember.tags.split(',').map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium">{tag.trim()}</span>
                    ))}
                  </div>
                )
              )}

              {/* Bio */}
              {editingDetail ? (
                <div>
                  <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-1.5 block">Bio / Détails</label>
                  <textarea
                    value={editDetailssup}
                    onChange={(e) => setEditDetailssup(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 resize-none transition-colors"
                    placeholder="Courte biographie..."
                  />
                </div>
              ) : (
                detailMember.detailssup && (
                  <div>
                    <h5 className="text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-2">Bio</h5>
                    <div className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap bg-background-50 border border-background-200/70 rounded-lg p-4">
                      {detailMember.detailssup}
                    </div>
                  </div>
                )
              )}

              {/* Meta info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                  <span className="block text-xs text-foreground-400 mb-0.5">Slug</span>
                  <span className="text-sm font-medium text-foreground-800 font-mono text-xs">{detailMember.slug}</span>
                </div>
                <div className="bg-background-50 border border-background-200/70 rounded-lg p-3">
                  <span className="block text-xs text-foreground-400 mb-0.5">Créé le</span>
                  <span className="text-sm font-medium text-foreground-800">
                    <i className="ri-calendar-line mr-1 text-foreground-400"></i>
                    {new Date(detailMember.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
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
                    onClick={handleSaveMember}
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
                    onClick={() => { setDetailMember(null); setEditingDetail(false); }}
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