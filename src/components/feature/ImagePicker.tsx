import { useState, useMemo } from 'react';
import imageCatalog, { type ImageItem, type ImageCategory } from '@/data/imageCatalog';

interface ImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  selectedUrl: string | null;
}

type ColorKey = 'amber' | 'teal' | 'rose' | 'pink' | 'red' | 'green' | 'orange' | 'violet' | 'cyan' | 'slate' | 'emerald';
type AudienceKey = 'all' | 'homme' | 'femme' | 'enfant' | 'mix' | 'bebe';

const colorMap: Record<ColorKey, { bg: string; text: string; border: string; tab: string; marker: string }> = {
  amber:  { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200/60', tab: 'bg-amber-50 text-amber-700', marker: 'bg-amber-400' },
  teal:   { bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-200/60', tab: 'bg-teal-50 text-teal-700', marker: 'bg-teal-400' },
  rose:   { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200/60', tab: 'bg-rose-50 text-rose-700', marker: 'bg-rose-400' },
  pink:   { bg: 'bg-pink-50', text: 'text-pink-500', border: 'border-pink-200/60', tab: 'bg-pink-50 text-pink-700', marker: 'bg-pink-400' },
  red:    { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200/60', tab: 'bg-red-50 text-red-700', marker: 'bg-red-400' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200/60', tab: 'bg-emerald-50 text-emerald-700', marker: 'bg-emerald-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200/60', tab: 'bg-orange-50 text-orange-700', marker: 'bg-orange-400' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-500', border: 'border-violet-200/60', tab: 'bg-violet-50 text-violet-700', marker: 'bg-violet-400' },
  cyan:   { bg: 'bg-cyan-50', text: 'text-cyan-500', border: 'border-cyan-200/60', tab: 'bg-cyan-50 text-cyan-700', marker: 'bg-cyan-400' },
  slate:  { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/60', tab: 'bg-slate-50 text-slate-700', marker: 'bg-slate-400' },
  emerald:{ bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200/60', tab: 'bg-emerald-50 text-emerald-700', marker: 'bg-emerald-400' },
};

const audienceConfig: { key: AudienceKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tous', icon: 'ri-global-line' },
  { key: 'homme', label: 'Homme', icon: 'ri-men-line' },
  { key: 'femme', label: 'Femme', icon: 'ri-women-line' },
  { key: 'enfant', label: 'Enfant', icon: 'ri-user-smile-line' },
  { key: 'mix', label: 'Mix', icon: 'ri-group-line' },
  { key: 'bebe', label: 'Bébé', icon: 'ri-user-heart-line' },
];

interface FlatImage extends ImageItem {
  categoryColor: ColorKey;
  categoryName: string;
}

const flatImages: FlatImage[] = imageCatalog.flatMap((cat) =>
  cat.images.map((img) => ({
    ...img,
    categoryColor: cat.color as ColorKey,
    categoryName: cat.name,
  }))
);

const IMAGES_PER_LOAD = 24;

export default function ImagePicker({ isOpen, onClose, onSelect, selectedUrl }: ImagePickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(imageCatalog[0]?.name || '');
  const [activeAudience, setActiveAudience] = useState<AudienceKey>('all');
  const [visibleCount, setVisibleCount] = useState(IMAGES_PER_LOAD);

  const activeCat = useMemo(() => imageCatalog.find((c) => c.name === activeCategory) as ImageCategory | undefined, [activeCategory]);

  const activeCatColor = useMemo(() => colorMap[(activeCat?.color as ColorKey) || 'amber'], [activeCat]);

  const filteredImages = useMemo((): FlatImage[] => {
    let results = flatImages;

    if (!search.trim()) {
      results = results.filter((i) => i.categoryName === activeCategory);
    } else {
      const q = search.toLowerCase();
      results = results.filter(
        (img) =>
          img.name.toLowerCase().includes(q) ||
          img.keywords.some((k) => k.includes(q)) ||
          img.categoryName.toLowerCase().includes(q)
      );
    }

    if (activeAudience !== 'all') {
      results = results.filter((img) => img.audience === activeAudience);
    }

    return results;
  }, [search, activeCategory, activeAudience]);

  const visibleImages = useMemo(() => filteredImages.slice(0, visibleCount), [filteredImages, visibleCount]);
  const hasMore = visibleCount < filteredImages.length;

  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + IMAGES_PER_LOAD);
  };

  const getColorForImage = (img: FlatImage) => colorMap[img.categoryColor] || colorMap.amber;

  const getAudienceIcon = (audience?: string): string => {
    switch (audience) {
      case 'homme': return 'ri-men-line';
      case 'femme': return 'ri-women-line';
      case 'enfant': return 'ri-user-smile-line';
      case 'mix': return 'ri-group-line';
      case 'bebe': return 'ri-user-heart-line';
      default: return 'ri-global-line';
    }
  };

  const getAudienceLabel = (audience?: string): string => {
    switch (audience) {
      case 'homme': return 'Homme';
      case 'femme': return 'Femme';
      case 'enfant': return 'Enfant';
      case 'mix': return 'Mix';
      case 'bebe': return 'Bébé';
      default: return 'Tous';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose}></div>
      <div className="relative bg-background-50 rounded-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground-950">
              <i className="ri-image-line mr-1.5"></i>
              Bibliothèque d'images
            </h3>
            <p className="text-xs text-foreground-500 mt-0.5">
              {flatImages.length} images · {imageCatalog.length} catégories · filtre public cible
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-background-200/70 flex-shrink-0">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder="Rechercher une image..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(IMAGES_PER_LOAD);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setVisibleCount(IMAGES_PER_LOAD); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-background-200/70 text-foreground-500 hover:bg-background-300/60 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {/* Audience Filter */}
        <div className="px-5 py-2.5 border-b border-background-200/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mr-1">
              <i className="ri-user-settings-line mr-1"></i>Cible
            </span>
            {audienceConfig.map((aud) => {
              const isActive = activeAudience === aud.key;
              return (
                <button
                  key={aud.key}
                  onClick={() => { setActiveAudience(aud.key); setVisibleCount(IMAGES_PER_LOAD); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-primary-500 text-background-50 shadow-sm'
                      : 'bg-background-100 text-foreground-500 hover:bg-background-200/70'
                  }`}
                >
                  <i className={`${aud.icon} text-xs`}></i>
                  {aud.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Tabs */}
        {!search.trim() && (
          <div className="px-5 py-2.5 border-b border-background-200/70 flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {imageCatalog.map((cat) => {
                const catColors = colorMap[(cat.color as ColorKey) || 'amber'];
                const audienceFilteredCount = activeAudience === 'all'
                  ? cat.images.length
                  : cat.images.filter((i) => (i.audience || 'all') === activeAudience).length;
                const isActive = activeCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => { setActiveCategory(cat.name); setVisibleCount(IMAGES_PER_LOAD); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? `${catColors.tab} shadow-sm`
                        : 'bg-background-100 text-foreground-500 hover:bg-background-200/70'
                    }`}
                  >
                    {cat.name}
                    <span className="ml-1 opacity-60">({audienceFilteredCount})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
                <i className="ri-image-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-sm text-foreground-500">
                {search.trim()
                  ? `Aucune image trouvée pour "${search}"`
                  : activeAudience !== 'all'
                    ? `Aucune image pour le public "${getAudienceLabel(activeAudience)}" dans cette catégorie`
                    : 'Aucune image dans cette catégorie'}
              </p>
            </div>
          ) : (
            <>
              {!search.trim() && activeCat && (
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-5 h-5 rounded-md ${activeCatColor.bg} flex items-center justify-center`}>
                    <i className="ri-image-line text-xs" style={{ color: `var(--${activeCat.color}-500)` }}></i>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    {activeCategory}
                    {activeAudience !== 'all' && (
                      <span className="font-medium text-foreground-400">
                        {' '}· {getAudienceLabel(activeAudience)}
                      </span>
                    )}
                    <span className="font-normal"> · {filteredImages.length} images</span>
                  </h4>
                </div>
              )}
              {search.trim() && (
                <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-4">
                  Résultats pour &quot;{search}&quot;
                  {activeAudience !== 'all' && (
                    <span className="font-medium text-foreground-400">
                      {' '}· {getAudienceLabel(activeAudience)}
                    </span>
                  )}
                  <span className="font-normal"> · {filteredImages.length} images</span>
                </h4>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visibleImages.map((img, idx) => {
                  const isSelected = selectedUrl === img.url;
                  const colors = getColorForImage(img);
                  const audIcon = getAudienceIcon(img.audience);
                  const audLabel = getAudienceLabel(img.audience);
                  return (
                    <button
                      key={img.url}
                      onClick={() => handleSelect(img.url)}
                      className={`relative rounded-lg overflow-hidden transition-all cursor-pointer group ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-background-50 ring-primary-400'
                          : 'hover:scale-[1.03]'
                      }`}
                      style={{
                        animationDelay: `${idx * 30}ms`,
                        animation: 'fade-in-up 0.3s ease-out both',
                      }}
                    >
                      <div className="aspect-[4/3] bg-background-100 relative overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://readdy.ai/api/search-image?query=Minimalist%20neutral%20product%20placeholder%20on%20clean%20white%20background%20soft%20lighting%20ecommerce%20style&width=400&height=300&seq=img-fallback-lib-01&orientation=landscape';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background-50/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-foreground-800">
                            <i className="ri-check-line mr-1"></i>Choisir
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-500 text-background-50 flex items-center justify-center">
                            <i className="ri-check-line text-sm"></i>
                          </div>
                        )}
                        {img.audience && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-background-50/85 backdrop-blur-sm text-foreground-600 flex items-center gap-0.5">
                            <i className={`${audIcon} text-[10px]`}></i>
                            <span className="text-[10px] font-medium">{audLabel}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-2.5 py-2 text-left ${isSelected ? colors.bg : 'bg-background-50'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.marker} flex-shrink-0`}></div>
                          <span className="text-xs text-foreground-400 font-medium">{img.categoryName}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground-800 leading-tight line-clamp-1">{img.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-5">
                  <button
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-5 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
                  >
                    <i className="ri-arrow-down-line"></i>
                    Voir plus ({filteredImages.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-background-200/70 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedUrl ? (
              <>
                <div className="w-10 h-8 rounded-md overflow-hidden bg-background-100 flex-shrink-0">
                  <img src={selectedUrl} alt="Selection" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-foreground-600">Image sélectionnée</span>
              </>
            ) : (
              <span className="text-xs text-foreground-400">Aucune image sélectionnée</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}