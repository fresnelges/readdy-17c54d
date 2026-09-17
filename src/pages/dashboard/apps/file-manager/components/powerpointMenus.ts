import type { MenuEntry, MenuGroup } from './WordMenuBar';
import type { DocumentAiAction } from '@/lib/documentAi';

export interface PowerPointMenuHandlers {
  save: () => void;
  duplicate: () => void;
  rename: () => void;
  exportAs: (format: 'pptx' | 'pdf') => void;
  print: () => void;
  share: () => void;
  history: () => void;
  close: () => void;
  del: () => void;
  canManage: boolean;

  addSlide: () => void;
  duplicateSlide: () => void;
  deleteSlide: () => void;
  moveUp: () => void;
  moveDown: () => void;

  align: (a: 'left' | 'center' | 'right') => void;
  setBg: (color: string) => void;

  settings: { present: boolean; zoom: number };
  togglePresent: () => void;
  setZoom: (z: number) => void;

  ai: (action: DocumentAiAction) => void;

  notify: (msg: string) => void;
  showShortcuts: () => void;
  showAbout: () => void;
}

const DIV = { divider: true } as MenuEntry;

const BG_COLORS = ['#ffffff', '#f5f5f4', '#fef3c7', '#ecfdf5', '#eff6ff', '#fdf2f8', '#1f2937'];

export function buildPowerPointMenus(h: PowerPointMenuHandlers): MenuGroup[] {
  return [
    {
      key: 'file',
      label: 'Fichier',
      entries: [
        { label: 'Enregistrer', icon: 'ri-save-line', shortcut: 'Ctrl+S', run: h.save },
        { label: 'Faire une copie', icon: 'ri-file-copy-line', run: h.duplicate },
        { label: 'Renommer le document', icon: 'ri-edit-line', run: h.rename },
        DIV,
        {
          label: 'Exporter',
          icon: 'ri-download-2-line',
          children: [
            { label: 'PowerPoint (.pptx)', icon: 'ri-file-ppt-2-line', run: () => h.exportAs('pptx') },
            { label: 'PDF (.pdf)', icon: 'ri-file-pdf-2-line', run: () => h.exportAs('pdf') },
          ],
        },
        { label: 'Imprimer', icon: 'ri-printer-line', shortcut: 'Ctrl+P', run: h.print },
        DIV,
        { label: 'Historique des versions', icon: 'ri-history-line', run: h.history },
        { label: 'Partager', icon: 'ri-share-line', run: h.share },
        DIV,
        { label: 'Fermer', icon: 'ri-close-line', shortcut: 'Échap', run: h.close },
        ...(h.canManage
          ? [{ label: 'Supprimer le document', icon: 'ri-delete-bin-line', danger: true, run: h.del }]
          : []),
      ],
    },
    {
      key: 'edit',
      label: 'Édition',
      entries: [
        { label: 'Dupliquer la diapositive', icon: 'ri-file-copy-line', shortcut: 'Ctrl+D', run: h.duplicateSlide },
        { label: 'Supprimer la diapositive', icon: 'ri-delete-bin-6-line', run: h.deleteSlide },
        DIV,
        { label: 'Monter la diapositive', icon: 'ri-arrow-up-line', run: h.moveUp },
        { label: 'Descendre la diapositive', icon: 'ri-arrow-down-line', run: h.moveDown },
      ],
    },
    {
      key: 'insert',
      label: 'Insertion',
      entries: [
        { label: 'Nouvelle diapositive', icon: 'ri-add-line', shortcut: 'Ctrl+M', run: h.addSlide },
        { label: 'Dupliquer la diapositive', icon: 'ri-file-copy-line', run: h.duplicateSlide },
      ],
    },
    {
      key: 'format',
      label: 'Format',
      entries: [
        {
          label: 'Alignement du texte',
          icon: 'ri-align-left',
          children: [
            { label: 'À gauche', icon: 'ri-align-left', run: () => h.align('left') },
            { label: 'Centré', icon: 'ri-align-center', run: () => h.align('center') },
            { label: 'À droite', icon: 'ri-align-right', run: () => h.align('right') },
          ],
        },
        {
          label: 'Couleur de fond',
          icon: 'ri-paint-fill',
          grid: 7,
          children: BG_COLORS.map((c) => ({ label: c, color: c, run: () => h.setBg(c) })),
        },
      ],
    },
    {
      key: 'view',
      label: 'Affichage',
      entries: [
        { label: h.settings.present ? 'Quitter la présentation' : 'Lancer la présentation', icon: 'ri-play-circle-line', shortcut: 'F5', run: h.togglePresent },
        DIV,
        {
          label: 'Zoom',
          icon: 'ri-zoom-in-line',
          children: [75, 100, 125, 150, 200].map((z) => ({
            label: `${z} %`,
            checked: h.settings.zoom === z,
            run: () => h.setZoom(z),
          })),
        },
      ],
    },
    {
      key: 'ai',
      label: 'Assistant IA',
      entries: [
        { label: 'Générer du contenu', icon: 'ri-quill-pen-line', run: () => h.ai('write') },
        { label: 'Améliorer le texte', icon: 'ri-sparkling-line', run: () => h.ai('improve') },
        { label: 'Résumer la diapositive', icon: 'ri-file-reduce-line', run: () => h.ai('summarize') },
        { label: 'Raccourcir', icon: 'ri-contract-line', run: () => h.ai('shorten') },
      ],
    },
    {
      key: 'help',
      label: 'Aide',
      entries: [
        { label: 'Raccourcis clavier', icon: 'ri-keyboard-line', shortcut: 'Ctrl+/', run: h.showShortcuts },
        { label: 'À propos de l\u2019éditeur', icon: 'ri-question-line', run: h.showAbout },
      ],
    },
  ];
}