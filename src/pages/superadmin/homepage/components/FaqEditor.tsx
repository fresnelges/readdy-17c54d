import type { FaqContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, SectionHeaderFields, CardShell } from './FormFields';

export default function FaqEditor({
  value,
  onChange,
}: {
  value: FaqContent;
  onChange: (v: FaqContent) => void;
}) {
  const set = (patch: Partial<FaqContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<FaqContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
  };
  const addItem = () => set({ items: [...value.items, { question: '', answer: '' }] });
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
            title={`Question ${i + 1}`}
            onAdd={addItem}
            addLabel="Ajouter une question"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <TextField label="Question" value={item.question} onChange={(v) => setItem(i, { question: v })} />
            <TextAreaField label="Réponse" value={item.answer} onChange={(v) => setItem(i, { answer: v })} rows={3} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}