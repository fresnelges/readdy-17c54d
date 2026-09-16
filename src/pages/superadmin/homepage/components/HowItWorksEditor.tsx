import type { HowItWorksContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, IconField, ColorField, ImageField, SectionHeaderFields, CardShell } from './FormFields';

export default function HowItWorksEditor({
  value,
  onChange,
}: {
  value: HowItWorksContent;
  onChange: (v: HowItWorksContent) => void;
}) {
  const set = (patch: Partial<HowItWorksContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<HowItWorksContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch } as HowItWorksContent['items'][number];
    set({ items });
  };
  const addItem = () =>
    set({
      items: [
        ...value.items,
        {
          number: String(value.items.length + 1).padStart(2, '0'),
          icon: 'ri-rocket-2-line',
          title: '',
          description: '',
          image: '',
          color: 'primary',
        },
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
      <TextField label="Phrase en bas de section" value={value.footerHint} onChange={(v) => set({ footerHint: v })} />
      <div className="space-y-2">
        {value.items.map((item, i) => (
          <CardShell
            key={i}
            title={`Étape ${i + 1}`}
            onAdd={addItem}
            addLabel="Ajouter une étape"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <TextField label="Numéro" value={item.number} onChange={(v) => setItem(i, { number: v })} />
              <IconField label="Icône" value={item.icon} onChange={(v) => setItem(i, { icon: v })} />
              <ColorField label="Couleur" value={item.color} onChange={(v) => setItem(i, { color: v as 'primary' | 'accent' | 'secondary' })} />
              <TextField label="Titre" value={item.title} onChange={(v) => setItem(i, { title: v })} />
            </div>
            <TextAreaField label="Description" value={item.description} onChange={(v) => setItem(i, { description: v })} rows={2} />
            <ImageField label="Image d'illustration" value={item.image} onChange={(v) => setItem(i, { image: v })} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}