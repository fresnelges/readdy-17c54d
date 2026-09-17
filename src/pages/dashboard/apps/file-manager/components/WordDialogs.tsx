import { useEffect, useState, type ReactNode } from 'react';

export interface WordStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingMinutes: number;
  pages: number;
}

export interface WordPrefs {
  font: 'sans' | 'serif' | 'mono';
  fontSize: number;
  paragraphSpacing: boolean;
}

function ModalShell({
  title,
  icon,
  onClose,
  children,
  width = 'max-w-lg',
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground-950/40" onClick={onClose}>
      <div
        className={`w-full ${width} bg-background-50 border border-background-200/70 rounded-lg overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-background-200/70">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <i className={icon}></i>
          </span>
          <h3 className="flex-1 text-sm font-semibold text-foreground-950">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function WordStatsDialog({
  open,
  stats,
  onClose,
}: {
  open: boolean;
  stats: WordStats | null;
  onClose: () => void;
}) {
  if (!open || !stats) return null;
  const rows = [
    { label: 'Mots', value: stats.words.toLocaleString('fr-FR'), icon: 'ri-text' },
    { label: 'Caractères', value: stats.characters.toLocaleString('fr-FR'), icon: 'ri-font-size' },
    { label: 'Caractères sans espaces', value: stats.charactersNoSpaces.toLocaleString('fr-FR'), icon: 'ri-font-size-2' },
    { label: 'Paragraphes', value: stats.paragraphs.toLocaleString('fr-FR'), icon: 'ri-paragraph' },
    { label: 'Pages estimées', value: stats.pages.toLocaleString('fr-FR'), icon: 'ri-file-text-line' },
    { label: 'Temps de lecture', value: `${stats.readingMinutes} min`, icon: 'ri-time-line' },
  ];
  return (
    <ModalShell title="Statistiques du document" icon="ri-bar-chart-2-line" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="px-3 py-3 rounded-lg bg-background-100">
            <div className="flex items-center gap-2 text-foreground-500 text-xs">
              <i className={r.icon}></i>
              {r.label}
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground-950">{r.value}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

export function WordShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const shortcuts = [
    ['Ctrl + S', 'Enregistrer le document'],
    ['Ctrl + Z', 'Annuler'],
    ['Ctrl + Y', 'Rétablir'],
    ['Ctrl + B', 'Gras'],
    ['Ctrl + I', 'Italique'],
    ['Ctrl + U', 'Souligné'],
    ['Ctrl + K', 'Insérer un lien'],
    ['Ctrl + F', 'Rechercher et remplacer'],
    ['Ctrl + A', 'Tout sélectionner'],
    ['Ctrl + P', 'Imprimer'],
    ['Ctrl + Maj + C', 'Comptage des mots'],
    ['Ctrl + /', 'Afficher les raccourcis'],
    ['Échap', 'Fermer le menu ou le panneau'],
  ];
  return (
    <ModalShell title="Raccourcis clavier" icon="ri-keyboard-line" onClose={onClose}>
      <div className="flex flex-col divide-y divide-background-200/70">
        {shortcuts.map(([keys, label]) => (
          <div key={keys} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-foreground-700">{label}</span>
            <span className="px-2.5 py-1 rounded-md bg-background-100 text-xs font-medium text-foreground-700">{keys}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

export function WordAboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const features = [
    'Édition complète avec mise en forme avancée',
    'Insertion de tableaux, images, liens et caractères spéciaux',
    'Rechercher et remplacer avec surlignage',
    'Export multi-format (Word, PDF, HTML, Texte)',
    'Assistant IA intégré pour la rédaction',
    'Collaboration et historique des versions',
  ];
  return (
    <ModalShell title="À propos de l’éditeur" icon="ri-question-line" onClose={onClose}>
      <p className="text-sm text-foreground-700 leading-relaxed">
        Bienvenue dans l’éditeur de documents texte. Il vous permet de créer, rédiger et enrichir vos
        documents directement depuis votre espace de travail, sans aucune installation.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm text-foreground-700">
            <i className="ri-check-line text-primary-600 mt-0.5"></i>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 p-3 rounded-lg bg-accent-50 text-xs text-accent-800">
        <i className="ri-information-line mr-1"></i>
        L’assistant IA utilise l’API configurée dans les paramètres du superadmin.
      </div>
    </ModalShell>
  );
}

export function WordPreferencesDialog({
  open,
  prefs,
  onChange,
  onClose,
}: {
  open: boolean;
  prefs: WordPrefs;
  onChange: (prefs: WordPrefs) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const fonts: { key: WordPrefs['font']; label: string; sample: string }[] = [
    { key: 'sans', label: 'Sans serif', sample: 'Aa Police moderne' },
    { key: 'serif', label: 'Serif', sample: 'Aa Police classique' },
    { key: 'mono', label: 'Monospace', sample: 'Aa Police code' },
  ];
  const sizes = [12, 13, 14, 15, 16, 18, 20];
  return (
    <ModalShell title="Préférences de l’éditeur" icon="ri-settings-3-line" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-medium text-foreground-600 mb-2">Police du document</p>
          <div className="grid grid-cols-3 gap-2">
            {fonts.map((f) => (
              <button
                key={f.key}
                onClick={() => onChange({ ...prefs, font: f.key })}
                className={`px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                  prefs.font === f.key
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-background-200/70 bg-white hover:bg-background-50'
                }`}
              >
                <span className="block text-xs font-medium text-foreground-800">{f.label}</span>
                <span className="block text-[11px] text-foreground-400 mt-0.5">{f.sample}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground-600 mb-2">Taille du texte de base</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => onChange({ ...prefs, fontSize: s })}
                className={`w-11 h-9 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                  prefs.fontSize === s
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-background-200/70 bg-white text-foreground-600 hover:bg-background-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-background-100 cursor-pointer">
          <span className="text-sm text-foreground-700">Espacement entre les paragraphes</span>
          <input
            type="checkbox"
            checked={prefs.paragraphSpacing}
            onChange={(e) => onChange({ ...prefs, paragraphSpacing: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
        </label>
      </div>
    </ModalShell>
  );
}

export function WordPromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue,
  confirmLabel = 'Valider',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultValue || '');
  useEffect(() => {
    if (open) setValue(defaultValue || '');
  }, [open, defaultValue]);
  if (!open) return null;
  return (
    <ModalShell title={title} icon="ri-edit-line" onClose={onClose} width="max-w-md">
      <label className="block text-xs font-medium text-foreground-600 mb-2">{label}</label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onConfirm(value.trim());
            onClose();
          }
        }}
        className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-white text-sm focus:outline-none focus:border-primary-300"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap"
        >
          Annuler
        </button>
        <button
          onClick={() => {
            if (!value.trim()) return;
            onConfirm(value.trim());
            onClose();
          }}
          disabled={!value.trim()}
          className="px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}