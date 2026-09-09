import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadMediaFile } from '@/hooks/useUpload';
import ImagePicker from '@/components/feature/ImagePicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ThemeItem {
  id: number;
  idauteur: number;
  titre: string;
  description: string;
  version: string;
  prix: string;
  stylesheet: string;
  dossier: string;
  imagecouverture: string;
  typetheme: string;
  active: number;
  modedev: number;
}

interface ActiveTheme {
  id: number;
  idtheme: number;
  nomtheme: string;
  idcommerce: number;
  prix: string;
  status: string;
  datedactivation: string;
}

interface ThemeContenu {
  id: number;
  idtheme: number;
  idshop: number;
  titrenavmenudefaut: string;
  descriptionnavmenudefault: string;
  imagebannierenavmenudefault: string;
  pages_visibles?: string;
  primary_color?: string;
  accent_color?: string;
  nav_order?: string;
  custom_pages?: string;
  font_family?: string;
}

// ── Custom page type ──────────────────────────────────────────
interface CustomPageItem {
  key: string;
  label: string;
  url: string;
  icon: string;
  isExternal: boolean;
}

// ── Sortable page item (drag & drop) ─────────────────────────
interface SortablePageProps {
  page: { key: string; label: string; icon: string };
  enabled: boolean;
  checked: boolean;
  onToggle: () => void;
}

