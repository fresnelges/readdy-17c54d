import type { HeroContent } from '@/lib/homepageContent';
import { TextField, TextAreaField, ImageField, CardShell } from './FormFields';

export default function HeroEditor({
  value,
  onChange,
}: {
  value: HeroContent;
  onChange: (v: HeroContent) => void;
}) {
  const set = (patch: Partial<HeroContent>) => onChange({ ...value, ...patch });

  const setAvatar = (i: number, url: string) => {
    const avatars = [...value.avatars];
    avatars[i] = url;
    set({ avatars });
  };
  const addAvatar = () => set({ avatars: [...value.avatars, ''] });
  const removeAvatar = (i: number) => set({ avatars: value.avatars.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <TextField label="Badge" value={value.badge} onChange={(v) => set({ badge: v })} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TextField label="Titre — ligne 1" value={value.titleLine1} onChange={(v) => set({ titleLine1: v })} />
        <TextField label="Mot avant l'accent" value={value.titleLine2Prefix} onChange={(v) => set({ titleLine2Prefix: v })} />
        <TextField label="Texte accentué (couleur)" value={value.titleHighlight} onChange={(v) => set({ titleHighlight: v })} />
      </div>
      <TextAreaField label="Sous-titre" value={value.subtitle} onChange={(v) => set({ subtitle: v })} rows={3} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField label="Bouton principal" value={value.primaryCta} onChange={(v) => set({ primaryCta: v })} />
        <TextField label="Bouton secondaire" value={value.secondaryCta} onChange={(v) => set({ secondaryCta: v })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField label="Chiffre social proof (ex : +12 000)" value={value.socialProofValue} onChange={(v) => set({ socialProofValue: v })} />
        <TextField label="Texte social proof" value={value.socialProofLabel} onChange={(v) => set({ socialProofLabel: v })} />
      </div>
      <ImageField label="Image de fond" value={value.backgroundImage} onChange={(v) => set({ backgroundImage: v })} />

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-foreground-600">Avatars (photos de profil)</span>
        {value.avatars.map((avatar, i) => (
          <CardShell
            key={i}
            title={`Avatar ${i + 1}`}
            onAdd={addAvatar}
            addLabel="Ajouter un avatar"
            onRemove={() => removeAvatar(i)}
          >
            <ImageField label="URL de l'image" value={avatar} onChange={(v) => setAvatar(i, v)} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}