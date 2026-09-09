import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadMediaFile } from '@/hooks/useUpload';
import { useAuth } from '@/hooks/useAuth';

// Lazy-load the heavy background removal library only when needed
let removeBgModule: ((blob: Blob) => Promise<Blob>) | null = null;
async function getRemoveBackground() {
  if (!removeBgModule) {
    const mod = await import('@imgly/background-removal');
    removeBgModule = mod.removeBackground;
  }
  return removeBgModule;
}

interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  photos: string[];
  description: string;
  marque: string;
  couleur: string;
  taille: string;
  occasion: string;
  created_at: string;
  updated_at: string;
}

interface LocalImage {
  file: File;
  objectUrl: string;
  processed: boolean;
}

const CATEGORIES = [
  { value: 'haut', label: 'Haut', icon: 'ri-t-shirt-line', desc: 'T-shirts, chemises, pulls, vestes...' },
  { value: 'milieu', label: 'Milieu', icon: 'ri-pantone-line', desc: 'Pantalons, jupes, shorts, culottes...' },
  { value: 'bas', label: 'Bas', icon: 'ri-footprint-line', desc: 'Chaussures, sandales, baskets, bottes...' },
  { value: 'chapeaux', label: 'Chapeaux', icon: 'ri-user-5-line', desc: 'Casquettes, bonnets, chapeaux, bérets...' },
  { value: 'accessoires', label: 'Accessoires', icon: 'ri-handbag-line', desc: 'Sacs, bijoux, ceintures, montres...' },
];

const OCCASIONS = [
  { value: 'casual', label: 'Casual', icon: 'ri-t-shirt-line' },
  { value: 'travail', label: 'Travail', icon: 'ri-briefcase-line' },
  { value: 'soiree', label: 'Soirée', icon: 'ri-moon-line' },
  { value: 'sport', label: 'Sport', icon: 'ri-run-line' },
  { value: 'plage', label: 'Plage', icon: 'ri-sun-line' },
  { value: 'formel', label: 'Formel', icon: 'ri-vip-crown-line' },
];

const CATEGORY_LABELS: Record<string, string> = {};
CATEGORIES.forEach((c) => { CATEGORY_LABELS[c.value] = c.label; });

function getCategoryIcon(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.icon || 'ri-question-line';
}

