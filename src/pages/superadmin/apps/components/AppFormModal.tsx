import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadMediaFile } from '@/hooks/useUpload';

export interface AppEntry {
  id: number;
  nom: string;
  description: string;
  typeapp: string;
  prix: string;
  image: string;
  free: number;
  nompage: string;
  active: number;
}

export const APP_TYPES: { value: string; label: string }[] = [
  { value: 'seo', label: 'SEO' },
  { value: 'communication', label: 'Communication' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'inventory', label: 'Stock' },
  { value: 'social', label: 'Réseaux sociaux' },
  { value: 'security', label: 'Sécurité' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'loyalty', label: 'Fidélité' },
  { value: 'pos', label: 'Caisse' },
  { value: 'crm', label: 'CRM' },
  { value: 'ai', label: 'Intelligence Artificielle' },
  { value: 'support', label: 'Support' },
  { value: 'payment', label: 'Paiement' },
  { value: 'media', label: 'Médias' },
  { value: 'forms', label: 'Formulaires' },
  { value: 'booking', label: 'Réservation' },
  { value: 'project', label: 'Projet' },
  { value: 'training', label: 'Formation' },
];

export function getTypeLabel(type: string): string {
  return APP_TYPES.find((t) => t.value === type)?.label || type;
}

function AppStoreCardPreview({ nom, description, typeapp, prix, free, active, image }: {
  nom: string;
  description: string;
  typeapp: string;
  prix: string;
  free: boolean;
  active: boolean;
  image: string;
}) {
  const isFree = free || prix === '0' || prix === '';
  const priceText = parseInt(prix || '0', 10).toLocaleString();

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-40 bg-background-100 overflow-hidden">
        {image ? (
          <img src={image} alt={nom} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="ri-apps-2-line text-3xl text-foreground-300"></i>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-background-50/90 text-foreground-700 backdrop-blur-sm whitespace-nowrap">
            {getTypeLabel(typeapp)}
          </span>
          {active && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 backdrop-blur-sm whitespace-nowrap">
              Actif
            </span>
          )}
        </div>
        {!isFree && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-md text-xs font-bold bg-primary-500 text-background-50 shadow-sm whitespace-nowrap">
              {priceText} MAD
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-foreground-900 mb-1">
          {nom.trim() || 'Nom de l application'}
        </h3>
        <p className="text-xs text-foreground-500 leading-relaxed mb-4 flex-1 line-clamp-3">
          {description.trim() || 'La description apparaîtra ici...'}
        </p>

        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600">
            <i className="ri-eye-line"></i>
            Détails
          </button>
          {isFree ? (
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-accent-100 text-accent-700">
              <i className="ri-download-2-line"></i>
              Gratuit
            </button>
          ) : (
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50">
              <i className="ri-shopping-cart-2-line"></i>
              {priceText} MAD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AppFormModalProps {
  mode: 'create' | 'edit';
  app: AppEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AppFormModal({ mode, app, onClose, onSaved }: AppFormModalProps) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [typeapp, setTypeapp] = useState('seo');
  const [prix, setPrix] = useState('0');
  const [free, setFree] = useState(true);
  const [nompage, setNompage] = useState('');
  const [active, setActive] = useState(false);
  const [image, setImage] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (app) {
      setNom(app.nom || '');
      setDescription(app.description || '');
      setTypeapp(app.typeapp || 'seo');
      setPrix(app.prix || '0');
      setFree(app.free === 1);
      setNompage(app.nompage || '');
      setActive(app.active === 1);
      setImage(app.image || '');
    } else {
      setNom('');
      setDescription('');
      setTypeapp('seo');
      setPrix('0');
      setFree(true);
      setNompage('');
      setActive(false);
      setImage('');
    }
    setError(null);
  }, [app, mode]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Veuillez selectionner un fichier image (JPG, PNG, WebP ou GIF).');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadMediaFile(file, 'apps');
      setImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload de l'image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (!image.trim()) {
      setError('Une image est obligatoire.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom: nom.trim(),
        description: description.trim(),
        typeapp,
        prix: free ? '0' : (prix.trim() || '0'),
        image: image.trim(),
        free: free ? 1 : 0,
        nompage: nompage.trim() || nom.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        active: active ? 1 : 0,
      };

      if (mode === 'edit' && app) {
        const { error: updateError } = await supabase
          .from('appstore')
          .update(payload)
          .eq('id', app.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('appstore').insert(payload);
        if (insertError) throw insertError;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background-50 rounded-lg border border-background-200/70 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground-950">
            {mode === 'edit' ? 'Modifier l application' : 'Nouvelle application'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">
              Image <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-[16/9] rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${
                dragging ? 'border-primary-400 bg-primary-50' : 'border-background-200/70 bg-background-100'
              }`}
            >
              {image ? (
                <>
                  <img src={image} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-background-50/90 text-xs font-medium text-foreground-800 whitespace-nowrap">
                      <i className="ri-image-edit-line mr-1"></i>Changer l image
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  {uploading ? (
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                  ) : (
                    <i className="ri-image-add-line text-2xl text-foreground-400"></i>
                  )}
                  <span className="text-xs text-foreground-500">
                    {uploading ? 'Upload en cours...' : 'Cliquez ou déposez une image ici (1 Mo max)'}
                  </span>
                </div>
              )}
            </div>
            {image && (
              <button
                onClick={(e) => { e.stopPropagation(); setImage(''); }}
                className="mt-1.5 text-xs text-red-500 hover:text-red-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1"></i>Retirer l image
              </button>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom de l application"
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l application..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Catégorie</label>
            <select
              value={typeapp}
              onChange={(e) => setTypeapp(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            >
              {APP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Nom de page */}
          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">Slug de page</label>
            <input
              type="text"
              value={nompage}
              onChange={(e) => setNompage(e.target.value)}
              placeholder="mon-app (laissé vide = généré depuis le nom)"
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Gratuit + Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border border-background-200/70 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground-800">Gratuite</p>
                <p className="text-[11px] text-foreground-400">Accès sans paiement</p>
              </div>
              <button
                onClick={() => setFree((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${free ? 'bg-accent-500' : 'bg-background-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${free ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">Prix (MAD)</label>
              <input
                type="number"
                min="0"
                value={free ? '0' : prix}
                disabled={free}
                onChange={(e) => setPrix(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between rounded-md border border-background-200/70 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground-800">Publiée</p>
              <p className="text-[11px] text-foreground-400">Visible dans l AppStore</p>
            </div>
            <button
              onClick={() => setActive((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${active ? 'bg-accent-500' : 'bg-background-300'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-background-50 transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200/60 text-red-600 text-xs">
              <i className="ri-error-warning-line flex-shrink-0"></i>
              <span>{error}</span>
            </div>
          )}
          </div>

          {/* Aperçu AppStore */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="flex items-center gap-2 mb-3">
              <i className="ri-eye-line text-foreground-400"></i>
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-500">Aperçu AppStore</span>
            </div>
            <AppStoreCardPreview
              nom={nom}
              description={description}
              typeapp={typeapp}
              prix={prix}
              free={free}
              active={active}
              image={image}
            />
            <p className="mt-3 text-[11px] text-foreground-400 leading-relaxed">
              Ceci est un aperçu en direct de la carte telle qu'elle apparaîtra dans l'AppStore des commerçants.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !nom.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
            {mode === 'edit' ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </>
  );
}