import type { ReactNode } from 'react';

function ModalShell({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground-950/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-background-50 border border-background-200/70 rounded-lg overflow-hidden"
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

export function EditorShortcutsDialog({
  open,
  shortcuts,
  onClose,
}: {
  open: boolean;
  shortcuts: [string, string][];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <ModalShell title="Raccourcis clavier" icon="ri-keyboard-line" onClose={onClose}>
      <div className="flex flex-col divide-y divide-background-200/70">
        {shortcuts.map(([keys, label]) => (
          <div key={keys} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-foreground-700">{label}</span>
            <span className="px-2.5 py-1 rounded-md bg-background-100 text-xs font-medium text-foreground-700 whitespace-nowrap">
              {keys}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

export function EditorAboutDialog({
  open,
  title,
  description,
  features,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  features: string[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <ModalShell title={title} icon="ri-question-line" onClose={onClose}>
      <p className="text-sm text-foreground-700 leading-relaxed">{description}</p>
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
        L'assistant IA utilise l'API configurée dans les paramètres du superadmin.
      </div>
    </ModalShell>
  );
}