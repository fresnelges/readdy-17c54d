import type { PricingContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, SectionHeaderFields, CardShell } from './FormFields';

export default function PricingEditor({
  value,
  onChange,
}: {
  value: PricingContent;
  onChange: (v: PricingContent) => void;
}) {
  const set = (patch: Partial<PricingContent>) => onChange({ ...value, ...patch });

  const setItem = (i: number, patch: Partial<PricingContent['items'][number]>) => {
    const items = [...value.items];
    items[i] = { ...items[i], ...patch };
    set({ items });
  };
  const addItem = () =>
    set({
      items: [
        ...value.items,
        {
          name: '',
          price: '0',
          annualPrice: '0',
          currency: 'MAD',
          period: '/mois',
          description: '',
          features: [],
          highlighted: false,
          cta: '',
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
      <div className="space-y-2">
        {value.items.map((item, i) => (
          <CardShell
            key={i}
            title={`Plan : ${item.name || `n°${i + 1}`}`}
            onAdd={addItem}
            addLabel="Ajouter un plan"
            onRemove={() => removeItem(i)}
            onMoveUp={() => moveItem(i, -1)}
            onMoveDown={() => moveItem(i, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < value.items.length - 1}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Nom du plan" value={item.name} onChange={(v) => setItem(i, { name: v })} />
              <TextAreaField label="Description" value={item.description} onChange={(v) => setItem(i, { description: v })} rows={1} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <TextField label="Prix mensuel" value={item.price} onChange={(v) => setItem(i, { price: v })} />
              <TextField label="Prix annuel" value={item.annualPrice} onChange={(v) => setItem(i, { annualPrice: v })} />
              <TextField label="Devise" value={item.currency} onChange={(v) => setItem(i, { currency: v })} />
              <TextField label="Période" value={item.period} onChange={(v) => setItem(i, { period: v })} />
            </div>
            <TextAreaField
              label="Avantages (un par ligne)"
              value={item.features.join('\n')}
              onChange={(v) => setItem(i, { features: v.split('\n') })}
              rows={5}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Texte du bouton" value={item.cta} onChange={(v) => setItem(i, { cta: v })} />
              <div>
                <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Mettre en avant</label>
                <button
                  type="button"
                  onClick={() => setItem(i, { highlighted: !item.highlighted })}
                  className={`h-10 px-4 rounded-md border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    item.highlighted
                      ? 'bg-primary-500 text-background-50 border-primary-500'
                      : 'bg-background-50 text-foreground-600 border-background-200/70 hover:bg-background-100'
                  }`}
                >
                  <i className={`${item.highlighted ? 'ri-checkbox-circle-line' : 'ri-checkbox-blank-circle-line'}`}></i>
                  {item.highlighted ? 'Plan populaire' : 'Plan standard'}
                </button>
              </div>
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}