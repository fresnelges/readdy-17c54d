import type { CtaContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, ImageField } from './FormFields';

export default function CtaEditor({
  value,
  onChange,
}: {
  value: CtaContent;
  onChange: (v: CtaContent) => void;
}) {
  const set = (patch: Partial<CtaContent>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TextField label="Début du titre" value={value.titleBefore} onChange={(v) => set({ titleBefore: v })} />
        <TextField label="Texte accentué (couleur)" value={value.highlight} onChange={(v) => set({ highlight: v })} />
        <TextField label="Fin du titre" value={value.titleAfter} onChange={(v) => set({ titleAfter: v })} />
      </div>
      <TextAreaField label="Sous-titre" value={value.subtitle} onChange={(v) => set({ subtitle: v })} rows={2} />
      <TextField label="Texte du bouton" value={value.buttonText} onChange={(v) => set({ buttonText: v })} />
      <ImageField label="Image de fond" value={value.backgroundImage} onChange={(v) => set({ backgroundImage: v })} />
    </div>
  );
}