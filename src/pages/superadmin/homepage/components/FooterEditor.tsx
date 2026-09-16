import type { FooterContent, FooterColumn, SocialLink } from '@/lib/homepageContent';
import { TextField, TextAreaField, CardShell } from './FormFields';

export default function FooterEditor({
  value,
  onChange,
}: {
  value: FooterContent;
  onChange: (v: FooterContent) => void;
}) {
  const set = (patch: Partial<FooterContent>) => onChange({ ...value, ...patch });

  const setSocial = (i: number, patch: Partial<SocialLink>) => {
    const socials = [...value.socials];
    socials[i] = { ...socials[i], ...patch };
    set({ socials });
  };
  const addSocial = () =>
    set({ socials: [...value.socials, { icon: 'ri-global-line', label: '', url: '#' }] });
  const removeSocial = (i: number) =>
    set({ socials: value.socials.filter((_, idx) => idx !== i) });

  const setColumn = (i: number, patch: Partial<FooterColumn>) => {
    const columns = [...value.columns];
    columns[i] = { ...columns[i], ...patch };
    set({ columns });
  };
  const addColumn = () => set({ columns: [...value.columns, { title: '', links: [] }] });
  const removeColumn = (i: number) =>
    set({ columns: value.columns.filter((_, idx) => idx !== i) });

  const setLink = (ci: number, li: number, patch: Partial<FooterColumn['links'][number]>) => {
    const columns = [...value.columns];
    const links = [...columns[ci].links];
    links[li] = { ...links[li], ...patch };
    columns[ci] = { ...columns[ci], links };
    set({ columns });
  };
  const addLink = (ci: number) => {
    const columns = [...value.columns];
    columns[ci] = { ...columns[ci], links: [...columns[ci].links, { label: '', href: '#' }] };
    set({ columns });
  };
  const removeLink = (ci: number, li: number) => {
    const columns = [...value.columns];
    columns[ci] = { ...columns[ci], links: columns[ci].links.filter((_, idx) => idx !== li) };
    set({ columns });
  };

  return (
    <div className="space-y-4">
      <TextAreaField label="Texte de présentation (à côté du logo)" value={value.aboutText} onChange={(v) => set({ aboutText: v })} rows={3} />
      <TextField label="Texte copyright (ex : ZIFEK. Tous droits réservés.)" value={value.copyrightText} onChange={(v) => set({ copyrightText: v })} />

      <div>
        <span className="block text-xs font-semibold text-foreground-600 mb-2">Réseaux sociaux</span>
        <div className="space-y-2">
          {value.socials.map((social, i) => (
            <CardShell
              key={i}
              title={`Réseau ${i + 1}`}
              onAdd={addSocial}
              addLabel="Ajouter un réseau social"
              onRemove={() => removeSocial(i)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField label="Icône (classe remix)" value={social.icon} onChange={(v) => setSocial(i, { icon: v })} />
                <TextField label="Nom" value={social.label} onChange={(v) => setSocial(i, { label: v })} />
                <TextField label="URL" value={social.url} onChange={(v) => setSocial(i, { url: v })} />
              </div>
            </CardShell>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-xs font-semibold text-foreground-600 mb-2">Colonnes de liens</span>
        <div className="space-y-2">
          {value.columns.map((column, ci) => (
            <CardShell
              key={ci}
              title={`Colonne : ${column.title || `n°${ci + 1}`}`}
              onAdd={addColumn}
              addLabel="Ajouter une colonne"
              onRemove={() => removeColumn(ci)}
            >
              <TextField label="Titre de la colonne" value={column.title} onChange={(v) => setColumn(ci, { title: v })} />
              <div className="space-y-2">
                {column.links.map((link, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                      <TextField label="Libellé" value={link.label} onChange={(v) => setLink(ci, li, { label: v })} />
                      <TextField label="Lien (#section ou URL)" value={link.href} onChange={(v) => setLink(ci, li, { href: v })} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(ci, li)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                      title="Supprimer ce lien"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLink(ci)}
                className="mt-2 h-8 px-3 rounded-md border border-dashed border-background-300 text-xs font-medium text-foreground-500 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <i className="ri-add-line"></i>
                Ajouter un lien
              </button>
            </CardShell>
          ))}
        </div>
      </div>
    </div>
  );
}