export default function ClosetTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemoveIdx, setBgRemoveIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formOccasion, setFormOccasion] = useState('casual');
  // Local images: stored as File objects, uploaded to SeaweedFS only on submit
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  // Existing URLs (when editing)
  const [existingUrls, setExistingUrls] = useState<string[]>([]);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('user_closet')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setItems((data || []).map((item) => ({
        ...item,
        photos: typeof item.photos === 'string' ? JSON.parse(item.photos) : (item.photos || []),
      })));
    } catch {
      setError('Impossible de charger votre armoire.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setFormName('');
    setFormCategory('');
    setFormOccasion('casual');
    // Revoke object URLs to free memory
    localImages.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    setLocalImages([]);
    setExistingUrls([]);
    setEditingItem(null);
    setShowForm(false);
  };

  const openEditForm = (item: ClosetItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormOccasion(item.occasion || 'casual');
    localImages.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    setLocalImages([]);
    setExistingUrls(item.photos || []);
    setShowForm(true);
  };

  // All preview URLs: existing remote URLs + local object URLs
  const allPreviewUrls = [...existingUrls, ...localImages.map((img) => img.objectUrl)];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: LocalImage[] = [];
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) continue;
      if (files[i].size > 1024 * 1024) {
        setError('Chaque image doit faire moins de 1 Mo.');
        continue;
      }
      newImages.push({
        file: files[i],
        objectUrl: URL.createObjectURL(files[i]),
        processed: false,
      });
    }
    setLocalImages((prev) => [...prev, ...newImages]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveBackground = async (index: number, isExisting: boolean) => {
    setBgRemoving(true);
    setBgRemoveIdx(index);
    setError(null);

    try {
      let blob: Blob;

      if (isExisting) {
        // Fetch existing URL as blob
        const response = await fetch(existingUrls[index]);
        blob = await response.blob();
      } else {
        // Use local file
        blob = localImages[index].file;
      }

      const removeBackground = await getRemoveBackground();
      const processedBlob = await removeBackground(blob);

      if (isExisting) {
        // Upload processed blob to SeaweedFS, replace URL
        const processedFile = new File([processedBlob], `bg-removed-${Date.now()}.png`, { type: 'image/png' });
        const url = await uploadMediaFile(processedFile, `closet/${user!.id}`);
        setExistingUrls((prev) => {
          const next = [...prev];
          next[index] = url;
          return next;
        });
      } else {
        // Replace local file with processed version
        const processedFile = new File([processedBlob], `bg-removed-${Date.now()}.png`, { type: 'image/png' });
        const newObjectUrl = URL.createObjectURL(processedFile);
        setLocalImages((prev) => {
          const next = [...prev];
          // Revoke old object URL
          URL.revokeObjectURL(next[index].objectUrl);
          next[index] = { file: processedFile, objectUrl: newObjectUrl, processed: true };
          return next;
        });
      }
    } catch {
      setError("Erreur lors de la suppression de l'arrière-plan. Réessayez.");
    }

    setBgRemoving(false);
    setBgRemoveIdx(null);
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      setLocalImages((prev) => {
        const next = [...prev];
        URL.revokeObjectURL(next[index].objectUrl);
        next.splice(index, 1);
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!user || !formName.trim() || !formCategory) return;
    if (existingUrls.length === 0 && localImages.length === 0) {
      setError('Ajoutez au moins une photo.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      // Upload all local images to SeaweedFS
      const uploadedUrls: string[] = [];
      for (const img of localImages) {
        const url = await uploadMediaFile(img.file, `closet/${user.id}`);
        uploadedUrls.push(url);
      }

      // Combine existing URLs + newly uploaded URLs
      const allPhotos = [...existingUrls, ...uploadedUrls];

      const payload = {
        user_id: user.id,
        name: formName.trim(),
        category: formCategory,
        occasion: formOccasion,
        photos: JSON.stringify(allPhotos),
      };

      if (editingItem) {
        const { error: dbError } = await supabase
          .from('user_closet')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id)
          .eq('user_id', user.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('user_closet')
          .insert(payload);
        if (dbError) throw dbError;
      }

      resetForm();
      await fetchItems();
    } catch {
      setError("Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  };

  const handleDelete = async (item: ClosetItem) => {
    if (!user) return;
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('user_closet')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);
      if (dbError) throw dbError;
      await fetchItems();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  const countByCategory = (cat: string) => items.filter((i) => i.category === cat).length;

  const totalImageCount = allPreviewUrls.length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-shirt-line mr-2 text-foreground-700"></i>
            Mon Armoire
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            {items.length} vêtement{items.length !== 1 ? 's' : ''} dans votre garde-robe
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground-900 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
        >
          <i className="ri-add-line"></i>
          Ajouter un vêtement
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
          <i className="ri-error-warning-line"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
            filter === 'all'
              ? 'bg-foreground-100/70 text-foreground-900'
              : 'bg-background-50 border border-background-200/30 text-foreground-600 hover:bg-background-100'
          }`}
        >
          Tout ({items.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filter === cat.value
                ? 'bg-foreground-100/70 text-foreground-900'
                : 'bg-background-50 border border-background-200/30 text-foreground-600 hover:bg-background-100'
            }`}
          >
            <i className={`${cat.icon} text-sm`}></i>
            {cat.label} ({countByCategory(cat.value)})
          </button>
        ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/30 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-foreground-100 flex items-center justify-center mb-4">
            <i className="ri-shirt-line text-2xl text-foreground-500"></i>
          </div>
          <h3 className="text-foreground-800 font-semibold text-base mb-1">
            {filter !== 'all' ? 'Aucun vêtement dans cette catégorie' : 'Votre armoire est vide'}
          </h3>
          <p className="text-foreground-500 text-sm mb-5 text-center max-w-xs">
            Ajoutez vos vêtements avec nom, photo et type pour constituer votre garde-robe numérique.
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-5 py-2.5 border border-foreground-200 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-50 transition-colors cursor-pointer"
          >
            Ajouter mon premier vêtement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-background-50 border border-background-200/30 rounded-lg overflow-hidden group hover:border-foreground-200/50 transition-colors">
              <div className="aspect-[3/4] bg-background-100 relative cursor-pointer" onClick={() => openEditForm(item)}>
                {item.photos && item.photos.length > 0 ? (
                  <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover object-top" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <i className={`${getCategoryIcon(item.category)} text-2xl text-foreground-300`}></i>
                    <span className="text-[10px] text-foreground-400">Aucune photo</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-background-50/90 text-foreground-700 rounded-full text-[10px] font-medium">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm(item); }}
                      className="w-9 h-9 rounded-full bg-background-50 text-foreground-700 flex items-center justify-center cursor-pointer hover:bg-background-100 shadow-sm"
                    >
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 shadow-sm"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground-800 truncate">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={resetForm}>
          <div
            className="bg-background-50 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-background-200/30 flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-foreground-950">
                {editingItem ? 'Modifier le vêtement' : 'Ajouter un vêtement'}
              </h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-background-100">
                <i className="ri-close-line text-foreground-500"></i>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Nom du vêtement *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: T-shirt blanc coton"
                  className="w-full px-4 py-2.5 bg-background-50 border border-background-200/30 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-foreground-300"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Type de vêtement *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setFormCategory(cat.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        formCategory === cat.value
                          ? 'border-foreground-300 bg-foreground-100/70 text-foreground-900'
                          : 'border-background-200/30 bg-background-50 text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      <i className={`${cat.icon} text-lg`}></i>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">Occasion</label>
                <div className="grid grid-cols-3 gap-2">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ.value}
                      onClick={() => setFormOccasion(occ.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        formOccasion === occ.value
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-background-200/30 bg-background-50 text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      <i className={`${occ.icon} text-lg`}></i>
                      {occ.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Photos {totalImageCount > 0 && <span className="text-foreground-400 font-normal">({totalImageCount})</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {/* Existing remote URLs (when editing) */}
                  {existingUrls.map((url, idx) => {
                    const isProcessing = bgRemoving && bgRemoveIdx === idx;
                    return (
                      <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-background-200/30 group/img">
                        <img src={url} alt="" className="w-full h-full object-cover object-top" />
                        {/* Remove button */}
                        <button
                          onClick={() => removeImage(idx, true)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <i className="ri-close-line text-[10px]"></i>
                        </button>
                        {/* Background removal button */}
                        <button
                          onClick={() => handleRemoveBackground(idx, true)}
                          disabled={isProcessing}
                          className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-background-50/90 text-foreground-600 flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-background-100 hover:text-foreground-600 border border-background-200/30 disabled:opacity-100"
                          title="Retirer l'arrière-plan"
                        >
                          {isProcessing ? (
                            <i className="ri-loader-4-line animate-spin text-[10px]"></i>
                          ) : (
                            <i className="ri-magic-line text-[10px]"></i>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {/* Local images (new files, not yet uploaded) */}
                  {localImages.map((img, idx) => {
                    const isProcessing = bgRemoving && bgRemoveIdx === idx;
                    return (
                      <div key={`local-${idx}-${img.objectUrl.slice(-20)}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-background-200/30 group/img">
                        <img src={img.objectUrl} alt="" className="w-full h-full object-cover object-top" />
                        {img.processed && (
                          <span className="absolute top-0.5 left-0.5 px-1 py-0 text-[8px] bg-foreground-900 text-background-50 rounded font-medium">
                            Détouré
                          </span>
                        )}
                        {/* Remove button */}
                        <button
                          onClick={() => removeImage(idx, false)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <i className="ri-close-line text-[10px]"></i>
                        </button>
                        {/* Background removal button */}
                        <button
                          onClick={() => handleRemoveBackground(idx, false)}
                          disabled={isProcessing}
                          className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-background-50/90 text-foreground-600 flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-background-100 hover:text-foreground-600 border border-background-200/30 disabled:opacity-100"
                          title="Retirer l'arrière-plan"
                        >
                          {isProcessing ? (
                            <i className="ri-loader-4-line animate-spin text-[10px]"></i>
                          ) : (
                            <i className="ri-magic-line text-[10px]"></i>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {/* Add photo button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-background-200/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-foreground-200 text-foreground-400 hover:text-foreground-600 transition-colors"
                  >
                    <i className="ri-camera-line text-lg"></i>
                    <span className="text-[10px]">Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-[10px] text-foreground-400 mt-1.5">
                  Jusqu'à 1 Mo par image · Survolez une photo pour <i className="ri-magic-line align-middle"></i> retirer l'arrière-plan
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-background-200/30 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-foreground-600 cursor-pointer hover:bg-background-100 whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formName.trim() || !formCategory || saving || bgRemoving}
                className="px-5 py-2.5 bg-foreground-900 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 disabled:opacity-50 transition-colors flex items-center gap-2 justify-center"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Enregistrement...
                  </>
                ) : editingItem ? (
                  'Modifier'
                ) : (
                  'Ajouter'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}