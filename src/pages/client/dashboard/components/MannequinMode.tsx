import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

/* ─── Mannequin types ─── */
type MannequinType = 'femme' | 'homme' | 'enfant';

const MANNEQUIN_IMAGES: Record<MannequinType, string> = {
  femme: 'https://readdy.ai/api/search-image?query=A%20photorealistic%20full%20body%20front%20facing%20female%20fashion%20model%20with%20natural%20skin%20tone%20wearing%20a%20minimal%20nude%20toned%20bodysuit%20standing%20straight%20on%20a%20clean%20soft%20light%20grey%20studio%20background%20isolated%20product%20photography%20style%20subtle%20soft%20shadows%20high%20quality%20editorial%20shot%20even%20lighting%20neutral%20aesthetic%20professional%20fashion%20studio%20setup%20with%20gentle%20rim%20lighting%20full%20body%20visible%20from%20head%20to%20toes%20arms%20slightly%20away%20from%20body&width=420&height=630&seq=mannequin-femme-v4&orientation=portrait',
  homme: 'https://readdy.ai/api/search-image?query=A%20photorealistic%20full%20body%20front%20facing%20male%20fashion%20model%20with%20natural%20skin%20tone%20wearing%20minimal%20nude%20toned%20boxer%20briefs%20standing%20straight%20on%20a%20clean%20soft%20light%20grey%20studio%20background%20isolated%20product%20photography%20style%20subtle%20soft%20shadows%20high%20quality%20editorial%20shot%20even%20lighting%20neutral%20aesthetic%20professional%20fashion%20studio%20setup%20with%20gentle%20rim%20lighting%20full%20body%20visible%20from%20head%20to%20toes%20arms%20slightly%20away%20from%20body&width=420&height=630&seq=mannequin-homme-v3&orientation=portrait',
  enfant: 'https://readdy.ai/api/search-image?query=A%20photorealistic%20full%20body%20front%20facing%20child%20model%20around%20eight%20years%20old%20with%20natural%20skin%20tone%20wearing%20a%20minimal%20nude%20toned%20tank%20top%20and%20shorts%20standing%20straight%20on%20a%20clean%20soft%20light%20grey%20studio%20background%20isolated%20product%20photography%20style%20subtle%20soft%20shadows%20high%20quality%20editorial%20shot%20even%20lighting%20neutral%20aesthetic%20professional%20fashion%20studio%20setup%20full%20body%20visible%20from%20head%20to%20toes%20arms%20slightly%20away%20from%20body&width=420&height=630&seq=mannequin-enfant-v3&orientation=portrait',
};

const MANNEQUIN_LABELS: Record<MannequinType, { label: string; icon: string }> = {
  femme: { label: 'Femme', icon: 'ri-women-line' },
  homme: { label: 'Homme', icon: 'ri-men-line' },
  enfant: { label: 'Enfant', icon: 'ri-user-smile-line' },
};

const MANNEQUIN_OPTIONS: MannequinType[] = ['femme', 'homme', 'enfant'];

/* ─── Zone positions (slightly adapted per type) ─── */
const SLOT_ZONES_BY_TYPE: Record<MannequinType, Record<SlotType, { id: string; category: string; label: string; icon: string; top: string; height: string }>> = {
  femme: {
    top: { id: 'zone-top', category: 'haut', label: 'HAUT', icon: 'ri-t-shirt-line', top: '16%', height: '30%' },
    bottom: { id: 'zone-bottom', category: 'milieu', label: 'BAS', icon: 'ri-pantone-line', top: '46%', height: '28%' },
    shoes: { id: 'zone-shoes', category: 'bas', label: 'CHAUSSURES', icon: 'ri-footprint-line', top: '74%', height: '16%' },
  },
  homme: {
    top: { id: 'zone-top', category: 'haut', label: 'HAUT', icon: 'ri-t-shirt-line', top: '15%', height: '31%' },
    bottom: { id: 'zone-bottom', category: 'milieu', label: 'BAS', icon: 'ri-pantone-line', top: '46%', height: '28%' },
    shoes: { id: 'zone-shoes', category: 'bas', label: 'CHAUSSURES', icon: 'ri-footprint-line', top: '74%', height: '16%' },
  },
  enfant: {
    top: { id: 'zone-top', category: 'haut', label: 'HAUT', icon: 'ri-t-shirt-line', top: '18%', height: '28%' },
    bottom: { id: 'zone-bottom', category: 'milieu', label: 'BAS', icon: 'ri-pantone-line', top: '46%', height: '26%' },
    shoes: { id: 'zone-shoes', category: 'bas', label: 'CHAUSSURES', icon: 'ri-footprint-line', top: '72%', height: '18%' },
  },
};

interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  photos: string[];
  occasion: string;
  created_at: string;
}

type SlotType = 'top' | 'bottom' | 'shoes';

interface MannequinModeProps {
  closetItems: ClosetItem[];
  selectedTop: ClosetItem | null;
  selectedBottom: ClosetItem | null;
  selectedShoes: ClosetItem | null;
  onSelectTop: (item: ClosetItem | null) => void;
  onSelectBottom: (item: ClosetItem | null) => void;
  onSelectShoes: (item: ClosetItem | null) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; slot: SlotType }> = {
  haut: { label: 'Hauts', icon: 'ri-t-shirt-line', slot: 'top' },
  milieu: { label: 'Bas', icon: 'ri-pantone-line', slot: 'bottom' },
  bas: { label: 'Chaussures', icon: 'ri-footprint-line', slot: 'shoes' },
};

function getZoneForCategory(category: string): SlotType | null {
  if (category === 'haut') return 'top';
  if (category === 'milieu') return 'bottom';
  if (category === 'bas') return 'shoes';
  return null;
}

/* ─── Drop Zone on Mannequin ─── */
function DropZone({
  slot,
  placedItem,
  isOver,
  isOverCompatible,
  onRemove,
  zoneConfig,
}: {
  slot: SlotType;
  placedItem: ClosetItem | null;
  isOver: boolean;
  isOverCompatible: boolean;
  onRemove: () => void;
  zoneConfig: { id: string; category: string; label: string; icon: string; top: string; height: string };
}) {
  const { setNodeRef } = useDroppable({ id: zoneConfig.id });

  // Base container — wider now to better cover the body
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    top: zoneConfig.top,
    height: zoneConfig.height,
    left: '5%',
    right: '5%',
    transition: 'all 0.3s ease',
    zIndex: 10,
    overflow: 'hidden',
  };

  if (placedItem) {
    // ── CLOTHING WORN: no card, image directly on body with contour shading ──
    return (
      <div ref={setNodeRef} style={baseStyle} className="group/zone">
        {/* The clothing image — fills the zone, covering the body */}
        <div className="absolute inset-0">
          <img
            src={placedItem.photos?.[0] || ''}
            alt={placedItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
        {/* Body contour effect — radial shadow from edges inward, simulates 3D curvature */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
          }}
        />
        {/* Subtle inner highlight — top-left light source */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)',
          }}
        />
        {/* Name badge — small, dark, discreet */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/55 text-white text-[10px] font-medium rounded-full whitespace-nowrap z-20 backdrop-blur-sm">
          {placedItem.name}
        </div>
        {/* Remove button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer z-30 opacity-0 group-hover/zone:opacity-100 transition-opacity hover:bg-red-500"
          title="Retirer"
        >
          <i className="ri-close-line text-xs"></i>
        </button>
      </div>
    );
  }

  // ── EMPTY ZONE: barely visible, only clear when hovering/dragging ──
  let emptyStyle: React.CSSProperties = { ...baseStyle };

  if (isOver && isOverCompatible) {
    emptyStyle = {
      ...emptyStyle,
      border: '2px solid oklch(var(--accent-500) / 0.6)',
      borderRadius: '16px',
      backgroundColor: 'oklch(var(--accent-500) / 0.10)',
      boxShadow: 'inset 0 0 30px oklch(var(--accent-500) / 0.08)',
    };
  } else if (isOver && !isOverCompatible) {
    emptyStyle = {
      ...emptyStyle,
      border: '2px dashed oklch(0.55 0.18 25 / 0.4)',
      borderRadius: '16px',
      backgroundColor: 'oklch(0.55 0.18 25 / 0.06)',
    };
  } else {
    emptyStyle = {
      ...emptyStyle,
      border: '1px dashed oklch(var(--foreground-300) / 0.18)',
      borderRadius: '16px',
      backgroundColor: 'transparent',
    };
  }

  return (
    <div ref={setNodeRef} style={emptyStyle} className="group/zone-empty">
      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
        <i className={`${zoneConfig.icon} text-sm ${isOver && isOverCompatible ? 'text-accent-500' : 'text-foreground-300/50'}`}></i>
        <span className={`text-[10px] font-medium ${isOver && isOverCompatible ? 'text-accent-600' : 'text-foreground-400/50'}`}>
          {zoneConfig.label}
        </span>
      </div>
    </div>
  );
}

/* ─── Draggable Closet Item ─── */
function DraggableItem({
  item,
  isPlaced,
  isDragging,
  onClick,
}: {
  item: ClosetItem;
  isPlaced: boolean;
  isDragging: boolean;
  onClick?: (item: ClosetItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `closet-${item.id}`,
    data: { item },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={style}
      className={`relative shrink-0 w-[72px] cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? 'opacity-30' : ''
      } ${isPlaced ? 'opacity-40' : 'opacity-100 hover:opacity-90'}`}
    >
      <div className={`w-[72px] h-[90px] rounded-lg overflow-hidden bg-background-100 border ${
        isPlaced ? 'border-accent-400/60' : 'border-background-200/60 hover:border-background-300/60'
      }`}>
        {item.photos?.[0] ? (
          <img
            src={item.photos[0]}
            alt={item.name}
            className="w-full h-full object-cover object-top"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="ri-shirt-line text-lg text-foreground-300"></i>
          </div>
        )}
        {isPlaced && (
          <div className="absolute inset-0 bg-accent-500/10 flex items-center justify-center">
            <i className="ri-check-line text-accent-600 text-sm"></i>
          </div>
        )}
      </div>
      <p className="text-[10px] text-foreground-600 mt-1 text-center leading-tight truncate max-w-[72px]">
        {item.name}
      </p>
    </div>
  );
}

/* ─── Drag Overlay ─── */
function ItemDragOverlay({ item }: { item: ClosetItem | null }) {
  if (!item) return null;
  return (
    <div className="w-[80px] h-[100px] rounded-lg overflow-hidden bg-background-50 border-2 border-accent-400 shadow-xl rotate-3">
      {item.photos?.[0] ? (
        <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover object-top" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-background-100">
          <i className="ri-shirt-line text-2xl text-foreground-300"></i>
        </div>
      )}
    </div>
  );
}

/* ─── Main MannequinMode Component ─── */
export default function MannequinMode({
  closetItems,
  selectedTop,
  selectedBottom,
  selectedShoes,
  onSelectTop,
  onSelectBottom,
  onSelectShoes,
}: MannequinModeProps) {
  const [activeItem, setActiveItem] = useState<ClosetItem | null>(null);
  const [overZoneId, setOverZoneId] = useState<string | null>(null);
  const [mannequinType, setMannequinType] = useState<MannequinType>('femme');

  const slotZones = SLOT_ZONES_BY_TYPE[mannequinType];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.item) {
      setActiveItem(data.item as ClosetItem);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    setOverZoneId(overId || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverZoneId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (!activeId.startsWith('closet-')) return;
    if (!overId.startsWith('zone-')) return;

    const itemData = active.data.current?.item as ClosetItem | undefined;
    if (!itemData) return;

    const targetSlot = Object.values(slotZones).find((z) => z.id === overId);
    if (!targetSlot) return;

    const expectedSlot = getZoneForCategory(itemData.category);
    if (!expectedSlot) return;

    const zoneSlot = Object.entries(slotZones).find(([, z]) => z.id === overId)?.[0] as SlotType | undefined;
    if (!zoneSlot) return;

    if (itemData.category === slotZones[zoneSlot].category) {
      if (zoneSlot === 'top') onSelectTop(itemData);
      else if (zoneSlot === 'bottom') onSelectBottom(itemData);
      else if (zoneSlot === 'shoes') onSelectShoes(itemData);
    }
  }, [onSelectTop, onSelectBottom, onSelectShoes, slotZones]);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setOverZoneId(null);
  }, []);

  const activeCategory = activeItem?.category || '';
  const compatibleZone = getZoneForCategory(activeCategory);

  const getSelectedForSlot = (slot: SlotType): ClosetItem | null => {
    if (slot === 'top') return selectedTop;
    if (slot === 'bottom') return selectedBottom;
    return selectedShoes;
  };

  const handleRemoveFromSlot = (slot: SlotType) => {
    if (slot === 'top') onSelectTop(null);
    else if (slot === 'bottom') onSelectBottom(null);
    else onSelectShoes(null);
  };

  const getCategoryItems = (cat: string) => closetItems.filter((i) => i.category === cat);

  const draggableCategories = ['haut', 'milieu', 'bas'];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* ─── Mannequin ─── */}
        <div className="w-full lg:w-[42%] shrink-0">
          {/* Mannequin type selector */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex bg-background-100 rounded-full p-1 border border-background-200/60">
              {MANNEQUIN_OPTIONS.map((type) => {
                const cfg = MANNEQUIN_LABELS[type];
                const isActive = mannequinType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setMannequinType(type)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                      isActive
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className={`${cfg.icon} text-xs`}></i>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative bg-background-50 border border-background-200/70 rounded-2xl overflow-hidden">
            {/* Mannequin image */}
            <div className="relative" style={{ paddingTop: '150%' }}>
              <img
                src={MANNEQUIN_IMAGES[mannequinType]}
                alt={`Mannequin ${MANNEQUIN_LABELS[mannequinType].label}`}
                className="absolute inset-0 w-full h-full object-contain object-center"
                draggable={false}
              />

              {/* Drop zones overlay */}
              <div className="absolute inset-0">
                {(['top', 'bottom', 'shoes'] as SlotType[]).map((slot) => {
                  const zoneCfg = slotZones[slot];
                  const zoneId = zoneCfg.id;
                  const isOver = overZoneId === zoneId;
                  const isCompatible = compatibleZone === slot;
                  const placed = getSelectedForSlot(slot);

                  return (
                    <DropZone
                      key={slot}
                      slot={slot}
                      placedItem={placed}
                      isOver={isOver}
                      isOverCompatible={isCompatible}
                      onRemove={() => handleRemoveFromSlot(slot)}
                      zoneConfig={zoneCfg}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selection summary below mannequin */}
          <div className="mt-3 flex gap-2 justify-center">
            {(['top', 'bottom', 'shoes'] as SlotType[]).map((slot) => {
              const item = getSelectedForSlot(slot);
              const cfg = slotZones[slot];
              return (
                <div
                  key={slot}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                    item
                      ? 'bg-accent-100 text-accent-700 border border-accent-200'
                      : 'bg-background-100 text-foreground-400 border border-background-200/60'
                  }`}
                >
                  <i className={`${cfg.icon} text-xs`}></i>
                  <span className="truncate max-w-[90px]">{item?.name || cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Armoire (draggable items) ─── */}
        <div className="flex-1 min-w-0">
          <div className="bg-background-50 border border-background-200/70 rounded-2xl p-4 h-full">
            <h3 className="text-sm font-bold font-heading text-foreground-800 mb-4 flex items-center gap-2">
              <i className="ri-drag-move-line text-accent-500"></i>
              Glissez vos vêtements sur le mannequin
            </h3>

            <div className="space-y-5">
              {draggableCategories.map((cat) => {
                const catItems = getCategoryItems(cat);
                const cfg = CATEGORY_CONFIG[cat];
                const selectedItem = getSelectedForSlot(cfg.slot);

                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center">
                          <i className={`${cfg.icon} text-[10px] text-accent-600`}></i>
                        </div>
                        <span className="text-xs font-semibold text-foreground-700">{cfg.label}</span>
                        <span className="text-[10px] text-foreground-400">({catItems.length})</span>
                      </div>
                      {selectedItem && (
                        <span className="text-[10px] text-accent-600 flex items-center gap-1">
                          <i className="ri-check-line"></i>
                          {selectedItem.name.length > 18
                            ? selectedItem.name.slice(0, 18) + '...'
                            : selectedItem.name}
                        </span>
                      )}
                    </div>

                    {catItems.length === 0 ? (
                      <div className="flex items-center gap-2 py-3 px-3 bg-background-100/60 rounded-xl border border-dashed border-background-300/60">
                        <i className="ri-information-line text-xs text-foreground-400"></i>
                        <p className="text-[11px] text-foreground-400">
                          Aucun vêtement dans cette catégorie. Ajoutez-en dans Mon Armoire.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
                        {catItems.map((item) => (
                          <DraggableItem
                            key={item.id}
                            item={item}
                            isPlaced={selectedItem?.id === item.id}
                            isDragging={activeItem?.id === item.id}
                            onClick={(clickedItem) => {
                              const slot = getZoneForCategory(clickedItem.category);
                              if (slot === 'top') onSelectTop(clickedItem);
                              else if (slot === 'bottom') onSelectBottom(clickedItem);
                              else if (slot === 'shoes') onSelectShoes(clickedItem);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Helper text */}
            <div className="mt-5 pt-4 border-t border-background-200/60">
              <div className="flex items-start gap-2 text-[11px] text-foreground-400">
                <i className="ri-lightbulb-line text-amber-500 mt-0.5"></i>
                <p>
                  <strong>Cliquez</strong> sur un vêtement pour l&apos;habiller directement sur le mannequin, ou <strong>glissez-déposez</strong>-le sur la zone correspondante.
                  Cliquez sur le <span className="text-red-400">✕</span> d&apos;une zone pour retirer le vêtement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        <ItemDragOverlay item={activeItem} />
      </DragOverlay>
    </DndContext>
  );
}