function SortablePageItem({ page, enabled, checked, onToggle }: SortablePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.key, disabled: !enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
        checked
          ? 'bg-primary-50 border-primary-200/60'
          : 'bg-background-50 border-background-200/70 hover:border-background-300/60'
      } ${isDragging ? 'shadow-lg z-10 ring-2 ring-primary-300/50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        disabled={!enabled}
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded cursor-grab active:cursor-grabbing transition-colors ${
          enabled
            ? 'text-foreground-400 hover:text-foreground-600'
            : 'text-foreground-200 cursor-not-allowed'
        }`}
      >
        <i className="ri-draggable text-base"></i>
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400 cursor-pointer flex-shrink-0"
      />

      {/* Icon + Label */}
      <i className={`${page.icon} text-sm flex-shrink-0 ${checked ? 'text-primary-600' : 'text-foreground-400'}`}></i>
      <span className={`text-sm font-medium flex-1 ${checked ? 'text-primary-800' : 'text-foreground-600'}`}>
        {page.label}
      </span>

      {/* Status badge */}
      {checked ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 font-medium whitespace-nowrap">Visible</span>
      ) : (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-100 text-foreground-400 whitespace-nowrap">Masquée</span>
      )}
    </div>
  );
}

interface ThemeParamettre {
  id: number;
  idtheme: number;
  idcommerce: number;
  titre: string;
  descriptionbanniere: string;
  imageaboutus: string;
  titreblocdecouvert: string;
  descriptionblocdecouvert: string;
  fichierblocdecouvert: string;
}

// ── Helpers ─────────────────────────────────────────────────
function isCssString(str: string | null | undefined): boolean {
  if (!str || str.length < 60) return false;
  const s = str.trim();
  return (
    s.includes('body{') ||
    s.includes('body {') ||
    s.includes('@{') ||
    s.includes('@media') ||
    s.includes('/*') && s.includes('*/') && s.includes('{') && s.includes('}')
  );
}

function safeDescription(str: string | null | undefined): string {
  if (!str) return '';
  if (isCssString(str)) return '';
  return str;
}

// ── Theme Customizer Modal ────────────────────────────────────

interface ThemeCustomizerModalProps {
  themeId: number;
  commerceId: number;
  storeName: string;
  userName: string;
  initialContent: ThemeContenu | null;
  onSave: () => void;
  onClose: () => void;
}

function ThemeCustomizerModal({ themeId, commerceId, storeName, userName, initialContent, onSave, onClose }: ThemeCustomizerModalProps) {
  const PAGE_KEYS = [
    { key: 'accueil', label: 'Accueil', icon: 'ri-home-line' },
    { key: 'produits', label: 'Produits', icon: 'ri-shopping-bag-line' },
    { key: 'services', label: 'Services', icon: 'ri-service-line' },
    { key: 'portfolio', label: 'Portfolio', icon: 'ri-briefcase-line' },
    { key: 'partenaires', label: 'Partenaires', icon: 'ri-team-line' },
    { key: 'equipe', label: 'Équipe', icon: 'ri-user-star-line' },
    { key: 'rendezvous', label: 'Rendez-vous', icon: 'ri-calendar-check-line' },
  ];

  const AVAILABLE_ICONS = [
    'ri-home-line', 'ri-shopping-bag-line', 'ri-service-line', 'ri-briefcase-line',
    'ri-team-line', 'ri-user-star-line', 'ri-calendar-check-line', 'ri-store-2-line',
    'ri-article-line', 'ri-contacts-line', 'ri-file-list-3-line', 'ri-price-tag-3-line',
    'ri-customer-service-2-line', 'ri-newspaper-line', 'ri-vidicon-line',
    'ri-gallery-line', 'ri-map-pin-line', 'ri-shield-check-line', 'ri-global-line',
  ];

  // ── Predefined color palettes ───────────────────────────────
  const COLOR_PALETTES = [
    { name: 'Classique', primary: '#1a1a2e', accent: '#e94560', desc: 'Navy & Rouge' },
    { name: 'Nature', primary: '#2d6a4f', accent: '#d4a373', desc: 'Forêt & Tan' },
    { name: 'Océan', primary: '#006d77', accent: '#83c5be', desc: 'Teal & Menthe' },
    { name: 'Chaleur', primary: '#e76f51', accent: '#f4a261', desc: 'Terracotta & Orange' },
    { name: 'Minimal', primary: '#2b2d42', accent: '#8d99ae', desc: 'Ardoise & Gris' },
    { name: 'Luxe', primary: '#1b1b1b', accent: '#c6a96b', desc: 'Noir & Or' },
    { name: 'Douceur', primary: '#7b5b7a', accent: '#c3aed6', desc: 'Mauve & Lavande' },
    { name: 'Énergie', primary: '#2ec4b6', accent: '#ff6b6b', desc: 'Menthe & Corail' },
    { name: 'Crépuscule', primary: '#3d405b', accent: '#e07a5f', desc: 'Indigo & Terre' },
    { name: 'Vintage', primary: '#6b4c3a', accent: '#dab49d', desc: 'Brun & Beige' },
  ];

  // ── Google Fonts options ────────────────────────────────────
  const GOOGLE_FONTS = [
    { family: 'Outfit', category: 'Sans-serif', preview: 'Moderne & géométrique', pairing: 'Heading + Body' },
    { family: 'DM Sans', category: 'Sans-serif', preview: 'Lisible & épuré', pairing: 'Body' },
    { family: 'Inter', category: 'Sans-serif', preview: 'Polyvalent & lisible', pairing: 'Heading + Body' },
    { family: 'Poppins', category: 'Sans-serif', preview: 'Rond & chaleureux', pairing: 'Heading + Body' },
    { family: 'Playfair Display', category: 'Serif', preview: 'Élégant & éditorial', pairing: 'Heading' },
    { family: 'Lora', category: 'Serif', preview: 'Classique & raffiné', pairing: 'Body' },
    { family: 'Source Serif 4', category: 'Serif', preview: 'Presse & traditionnel', pairing: 'Heading + Body' },
    { family: 'Space Grotesk', category: 'Sans-serif', preview: 'Tech & futuriste', pairing: 'Heading' },
    { family: 'Manrope', category: 'Sans-serif', preview: 'Géométrique moderne', pairing: 'Heading + Body' },
    { family: 'JetBrains Mono', category: 'Monospace', preview: 'Code & rétro', pairing: 'Label' },
    { family: 'Bricolage Grotesque', category: 'Sans-serif', preview: 'Audacieux & créatif', pairing: 'Heading' },
    { family: 'Plus Jakarta Sans', category: 'Sans-serif', preview: 'Douceur moderne', pairing: 'Heading + Body' },
    { family: 'EB Garamond', category: 'Serif', preview: 'Littéraire & intemporel', pairing: 'Heading + Body' },
    { family: 'Crimson Pro', category: 'Serif', preview: 'Éditorial & chic', pairing: 'Body' },
    { family: 'Syne', category: 'Sans-serif', preview: 'Artistique & unique', pairing: 'Heading' },
  ];

  const parseVisiblePages = (): string[] => {
    if (initialContent?.pages_visibles) {
      try {
        const parsed = JSON.parse(initialContent.pages_visibles);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fall through */ }
    }
    return PAGE_KEYS.map((p) => p.key);
  };

  const parseNavOrder = (): string[] => {
    if (initialContent?.nav_order) {
      try {
        const parsed = JSON.parse(initialContent.nav_order);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* fall through */ }
    }
    return PAGE_KEYS.map((p) => p.key);
  };

  const parseCustomPages = (): CustomPageItem[] => {
    if (initialContent?.custom_pages) {
      try {
        const parsed = JSON.parse(initialContent.custom_pages);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* fall through */ }
    }
    return [];
  };

  const [navTitle, setNavTitle] = useState(initialContent?.titrenavmenudefaut || storeName || '');
  const [navDescription, setNavDescription] = useState(initialContent?.descriptionnavmenudefault || '');
  const [bannerImage, setBannerImage] = useState(initialContent?.imagebannierenavmenudefault || '');
  const [visiblePages, setVisiblePages] = useState<string[]>(parseVisiblePages);
  const [navOrder, setNavOrder] = useState<string[]>(parseNavOrder);
  const [customPages, setCustomPages] = useState<CustomPageItem[]>(parseCustomPages);
  const [primaryColor, setPrimaryColor] = useState(initialContent?.primary_color || '#0f172a');
  const [accentColor, setAccentColor] = useState(initialContent?.accent_color || '#f59e0b');
  const [fontFamily, setFontFamily] = useState(initialContent?.font_family || '');
  const [previewMode, setPreviewMode] = useState<'simulated' | 'iframe'>('simulated');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Handle drag end — reorder the navOrder array
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setNavOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Get ordered + filtered page list for display
  const orderedPages = navOrder
    .filter((key) => PAGE_KEYS.some((p) => p.key === key))
    .map((key) => PAGE_KEYS.find((p) => p.key === key)!);

  // Custom page form state
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');
  const [newCustomIcon, setNewCustomIcon] = useState('ri-link');
  const [newCustomExternal, setNewCustomExternal] = useState(true);

  const handleAddCustomPage = () => {
    if (!newCustomLabel.trim() || !newCustomUrl.trim()) return;
    const key = `custom_${Date.now()}`;
    setCustomPages((prev) => [
      ...prev,
      { key, label: newCustomLabel.trim(), url: newCustomUrl.trim(), icon: newCustomIcon, isExternal: newCustomExternal },
    ]);
    setNewCustomLabel('');
    setNewCustomUrl('');
    setNewCustomIcon('ri-link');
    setNewCustomExternal(true);
    setShowAddCustom(false);
    setIconPickerOpen(false);
  };

  const handleRemoveCustomPage = (key: string) => {
    setCustomPages((prev) => prev.filter((p) => p.key !== key));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadMediaFile(file, 'theme-banners');
      setBannerImage(url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setUploadError(null);
    try {
      const payload = {
        idtheme: themeId,
        idshop: commerceId,
        titrenavmenudefaut: navTitle.trim() || storeName,
        descriptionnavmenudefault: navDescription.trim(),
        imagebannierenavmenudefault: bannerImage,
        pages_visibles: JSON.stringify(visiblePages),
        nav_order: JSON.stringify(navOrder),
        custom_pages: JSON.stringify(customPages),
        primary_color: primaryColor,
        accent_color: accentColor,
        font_family: fontFamily || null,
      };

      if (initialContent?.id) {
        const { error } = await supabase
          .from('sitewebthemecontenu')
          .update(payload)
          .eq('id', initialContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sitewebthemecontenu')
          .insert(payload);
        if (error) throw error;
      }

      onSave();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background-50 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-background-200/70">
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground-950">
              <i className="ri-paint-brush-line mr-2 text-primary-500"></i>
              Personnaliser le thème
            </h3>
            <p className="text-xs text-foreground-500 mt-0.5">
              Modifiez le titre, les couleurs, l&apos;ordre des pages et ajoutez des liens personnalisés
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Edit form (3 cols) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Nav Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                Titre de la navigation
              </label>
              <input
                type="text"
                value={navTitle}
                onChange={(e) => setNavTitle(e.target.value)}
                placeholder={storeName || 'Nom de votre boutique'}
                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors"
              />
              <p className="text-xs text-foreground-400 mt-1">Affiché dans la barre de navigation et le footer</p>
            </div>

            {/* Nav Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                Description / Slogan
              </label>
              <textarea
                value={navDescription}
                onChange={(e) => setNavDescription(e.target.value)}
                placeholder="Une courte description de votre activité..."
                rows={2}
                maxLength={200}
                className="w-full px-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 transition-colors resize-none"
              />
              <p className="text-xs text-foreground-400 mt-1">{navDescription.length}/200 caractères</p>
            </div>

            {/* Banner Image */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-1.5">
                Image bannière / Logo
              </label>
              <div className="flex items-start gap-3">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-background-100 border border-background-200/70 flex-shrink-0 flex items-center justify-center">
                  {bannerImage ? (
                    <img
                      src={bannerImage}
                      alt="Bannière"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <i className="ri-image-line text-2xl text-foreground-300"></i>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImagePickerOpen(true)}
                      className="px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
                    >
                      <i className="ri-gallery-line mr-1"></i>
                      Bibliothèque
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <><i className="ri-loader-4-line animate-spin mr-1"></i>Upload...</>
                      ) : (
                        <><i className="ri-upload-cloud-line mr-1"></i>Uploader</>
                      )}
                    </button>
                    {bannerImage && (
                      <button
                        onClick={() => setBannerImage('')}
                        className="px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <i className="ri-delete-bin-line mr-1"></i>
                        Retirer
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {bannerImage && (
                    <input
                      type="text"
                      value={bannerImage}
                      onChange={(e) => setBannerImage(e.target.value)}
                      placeholder="Ou collez une URL d'image"
                      className="w-full px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-xs text-foreground-600 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
                    />
                  )}
                  <p className="text-xs text-foreground-400">Format recommandé : carré (1:1), max 1 Mo</p>
                </div>
              </div>
            </div>

            {/* ── Color Customization ── */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">
                <i className="ri-palette-line mr-1"></i>
                Couleurs du thème
              </label>
              <p className="text-xs text-foreground-400 mb-3">
                Personnalisez les couleurs principales de votre site
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Primary Color */}
                <div className="p-4 rounded-xl bg-background-50 border border-background-200/70">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-background-300/60 flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    ></div>
                    <div>
                      <p className="text-sm font-semibold text-foreground-800">Principale</p>
                      <p className="text-[10px] text-foreground-500">Boutons, liens, accent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-background-200/70 cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-xs font-mono text-foreground-700 focus:outline-none focus:border-primary-300"
                    />
                    <button
                      onClick={() => setPrimaryColor('#0f172a')}
                      className="px-2 py-1 rounded text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="p-4 rounded-xl bg-background-50 border border-background-200/70">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-background-300/60 flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    ></div>
                    <div>
                      <p className="text-sm font-semibold text-foreground-800">Accent</p>
                      <p className="text-[10px] text-foreground-500">Badges, highlights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-background-200/70 cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background-50 border border-background-200/70 rounded-lg text-xs font-mono text-foreground-700 focus:outline-none focus:border-primary-300"
                    />
                    <button
                      onClick={() => setAccentColor('#f59e0b')}
                      className="px-2 py-1 rounded text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Predefined Color Palettes ── */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">
                <i className="ri-pantone-line mr-1"></i>
                Palettes prédéfinies
              </label>
              <p className="text-xs text-foreground-400 mb-3">
                Cliquez sur une palette pour l&apos;appliquer instantanément
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    onClick={() => {
                      setPrimaryColor(palette.primary);
                      setAccentColor(palette.accent);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      primaryColor === palette.primary && accentColor === palette.accent
                        ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-200/50'
                        : 'border-background-200/70 bg-background-50 hover:border-background-300/60 hover:bg-background-100'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-6 h-6 rounded-md flex-shrink-0 border border-background-300/60"
                        style={{ backgroundColor: palette.primary }}
                      ></div>
                      <div
                        className="w-6 h-6 rounded-md flex-shrink-0 border border-background-300/60"
                        style={{ backgroundColor: palette.accent }}
                      ></div>
                    </div>
                    <p className="text-xs font-medium text-foreground-800">{palette.name}</p>
                    <p className="text-[10px] text-foreground-500 mt-0.5">{palette.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Google Fonts Selector ── */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">
                <i className="ri-font-size mr-1"></i>
                Typographie
              </label>
              <p className="text-xs text-foreground-400 mb-3">
                Choisissez une police Google Fonts pour votre site
              </p>

              {/* Current selection preview */}
              {fontFamily && (
                <div className="mb-3 p-3 rounded-lg bg-primary-50 border border-primary-200/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-800">{fontFamily}</p>
                    <p className="text-[10px] text-primary-600">Police sélectionnée</p>
                  </div>
                  <button
                    onClick={() => setFontFamily('')}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-line mr-1"></i>
                    Retirer
                  </button>
                </div>
              )}

              {/* Font grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {GOOGLE_FONTS.map((font) => {
                  const isSelected = fontFamily === font.family;
                  // Dynamically load the font for preview
                  const fontUrl = (() => {
                    const map: Record<string, string> = {
                      'Outfit': 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap',
                      'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap',
                      'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
                      'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
                      'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
                      'Lora': 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
                      'Source Serif 4': 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap',
                      'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',
                      'Manrope': 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap',
                      'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap',
                      'Bricolage Grotesque': 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&display=swap',
                      'Plus Jakarta Sans': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap',
                      'EB Garamond': 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap',
                      'Crimson Pro': 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap',
                      'Syne': 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&display=swap',
                    };
                    return map[font.family] || '';
                  })();
                  // Inject font for preview
                  if (fontUrl) {
                    const linkId = `font-preview-${font.family.replace(/\s+/g, '-')}`;
                    if (!document.getElementById(linkId)) {
                      const link = document.createElement('link');
                      link.id = linkId;
                      link.rel = 'stylesheet';
                      link.href = fontUrl;
                      document.head.appendChild(link);
                    }
                  }
                  return (
                    <button
                      key={font.family}
                      onClick={() => setFontFamily(font.family)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-200/50'
                          : 'border-background-200/70 bg-background-50 hover:border-background-300/60 hover:bg-background-100'
                      }`}
                      style={{ fontFamily: `'${font.family}', sans-serif` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground-900">{font.family}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          font.category === 'Serif' ? 'bg-accent-100 text-accent-700' :
                          font.category === 'Monospace' ? 'bg-secondary-100 text-secondary-700' :
                          'bg-background-100 text-foreground-500'
                        }`}>
                          {font.category}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-500 truncate">{font.preview}</p>
                      <p className="text-[10px] text-foreground-400 mt-0.5">{font.pairing}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-foreground-400 mt-2 flex items-center gap-1">
                <i className="ri-information-line"></i>
                Laissez vide pour utiliser la police par défaut (Outfit / DM Sans)
              </p>
            </div>

            {/* ── Page order (Drag & Drop) + Visibility ── */}
            <div>
              <label className="block text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">
                <i className="ri-menu-line mr-1"></i>
                Ordre et visibilité des pages
              </label>
              <p className="text-xs text-foreground-400 mb-3">
                Glissez-déposez pour réorganiser. Décochez pour masquer une page.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedPages.map((p) => p.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {orderedPages.map((page) => {
                      const checked = visiblePages.includes(page.key);
                      return (
                        <SortablePageItem
                          key={page.key}
                          page={page}
                          enabled={true}
                          checked={checked}
                          onToggle={() => {
                            if (checked) {
                              if (visiblePages.length <= 1) return;
                              setVisiblePages(visiblePages.filter((k) => k !== page.key));
                            } else {
                              setVisiblePages([...visiblePages, page.key]);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              {visiblePages.length <= 1 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <i className="ri-information-line"></i>
                  Au moins une page doit rester visible
                </p>
              )}
            </div>

            {/* ── Custom Pages ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                  <i className="ri-add-circle-line mr-1"></i>
                  Pages personnalisées
                </label>
                {!showAddCustom && (
                  <button
                    onClick={() => setShowAddCustom(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <i className="ri-add-line mr-1"></i>
                    Ajouter un lien
                  </button>
                )}
              </div>
              <p className="text-xs text-foreground-400 mb-3">
                Ajoutez des liens externes ou des pages statiques à votre navigation
              </p>

              {/* Add form */}
              {showAddCustom && (
                <div className="p-4 rounded-xl bg-background-50 border border-background-200/70 space-y-3 mb-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-foreground-500 uppercase font-semibold">Label</label>
                      <input
                        type="text"
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        placeholder="Ex: Notre blog"
                        className="w-full px-3 py-2 mt-0.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-foreground-500 uppercase font-semibold">Icône</label>
                      <div className="relative">
                        <button
                          onClick={() => setIconPickerOpen(!iconPickerOpen)}
                          className="w-full px-3 py-2 mt-0.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-700 flex items-center justify-between cursor-pointer"
                        >
                          <i className={`${newCustomIcon} text-base`}></i>
                          <i className="ri-arrow-down-s-line text-xs text-foreground-400"></i>
                        </button>
                        {iconPickerOpen && (
                          <div className="absolute top-full mt-1 left-0 z-20 w-48 p-2 bg-background-50 border border-background-200/70 rounded-lg shadow-lg grid grid-cols-5 gap-1 max-h-32 overflow-y-auto">
                            {AVAILABLE_ICONS.map((icon) => (
                              <button
                                key={icon}
                                onClick={() => {
                                  setNewCustomIcon(icon);
                                  setIconPickerOpen(false);
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ${
                                  newCustomIcon === icon
                                    ? 'bg-primary-100 text-primary-600'
                                    : 'text-foreground-500 hover:bg-background-100'
                                }`}
                              >
                                <i className={`${icon} text-sm`}></i>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-foreground-500 uppercase font-semibold">URL</label>
                    <input
                      type="text"
                      value={newCustomUrl}
                      onChange={(e) => setNewCustomUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 mt-0.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCustomExternal}
                        onChange={(e) => setNewCustomExternal(e.target.checked)}
                        className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400"
                      />
                      <span className="text-sm text-foreground-700">Lien externe (nouvel onglet)</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomPage}
                      disabled={!newCustomLabel.trim() || !newCustomUrl.trim()}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-primary-500 text-background-50 hover:bg-primary-600 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <i className="ri-check-line mr-1"></i>
                      Ajouter
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCustom(false);
                        setIconPickerOpen(false);
                        setNewCustomLabel('');
                        setNewCustomUrl('');
                      }}
                      className="px-4 py-2 rounded-full text-xs font-medium bg-background-100 text-foreground-600 hover:bg-background-200/70 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* List of existing custom pages */}
              {customPages.length > 0 && (
                <div className="space-y-1.5">
                  {customPages.map((cp) => (
                    <div
                      key={cp.key}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary-50 border border-secondary-200/50"
                    >
                      <i className={`${cp.icon} text-sm text-secondary-600 flex-shrink-0`}></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground-700 truncate">{cp.label}</p>
                        <p className="text-[10px] text-foreground-400 truncate">
                          {cp.isExternal ? (
                            <span className="flex items-center gap-1"><i className="ri-external-link-line"></i>{cp.url}</span>
                          ) : (
                            cp.url
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomPage(cp.key)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors flex-shrink-0"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error display */}
            {uploadError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200/60 rounded-lg text-xs text-red-600">
                <i className="ri-error-warning-line"></i>
                {uploadError}
              </div>
            )}
          </div>

          {/* Right: Live preview (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                <i className="ri-eye-line mr-1"></i>Aperçu en direct
              </label>
              {/* Preview mode toggle */}
              <div className="flex items-center bg-background-100 rounded-full p-0.5">
                <button
                  onClick={() => setPreviewMode('simulated')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    previewMode === 'simulated'
                      ? 'bg-background-50 text-foreground-800 shadow-sm'
                      : 'text-foreground-400 hover:text-foreground-600'
                  }`}
                >
                  <i className="ri-smartphone-line mr-1"></i>
                  Simulé
                </button>
                <button
                  onClick={() => setPreviewMode('iframe')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    previewMode === 'iframe'
                      ? 'bg-background-50 text-foreground-800 shadow-sm'
                      : 'text-foreground-400 hover:text-foreground-600'
                  }`}
                >
                  <i className="ri-global-line mr-1"></i>
                  Site réel
                </button>
              </div>
            </div>

            {/* ── Iframe preview ── */}
            {previewMode === 'iframe' ? (
              <div className="rounded-xl border border-background-200/70 overflow-hidden">
                <div className="px-4 py-2 bg-background-100/80 flex items-center gap-2.5 border-b border-background-200/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-[10px] text-foreground-400 ml-2 truncate">
                    {userName ? `${userName}.zifek.fr` : 'Votre site public'}
                  </span>
                  <a
                    href={userName ? `https://${userName}.zifek.fr` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[10px] text-primary-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer whitespace-nowrap no-underline"
                  >
                    <i className="ri-external-link-line"></i>
                    Ouvrir
                  </a>
                </div>
                <div className="bg-background-50" style={{ height: '420px' }}>
                  {userName ? (
                    <iframe
                      src={`https://${userName}.zifek.fr`}
                      title="Aperçu du site"
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-foreground-400">
                      <i className="ri-global-line text-3xl mb-2"></i>
                      <p className="text-xs">URL du site non disponible</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <div className="rounded-xl border border-background-200/70 overflow-hidden">
              <div className="px-4 py-2 bg-background-100/80 flex items-center gap-2.5 border-b border-background-200/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <span className="text-[10px] text-foreground-400 ml-2">Navigateur</span>
              </div>
              <div className="p-3 bg-background-50" style={{ '--primary-500': primaryColor, '--accent-500': accentColor } as React.CSSProperties}>
                <div className="flex items-center gap-2.5 pb-3 border-b border-background-200/50">
                  {bannerImage ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-background-200/70">
                      <img src={bannerImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="text-background-50 text-sm font-bold font-heading">
                        {(navTitle || storeName || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold font-heading text-foreground-900 truncate">
                      {navTitle || storeName || 'Votre boutique'}
                    </p>
                    {navDescription && (
                      <p className="text-[11px] text-foreground-500 truncate">{navDescription}</p>
                    )}
                  </div>
                  {/* Nav links preview */}
                  <div className="flex gap-1 flex-wrap justify-end">
                    {navOrder
                      .filter((key) => visiblePages.includes(key) && PAGE_KEYS.some((p) => p.key === key))
                      .map((key) => {
                        const page = PAGE_KEYS.find((p) => p.key === key)!;
                        return (
                          <span
                            key={key}
                            className="px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap"
                            style={{ backgroundColor: primaryColor + '1a', color: primaryColor }}
                          >
                            {page.label}
                          </span>
                        );
                      })}
                    {customPages.map((cp) => (
                      <span
                        key={cp.key}
                        className="px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[10px] whitespace-nowrap flex items-center gap-0.5"
                      >
                        {cp.label}
                        <i className="ri-external-link-line text-[8px]"></i>
                      </span>
                    ))}
                  </div>
                </div>
                {/* Content area preview */}
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-3/4 bg-background-100 rounded"></div>
                  <div className="h-3 w-1/2 bg-background-100 rounded"></div>
                  <div className="mt-4 h-20 bg-background-100 rounded-lg"></div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div
                      className="h-12 rounded"
                      style={{ backgroundColor: primaryColor + '1a' }}
                    ></div>
                    <div
                      className="h-12 rounded"
                      style={{ backgroundColor: accentColor + '1a' }}
                    ></div>
                    <div className="h-12 bg-background-100 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Color swatches summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200/70">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-background-300/60" style={{ backgroundColor: primaryColor }}></div>
                <span className="text-[10px] text-foreground-500">Principale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-background-300/60" style={{ backgroundColor: accentColor }}></div>
                <span className="text-[10px] text-foreground-500">Accent</span>
              </div>
              <div className="ml-auto text-[10px] text-foreground-400">
                {visiblePages.length + customPages.length} liens dans la navbar
              </div>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-accent-50 border border-accent-200/50">
              <p className="text-xs text-accent-700 flex items-start gap-1.5">
                <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
                <span>Ces modifications s&apos;appliquent immédiatement sur votre site public ({storeName || 'votre boutique'}).</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-background-200/70">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-all disabled:opacity-60"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin"></i> Sauvegarde...</>
            ) : (
              <><i className="ri-check-line"></i> Enregistrer les modifications</>
            )}
          </button>
        </div>

        {/* Image Picker Modal */}
        <ImagePicker
          isOpen={imagePickerOpen}
          onClose={() => setImagePickerOpen(false)}
          onSelect={(url) => {
            setBannerImage(url);
            setImagePickerOpen(false);
          }}
          selectedUrl={bannerImage}
        />
      </div>
    </div>
  );
}

interface ThemePreviewModalProps {
  theme: ThemeItem;
  isActive: boolean;
  isFree: boolean;
  actionLoading: number | null;
  contenu: ThemeContenu | null;
  parametre: ThemeParamettre | null;
  onApply: () => void;
  onClose: () => void;
}

function ThemePreviewModal({ theme, isActive, isFree, actionLoading, contenu, parametre, onApply, onClose }: ThemePreviewModalProps) {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      business: 'Business', ecommerce: 'E-commerce', portfolio: 'Portfolio',
      blog: 'Blog', restaurant: 'Restaurant', tech: 'Tech',
    };
    return labels[type] || type;
  };

  const previewImage = theme.imagecouverture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background-50 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-64 bg-background-100 overflow-hidden rounded-t-xl">
          <img
            src={previewImage}
            alt={theme.titre}
            className="w-full h-full object-cover object-top"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background-50/90 backdrop-blur-sm flex items-center justify-center text-foreground-700 hover:text-foreground-950 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-50/90 text-foreground-700 backdrop-blur-sm">
              {getTypeLabel(theme.typetheme)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-50/90 text-foreground-600 backdrop-blur-sm">
              v{theme.version}
            </span>
            {isActive && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent-100 text-accent-700 backdrop-blur-sm">
                Thème actif
              </span>
            )}
          </div>
          {!isFree && (
            <div className="absolute top-4 right-20">
              <span className="px-3 py-1 rounded-md text-sm font-bold bg-primary-500 text-background-50 shadow-sm">
                {parseInt(theme.prix).toLocaleString()} MAD
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-50/80 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="p-6 -mt-4 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold font-heading text-foreground-950">{theme.titre}</h3>
              <p className="text-xs text-foreground-500 mt-0.5">{getTypeLabel(theme.typetheme)} · v{theme.version}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-100 text-xs text-foreground-600">
              <i className="ri-information-line"></i>
              {isFree ? 'Gratuit' : `${parseInt(theme.prix).toLocaleString()} MAD`}
            </div>
          </div>

          {/* Description */}
          {theme.description && !isCssString(theme.description) && (
            <div className="mb-5 p-4 rounded-lg bg-background-50 border border-background-200/70">
              <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-foreground-700 leading-relaxed">{theme.description}</p>
            </div>
          )}

          {/* Theme Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Version</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">v{theme.version}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Type</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">{getTypeLabel(theme.typetheme)}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Auteur</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">ID #{theme.idauteur}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Prix</p>
              <p className="text-sm font-semibold text-foreground-800 mt-0.5">{isFree ? 'Gratuit' : `${parseInt(theme.prix).toLocaleString()} MAD`}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Mode Dev</p>
              <p className="text-sm font-semibold mt-0.5">
                {theme.modedev === 1 ? (
                  <span className="text-accent-700">Activé</span>
                ) : (
                  <span className="text-foreground-500">Désactivé</span>
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background-50 border border-background-200/70">
              <p className="text-xs text-foreground-500">Statut</p>
              <p className="text-sm font-semibold mt-0.5">
                {isActive ? (
                  <span className="text-accent-700">Thème actif</span>
                ) : (
                  <span className="text-foreground-500">Non appliqué</span>
                )}
              </p>
            </div>
          </div>

          {/* Navigation Menu Content (from sitewebthemecontenu) */}
          {contenu && (
            <div className="mb-5 p-4 rounded-lg bg-background-50 border border-background-200/70">
              <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Contenu du menu de navigation</h4>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-xs text-foreground-500 mb-1">Titre du menu</p>
                  <p className="text-sm font-medium text-foreground-800">{contenu.titrenavmenudefaut}</p>
                  <p className="text-xs text-foreground-500 mt-3 mb-1">Description</p>
                  <p className="text-sm text-foreground-700">{contenu.descriptionnavmenudefault}</p>
                </div>
                {contenu.imagebannierenavmenudefault && (
                  <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-background-100">
                    <img
                      src={contenu.imagebannierenavmenudefault}
                      alt="Bannière navigation"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Parameters (from sitewebthemeparamettre) */}
          {parametre && (
            <div className="mb-5 p-4 rounded-lg bg-background-50 border border-background-200/70">
              <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Paramètres du thème</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-foreground-500 mb-1">Bannière</p>
                  <p className="text-sm text-foreground-700 mb-2">{parametre.descriptionbanniere}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {parametre.imageaboutus && (
                    <div className="w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-background-100">
                      <img
                        src={parametre.imageaboutus}
                        alt="À propos"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-foreground-500 mb-1">Bloc découverte</p>
                    <p className="text-sm font-medium text-foreground-800">{parametre.titreblocdecouvert}</p>
                    <p className="text-sm text-foreground-700 mt-1">{parametre.descriptionblocdecouvert}</p>
                  </div>
                </div>
                {parametre.fichierblocdecouvert && (
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-background-100">
                    <img
                      src={parametre.fichierblocdecouvert}
                      alt="Bloc découverte"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-colors"
            >
              Fermer
            </button>
            {isActive ? (
              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium bg-accent-100 text-accent-700 cursor-default">
                <i className="ri-check-line"></i>
                Thème actif
              </div>
            ) : isFree ? (
              <button
                onClick={onApply}
                disabled={actionLoading === theme.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-secondary-500 text-background-50 hover:bg-secondary-600 transition-all"
              >
                {actionLoading === theme.id ? (
                  <i className="ri-loader-4-line animate-spin"></i>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Appliquer (Gratuit)
                  </>
                )}
              </button>
            ) : (
              <button
                disabled={actionLoading === theme.id}
                onClick={() => {
                  onClose();
                  alert(`Achat du thème "${theme.titre}" — ${theme.prix} MAD. Le paiement sera disponible prochainement.`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-all"
              >
                {actionLoading === theme.id ? (
                  <i className="ri-loader-4-line animate-spin"></i>
                ) : (
                  <>
                    <i className="ri-shopping-cart-2-line"></i>
                    Acheter — {parseInt(theme.prix).toLocaleString()} MAD
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeStorePage() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [activeTheme, setActiveTheme] = useState<ActiveTheme | null>(null);
  const [contenus, setContenus] = useState<Record<number, ThemeContenu>>({});
  const [contenusTemplate, setContenusTemplate] = useState<Record<number, ThemeContenu>>({});
  const [parametres, setParametres] = useState<Record<number, ThemeParamettre>>({});
  const [parametresTemplate, setParametresTemplate] = useState<Record<number, ThemeParamettre>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ThemeItem | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const commerceId = user?.id || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [themesRes, activeRes, contenuRes, parametreRes, templateContenuRes, templateParamRes] = await Promise.all([
        supabase.from('sitewebtheme').select('*').eq('active', 1),
        supabase.from('sitewebthemeactuelle').select('*').eq('idcommerce', commerceId).maybeSingle(),
        supabase.from('sitewebthemecontenu').select('*').eq('idshop', commerceId),
        supabase.from('sitewebthemeparamettre').select('*').eq('idcommerce', commerceId),
        supabase.from('sitewebthemecontenu').select('*').eq('idshop', 1),
        supabase.from('sitewebthemeparamettre').select('*').eq('idcommerce', 1),
      ]);

      if (themesRes.error) throw themesRes.error;
      if (activeRes.error) throw activeRes.error;
      if (contenuRes.error) throw contenuRes.error;
      if (parametreRes.error) throw parametreRes.error;
      if (templateContenuRes.error) throw templateContenuRes.error;
      if (templateParamRes.error) throw templateParamRes.error;

      setThemes(themesRes.data || []);
      setActiveTheme(activeRes.data || null);

      // Index merchant's own contenu and parametre by idtheme
      const contenuMap: Record<number, ThemeContenu> = {};
      (contenuRes.data || []).forEach((c: ThemeContenu) => {
        contenuMap[c.idtheme] = c;
      });
      setContenus(contenuMap);

      const parametreMap: Record<number, ThemeParamettre> = {};
      (parametreRes.data || []).forEach((p: ThemeParamettre) => {
        parametreMap[p.idtheme] = p;
      });
      setParametres(parametreMap);

      // Index template defaults as fallback for preview
      const templateContMap: Record<number, ThemeContenu> = {};
      (templateContenuRes.data || []).forEach((c: ThemeContenu) => {
        templateContMap[c.idtheme] = c;
      });
      setContenusTemplate(templateContMap);

      const templateParamMap: Record<number, ThemeParamettre> = {};
      (templateParamRes.data || []).forEach((p: ThemeParamettre) => {
        templateParamMap[p.idtheme] = p;
      });
      setParametresTemplate(templateParamMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [commerceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleApplyTheme = async (theme: ThemeItem) => {
    const isFree = theme.prix === '0';

    if (!isFree) {
      alert(`Achat du thème "${theme.titre}" — ${theme.prix} MAD. Le paiement sera disponible prochainement.`);
      return;
    }

    setActionLoading(theme.id);
    try {
      if (activeTheme) {
        const { error: updateError } = await supabase
          .from('sitewebthemeactuelle')
          .update({
            idtheme: theme.id,
            nomtheme: theme.titre,
            prix: theme.prix,
            datedactivation: new Date().toISOString(),
            status: 'active',
          })
          .eq('id', activeTheme.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sitewebthemeactuelle')
          .insert({
            idtheme: theme.id,
            nomtheme: theme.titre,
            idcommerce: commerceId,
            datedactivation: new Date().toISOString(),
            prix: theme.prix,
            status: 'active',
          });

        if (insertError) throw insertError;
      }

      // Copy contenu for this commerce if not exists
      const { data: existingContenu } = await supabase
        .from('sitewebthemecontenu')
        .select('id')
        .eq('idtheme', theme.id)
        .eq('idshop', commerceId)
        .maybeSingle();

      if (!existingContenu) {
        const { data: templateContenu } = await supabase
          .from('sitewebthemecontenu')
          .select('*')
          .eq('idtheme', theme.id)
          .eq('idshop', 1)
          .limit(1)
          .maybeSingle();

        if (templateContenu) {
          await supabase.from('sitewebthemecontenu').insert({
            idtheme: theme.id,
            idshop: commerceId,
            titrenavmenudefaut: (templateContenu as ThemeContenu).titrenavmenudefaut,
            descriptionnavmenudefault: (templateContenu as ThemeContenu).descriptionnavmenudefault,
            imagebannierenavmenudefault: (templateContenu as ThemeContenu).imagebannierenavmenudefault,
            pages_visibles: (templateContenu as ThemeContenu).pages_visibles || null,
            nav_order: (templateContenu as ThemeContenu).nav_order || null,
            custom_pages: (templateContenu as ThemeContenu).custom_pages || null,
            primary_color: (templateContenu as ThemeContenu).primary_color || null,
            accent_color: (templateContenu as ThemeContenu).accent_color || null,
            font_family: (templateContenu as ThemeContenu).font_family || null,
          });
        }
      }

      // Copy paramettre for this commerce if not exists
      const { data: existingParam } = await supabase
        .from('sitewebthemeparamettre')
        .select('id')
        .eq('idtheme', theme.id)
        .eq('idcommerce', commerceId)
        .maybeSingle();

      if (!existingParam) {
        const { data: templateParam } = await supabase
          .from('sitewebthemeparamettre')
          .select('*')
          .eq('idtheme', theme.id)
          .eq('idcommerce', 1)
          .limit(1)
          .maybeSingle();

        if (templateParam) {
          await supabase.from('sitewebthemeparamettre').insert({
            idtheme: theme.id,
            idcommerce: commerceId,
            titre: (templateParam as ThemeParamettre).titre,
            descriptionbanniere: (templateParam as ThemeParamettre).descriptionbanniere,
            imageaboutus: (templateParam as ThemeParamettre).imageaboutus,
            titreblocdecouvert: (templateParam as ThemeParamettre).titreblocdecouvert,
            descriptionblocdecouvert: (templateParam as ThemeParamettre).descriptionblocdecouvert,
            fichierblocdecouvert: (templateParam as ThemeParamettre).fichierblocdecouvert,
          });
        }
      }

      setActiveTheme({
        id: activeTheme?.id || 0,
        idtheme: theme.id,
        nomtheme: theme.titre,
        idcommerce: commerceId,
        prix: theme.prix,
        status: 'active',
        datedactivation: new Date().toISOString(),
      });

      setPreviewTheme(null);
      showSuccess(`Thème "${theme.titre}" appliqué avec succès !`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'application du thème');
    } finally {
      setActionLoading(null);
    }
  };

  const isActive = (themeId: number) => activeTheme?.idtheme === themeId;
  const isFree = (theme: ThemeItem) => theme.prix === '0';

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      business: 'Business', ecommerce: 'E-commerce', portfolio: 'Portfolio',
      blog: 'Blog', restaurant: 'Restaurant', tech: 'Tech',
    };
    return labels[type] || type;
  };

  const filteredThemes = themes.filter((theme) => {
    const matchSearch = theme.titre.toLowerCase().includes(searchTerm.toLowerCase())
      || theme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || theme.typetheme === filterType;
    return matchSearch && matchType;
  });

  // Categories directly from DB data (unique typetheme values)
  const typeOptions = Array.from(new Set(themes.map((t) => t.typetheme)));

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">ThemeStore</h2>
          <p className="text-sm text-foreground-500 mt-1">
            {activeTheme
              ? `Thème actif : ${activeTheme.nomtheme}`
              : 'Choisissez un thème pour votre site'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-100 rounded-full text-sm text-accent-700 font-medium">
            <i className="ri-palette-line"></i>
            <span className="whitespace-nowrap">{themes.length} thèmes disponibles</span>
          </div>
          {activeTheme && (
            <button
              onClick={() => setCustomizerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-colors"
            >
              <i className="ri-paint-brush-line"></i>
              Personnaliser
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-accent-100 text-accent-700 rounded-lg text-sm font-medium animate-pulse">
          <i className="ri-checkbox-circle-line"></i>
          {successMsg}
        </div>
      )}

      {/* Filters - categories from DB */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            placeholder="Rechercher un thème..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filterType === 'all'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
            }`}
          >
            Tous
          </button>
          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                filterType === type
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100'
              }`}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
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
          <button onClick={fetchData} className="px-4 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : filteredThemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background-50 border border-background-200/70 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
            <i className="ri-palette-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-foreground-600">Aucun thème trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredThemes.map((theme) => {
            const free = isFree(theme);
            const active = isActive(theme.id);

            return (
              <div
                key={theme.id}
                className={`bg-background-50 border rounded-lg overflow-hidden transition-all flex flex-col ${
                  active
                    ? 'border-accent-300 ring-2 ring-accent-200/50'
                    : 'border-background-200/70 hover:border-background-300/60'
                }`}
              >
                {/* Preview image from DB */}
                <div className="relative h-48 bg-background-100 overflow-hidden">
                  <img
                    src={theme.imagecouverture}
                    alt={theme.titre}
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[70%]">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-background-50/90 text-foreground-700 backdrop-blur-sm">
                      {getTypeLabel(theme.typetheme)}
                    </span>
                    {active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-100 text-accent-700 backdrop-blur-sm">
                        Actif
                      </span>
                    )}
                  </div>
                  {!free && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-primary-500 text-background-50 shadow-sm">
                        {parseInt(theme.prix).toLocaleString()} MAD
                      </span>
                    </div>
                  )}
                  {/* Preview overlay */}
                  <button
                    onClick={() => setPreviewTheme(theme)}
                    className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center transition-all cursor-pointer group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 px-4 py-2 rounded-full bg-background-50/90 text-foreground-800 text-xs font-medium backdrop-blur-sm transition-all">
                      <i className="ri-eye-line mr-1"></i>
                      Voir aperçu
                    </span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-foreground-900 mb-1">{theme.titre}</h3>
                  <p className="text-xs text-foreground-500 leading-relaxed mb-4 flex-1 line-clamp-2">
                    {safeDescription(theme.description)}
                  </p>

                  {/* Type chip */}
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-background-100 text-foreground-500">
                      <i className="ri-price-tag-3-line"></i>
                      {getTypeLabel(theme.typetheme)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setPreviewTheme(theme)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer bg-background-100 text-foreground-600 hover:bg-background-200/70 transition-all"
                    >
                      <i className="ri-eye-line"></i>
                      Aperçu
                    </button>
                    {active ? (
                      <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-accent-100 text-accent-700 cursor-default">
                        <i className="ri-check-line"></i>
                        Thème actif
                      </div>
                    ) : free ? (
                      <button
                        onClick={() => handleApplyTheme(theme)}
                        disabled={actionLoading === theme.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-secondary-500 text-background-50 hover:bg-secondary-600 transition-all"
                      >
                        {actionLoading === theme.id ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : (
                          <>
                            <i className="ri-check-line"></i>
                            Gratuit
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading === theme.id}
                        onClick={() => handleApplyTheme(theme)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-primary-500 text-background-50 hover:bg-primary-600 transition-all"
                      >
                        {actionLoading === theme.id ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : (
                          <>
                            <i className="ri-shopping-cart-2-line"></i>
                            {parseInt(theme.prix).toLocaleString()} MAD
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal with enriched DB data */}
      {previewTheme && (
        <ThemePreviewModal
          theme={previewTheme}
          isActive={isActive(previewTheme.id)}
          isFree={isFree(previewTheme)}
          actionLoading={actionLoading}
          contenu={contenus[previewTheme.id] || contenusTemplate[previewTheme.id] || null}
          parametre={parametres[previewTheme.id] || parametresTemplate[previewTheme.id] || null}
          onApply={() => handleApplyTheme(previewTheme)}
          onClose={() => setPreviewTheme(null)}
        />
      )}

      {/* Customizer Modal */}
      {customizerOpen && activeTheme && (
        <ThemeCustomizerModal
          themeId={activeTheme.idtheme}
          commerceId={commerceId}
          storeName={user?.nomcommerce || user?.name || ''}
          userName={user?.user_name || ''}
          initialContent={activeTheme ? (contenus[activeTheme.idtheme] || null) : null}
          onSave={() => {
            fetchData();
            setCustomizerOpen(false);
            showSuccess('Thème personnalisé avec succès !');
          }}
          onClose={() => setCustomizerOpen(false)}
        />
      )}
    </div>
  );
}