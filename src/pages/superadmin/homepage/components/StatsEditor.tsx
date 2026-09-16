import type { StatsContent } from '@/lib/homepageContent';
import { TextField, SectionHeaderFields, CardShell } from './FormFields';

export default function StatsEditor({
  value,
  onChange,
}: {
  value: StatsContent;
  onChange: (v: StatsContent) => void;
}) {
  const set = (patch: Partial<StatsContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<StatsContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
  };
  const addItem = () =>
    set({ items: [...value.items, { value: '', suffix: '', label: '' }] });
  const removeItem = (i: number) => set({ items: value.items.filter((_, idx) => idx !== i) });
  const moveItem = (i: number, dir: -1 | 1) => {
    const items = [...value.items];
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    set({ items });
  };

  return (
    <div className="space-y-4">
      <SectionHeaderFields
        badge={value.badge}
        title={value.title}
        subtitle={value.subtitle}
        onBadge={(v) => set({ badge: v })}
        onTitle={(v) => set({ title: v })}
        onSubtitle={(v) => set({ subtitle: v })}
      />
      <div className="space-y-2">
        {value.items.map((item, i) => (
          <CardShell
            key={i}
            title={`Stat ${i + 1}`}
            onAdd={addItem}
            addLabel="Ajouter une statistique"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField label="Valeur (ex : 12 000)" value={item.value} onChange={(v) => setItem(i, { value: v })} />
              <TextField label="Suffixe (ex : + ou %)" value={item.suffix} onChange={(v) => setItem(i, { suffix: v })} />
              <TextField label="Libellé" value={item.label} onChange={(v) => setItem(i, { label: v })} />
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}