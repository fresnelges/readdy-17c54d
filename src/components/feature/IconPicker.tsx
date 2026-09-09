import { useState, useMemo } from 'react';
import iconCatalog, { type IconItem, type IconCategory } from '@/data/iconCatalog';

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconClass: string) => void;
  selectedIcon: string | null;
}

type ColorKey = 'amber' | 'teal' | 'rose' | 'pink' | 'red' | 'green' | 'orange' | 'violet' | 'cyan';

const colorMap: Record<ColorKey, { bg: string; text: string; border: string; tab: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200/60', tab: 'bg-amber-50 text-amber-700' },
  teal:  { bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-200/60', tab: 'bg-teal-50 text-teal-700' },
  rose:  { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200/60', tab: 'bg-rose-50 text-rose-700' },
  pink:  { bg: 'bg-pink-50', text: 'text-pink-500', border: 'border-pink-200/60', tab: 'bg-pink-50 text-pink-700' },
  red:   { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200/60', tab: 'bg-red-50 text-red-700' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200/60', tab: 'bg-emerald-50 text-emerald-700' },
  orange:{ bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200/60', tab: 'bg-orange-50 text-orange-700' },
  violet:{ bg: 'bg-violet-50', text: 'text-violet-500', border: 'border-violet-200/60', tab: 'bg-violet-50 text-violet-700' },
  cyan:  { bg: 'bg-cyan-50', text: 'text-cyan-500', border: 'border-cyan-200/60', tab: 'bg-cyan-50 text-cyan-700' },
};

interface FlatIcon extends IconItem {
  categoryColor: ColorKey;
  categoryName: string;
}

const flatIcons: FlatIcon[] = iconCatalog.flatMap((cat) =>
  cat.icons.map((icon) => ({
    ...icon,
    categoryColor: cat.color as ColorKey,
    categoryName: cat.name,
  }))
);

export default function IconPicker({ isOpen, onClose, onSelect, selectedIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(iconCatalog[0]?.name || '');

  const activeCat = useMemo(() => iconCatalog.find((c) => c.name === activeCategory) as IconCategory | undefined, [activeCategory]);

  const activeCatColor = useMemo(() => colorMap[(activeCat?.color as ColorKey) || 'amber'], [activeCat]);

  const filteredIcons = useMemo((): FlatIcon[] => {
    if (!search.trim()) {
      return flatIcons.filter((i) => i.categoryName === activeCategory);
    }
    const q = search.toLowerCase();
    return flatIcons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(q) ||
        icon.keywords.some((k) => k.includes(q))
    );
  }, [search, activeCategory]);

  const handleSelect = (iconClass: string) => {
    onSelect(iconClass);
    onClose();
  };

  const getColorForIcon = (icon: FlatIcon) => colorMap[icon.categoryColor] || colorMap.amber;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose}></div>
      <div className="relative bg-background-50 rounded-xl w-full max-w-3xl mx-4 max-h-[88vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200/70 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground-950">Catalogue d'icônes</h3>
            <p className="text-xs text-foreground-500 mt-0.5">
              {flatIcons.length} icônes colorées · {iconCatalog.length} catégories
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
              placeholder="Rechercher une icône..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-background-200/70 text-foreground-500 hover:bg-background-300/60 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs - only show when not searching */}
        {!search.trim() && (
          <div className="px-5 py-2.5 border-b border-background-200/70 flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {iconCatalog.map((cat) => {
                const catColors = colorMap[(cat.color as ColorKey) || 'amber'];
                const isActive = activeCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? `${catColors.tab} shadow-sm`
                        : 'bg-background-100 text-foreground-500 hover:bg-background-200/70'
                    }`}
                  >
                    {cat.name}
                    <span className="ml-1 opacity-60">({cat.icons.length})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mb-3">
                <i className="ri-search-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-sm text-foreground-500">
                {search.trim() ? `Aucune icône trouvée pour "${search}"` : 'Aucune icône dans cette catégorie'}
              </p>
            </div>
          ) : (
            <>
              {!search.trim() && activeCat && (
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-5 h-5 rounded-md ${activeCatColor.bg} flex items-center justify-center`}>
                    <i className={`${activeCat.icons[0]?.class || 'ri-shape-line'} text-xs ${activeCatColor.text}`}></i>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    {activeCategory} <span className="font-normal">· {filteredIcons.length} icônes</span>
                  </h4>
                </div>
              )}
              {search.trim() && (
                <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">
                  Résultats pour "{search}" <span className="font-normal">· {filteredIcons.length} icônes</span>
                </h4>
              )}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
                {filteredIcons.map((icon) => {
                  const isSelected = selectedIcon === icon.class;
                  const colors = getColorForIcon(icon);
                  return (
                    <button
                      key={icon.class}
                      onClick={() => handleSelect(icon.class)}
                      title={`${icon.name} (${icon.categoryName})`}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all cursor-pointer group ${
                        isSelected
                          ? `ring-2 ring-offset-1 ${colors.bg}`
                          : 'hover:bg-background-100'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? `${colors.bg} ${colors.text} scale-110`
                            : `bg-background-100 text-foreground-400 group-hover:${colors.bg} group-hover:${colors.text}`
                        }`}
                      >
                        <i className={`${icon.class} text-2xl`}></i>
                      </div>
                      <span className="text-[10px] text-foreground-500 text-center leading-tight line-clamp-2 max-w-[64px]">
                        {icon.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-background-200/70 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedIcon ? (
              <>
                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <i className={`${selectedIcon} text-lg`}></i>
                </div>
                <span className="text-xs text-foreground-600">
                  Icône sélectionnée
                </span>
              </>
            ) : (
              <span className="text-xs text-foreground-400">Aucune icône sélectionnée</span>
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