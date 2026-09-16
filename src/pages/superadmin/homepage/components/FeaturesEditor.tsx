import type { FeaturesContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, IconField, ColorField, SectionHeaderFields, CardShell } from './FormFields';

export default function FeaturesEditor({
  value,
  onChange,
}: {
  value: FeaturesContent;
  onChange: (v: FeaturesContent) => void;
}) {
  const set = (patch: Partial<FeaturesContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<FeaturesContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch } as FeaturesContent['items'][number];
    set({ items });
  };
  const addItem = () =>
    set({
      items: [
        ...value.items,
        { icon: 'ri-star-line', title: '', description: '', color: 'primary' },
      ],
    });
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
            title={`Fonctionnalité ${i + 1}`}
            onAdd={addItem}
            addLabel="Ajouter une fonctionnalité"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <IconField label="Icône" value={item.icon} onChange={(v) => setItem(i, { icon: v })} />
              <ColorField label="Couleur" value={item.color} onChange={(v) => setItem(i, { color: v as 'primary' | 'accent' | 'secondary' })} />
            </div>
            <TextField label="Titre" value={item.title} onChange={(v) => setItem(i, { title: v })} />
            <TextAreaField label="Description" value={item.description} onChange={(v) => setItem(i, { description: v })} rows={2} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}