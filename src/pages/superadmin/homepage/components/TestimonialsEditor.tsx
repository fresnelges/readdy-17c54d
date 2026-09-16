import type { TestimonialsContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, ImageField, SectionHeaderFields, CardShell } from './FormFields';

export default function TestimonialsEditor({
  value,
  onChange,
}: {
  value: TestimonialsContent;
  onChange: (v: TestimonialsContent) => void;
}) {
  const set = (patch: Partial<TestimonialsContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<TestimonialsContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
  };
  const addItem = () =>
    set({ items: [...value.items, { name: '', role: '', text: '', image: '' }] });
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
            title={`Témoignage ${i + 1}`}
            onAdd={addItem}
            addLabel="Ajouter un témoignage"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Nom" value={item.name} onChange={(v) => setItem(i, { name: v })} />
              <TextField label="Rôle / fonction" value={item.role} onChange={(v) => setItem(i, { role: v })} />
            </div>
            <TextAreaField label="Témoignage" value={item.text} onChange={(v) => setItem(i, { text: v })} rows={3} />
            <ImageField label="Photo" value={item.image} onChange={(v) => setItem(i, { image: v })} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}