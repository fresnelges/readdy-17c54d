import type { MenuEntry, MenuGroup } from './WordMenuBar';
import type { DocumentAiAction } from '@/lib/documentAi';
import type { ExcelFormat, NumFormat } from '@/lib/documents';

export interface ExcelMenuHandlers {
  save: () => void;
  duplicate: () => void;
  rename: () => void;
  exportAs: (format: 'xlsx' | 'pdf' | 'csv') => void;
  print: () => void;
  share: () => void;
  history: () => void;
  close: () => void;
  del: () => void;
  canManage: boolean;

  cut: () => void;
  copy: () => void;
  paste: () => void;
  clearContents: () => void;

  addRowAbove: () => void;
  addRowBelow: () => void;
  addColLeft: () => void;
  addColRight: () => void;
  deleteRow: () => void;
  deleteCol: () => void;
  insertFormula: (value: string) => void;
  addSheet: () => void;

  sortAsc: () => void;
  sortDesc: () => void;
  toggleFilter: () => void;

  toggleBold: () => void;
  toggleItalic: () => void;
  toggleStrike: () => void;
  toggleWrap: () => void;
  align: (a: 'left' | 'center' | 'right') => void;
  setValign: (v: 'top' | 'middle' | 'bottom') => void;
  setTextColor: (color: string) => void;
  setBg: (color: string) => void;
  format: ExcelFormat;
  setNumFormat: (numFormat: NumFormat, currencySymbol?: string) => void;
  currentNumFormat?: NumFormat;
  currentCurrencySymbol?: string;
  clearFormat: () => void;
  conditionalFormat: () => void;
  adjustDecimals: (delta: number) => void;
  openCustomFormat: () => void;
  mergeCells: () => void;
  mergeAndCenter: () => void;
  unmergeCells: () => void;

  settings: { gridlines: boolean; formulaBar: boolean; zoom: number };
  toggleSetting: (key: 'gridlines' | 'formulaBar') => void;
  setZoom: (z: number) => void;

  freezeRows: number;
  freezeCols: number;
  setFreezeRows: (n: number) => void;
  setFreezeCols: (n: number) => void;

  ai: (action: DocumentAiAction) => void;

  notify: (msg: string) => void;
  showShortcuts: () => void;
  showAbout: () => void;
}

const DIV = { divider: true } as MenuEntry;

const BG_COLORS = [
  '#ffffff', '#fef08a', '#fed7aa', '#fecaca', '#e9d5ff', '#bfdbfe', '#a7f3d0',
  '#fde68a', '#fbcfe8', '#d9f99d', '#bae6fd', '#e5e7eb',
];

const TEXT_COLORS = [
  '#000000', '#334155', '#ffffff', '#dc2626', '#ea580c', '#16a34a',
  '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#a16207',
];

const FORMULAS: { label: string; value: string }[] = [
  { label: 'SOMME', value: '=SOMME()' },
  { label: 'MOYENNE', value: '=MOYENNE()' },
  { label: 'MAX', value: '=MAX()' },
  { label: 'MIN', value: '=MIN()' },
  { label: 'NB', value: '=NB()' },
  { label: 'SI', value: '=SI(condition; vrai; faux)' },
];

export function buildExcelMenus(h: ExcelMenuHandlers): MenuGroup[] {
  const f = h.format || {};
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
            { label: 'Excel (.xlsx)', icon: 'ri-file-excel-2-line', run: () => h.exportAs('xlsx') },
            { label: 'PDF (.pdf)', icon: 'ri-file-pdf-2-line', run: () => h.exportAs('pdf') },
            { label: 'CSV (.csv)', icon: 'ri-file-list-3-line', run: () => h.exportAs('csv') },
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
        { label: 'Couper', icon: 'ri-scissors-line', shortcut: 'Ctrl+X', run: h.cut },
        { label: 'Copier', icon: 'ri-file-copy-line', shortcut: 'Ctrl+C', run: h.copy },
        { label: 'Coller', icon: 'ri-clipboard-line', shortcut: 'Ctrl+V', run: h.paste },
        DIV,
        { label: 'Effacer le contenu', icon: 'ri-eraser-line', shortcut: 'Suppr', run: h.clearContents },
        DIV,
        {
          label: 'Supprimer',
          icon: 'ri-delete-bin-6-line',
          children: [
            { label: 'Supprimer la ligne', icon: 'ri-delete-row', run: h.deleteRow },
            { label: 'Supprimer la colonne', icon: 'ri-delete-column', run: h.deleteCol },
          ],
        },
      ],
    },
    {
      key: 'view',
      label: 'Affichage',
      entries: [
        { label: 'Afficher le quadrillage', icon: 'ri-grid-line', checked: h.settings.gridlines, run: () => h.toggleSetting('gridlines') },
        { label: 'Afficher la barre de formule', icon: 'ri-function-line', checked: h.settings.formulaBar, run: () => h.toggleSetting('formulaBar') },
        DIV,
        {
          label: 'Figer les volets',
          icon: 'ri-lock-line',
          children: [
            { label: 'Aucune ligne', checked: h.freezeRows === 0, run: () => h.setFreezeRows(0) },
            { label: '1 ligne', checked: h.freezeRows === 1, run: () => h.setFreezeRows(1) },
            { label: '2 lignes', checked: h.freezeRows === 2, run: () => h.setFreezeRows(2) },
            { label: '3 lignes', checked: h.freezeRows === 3, run: () => h.setFreezeRows(3) },
            DIV,
            { label: 'Aucune colonne', checked: h.freezeCols === 0, run: () => h.setFreezeCols(0) },
            { label: '1 colonne', checked: h.freezeCols === 1, run: () => h.setFreezeCols(1) },
            { label: '2 colonnes', checked: h.freezeCols === 2, run: () => h.setFreezeCols(2) },
          ],
        },
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
      key: 'insert',
      label: 'Insertion',
      entries: [
        { label: 'Ligne au-dessus', icon: 'ri-insert-row-top', run: h.addRowAbove },
        { label: 'Ligne en dessous', icon: 'ri-insert-row-bottom', run: h.addRowBelow },
        { label: 'Colonne à gauche', icon: 'ri-insert-column-left', run: h.addColLeft },
        { label: 'Colonne à droite', icon: 'ri-insert-column-right', run: h.addColRight },
        DIV,
        {
          label: 'Fonction',
          icon: 'ri-function-line',
          children: FORMULAS.map((x) => ({ label: x.label, run: () => h.insertFormula(x.value) })),
        },
        DIV,
        { label: 'Nouvelle feuille', icon: 'ri-add-line', run: h.addSheet },
      ],
    },
    {
      key: 'format',
      label: 'Format',
      entries: [
        { label: 'Gras', icon: 'ri-bold', shortcut: 'Ctrl+B', checked: !!f.bold, run: h.toggleBold },
        { label: 'Italique', icon: 'ri-italic', shortcut: 'Ctrl+I', checked: !!f.italic, run: h.toggleItalic },
        { label: 'Barré', icon: 'ri-strikethrough', checked: !!f.strike, run: h.toggleStrike },
        DIV,
        {
          label: 'Alignement',
          icon: 'ri-align-left',
          children: [
            { label: 'À gauche', icon: 'ri-align-left', checked: !f.align || f.align === 'left', run: () => h.align('left') },
            { label: 'Centré', icon: 'ri-align-center', checked: f.align === 'center', run: () => h.align('center') },
            { label: 'À droite', icon: 'ri-align-right', checked: f.align === 'right', run: () => h.align('right') },
          ],
        },
        {
          label: 'Alignement vertical',
          icon: 'ri-align-vertically',
          children: [
            { label: 'Haut', checked: f.valign === 'top', run: () => h.setValign('top') },
            { label: 'Milieu', checked: f.valign === 'middle', run: () => h.setValign('middle') },
            { label: 'Bas', checked: !f.valign || f.valign === 'bottom', run: () => h.setValign('bottom') },
          ],
        },
        { label: 'Renvoi à la ligne automatique', icon: 'ri-text-wrap', checked: !!f.wrap, run: h.toggleWrap },
        DIV,
        {
          label: 'Couleur du texte',
          icon: 'ri-font-color',
          grid: 6,
          children: TEXT_COLORS.map((c) => ({ label: c, color: c, run: () => h.setTextColor(c) })),
        },
        {
          label: 'Couleur de fond',
          icon: 'ri-paint-fill',
          grid: 6,
          children: BG_COLORS.map((c) => ({ label: c, color: c, run: () => h.setBg(c) })),
        },
        {
          label: 'Nombre',
          icon: 'ri-numbers-line',
          children: [
            { label: 'Automatique', checked: !h.currentNumFormat || h.currentNumFormat === 'auto', run: () => h.setNumFormat('auto') },
            { label: 'Nombre', checked: h.currentNumFormat === 'number', run: () => h.setNumFormat('number') },
            { label: 'Monnaie (€)', checked: h.currentNumFormat === 'currency' && h.currentCurrencySymbol !== '$', run: () => h.setNumFormat('currency', '€') },
            { label: 'Monnaie ($)', checked: h.currentNumFormat === 'currency' && h.currentCurrencySymbol === '$', run: () => h.setNumFormat('currency', '$') },
            { label: 'Comptable', checked: h.currentNumFormat === 'accounting', run: () => h.setNumFormat('accounting') },
            { label: 'Pourcentage', checked: h.currentNumFormat === 'percent', run: () => h.setNumFormat('percent') },
            { label: 'Date', checked: h.currentNumFormat === 'date', run: () => h.setNumFormat('date') },
            { label: 'Date et heure', checked: h.currentNumFormat === 'datetime', run: () => h.setNumFormat('datetime') },
            { label: 'Heure', checked: h.currentNumFormat === 'time', run: () => h.setNumFormat('time') },
            { label: 'Format personnalisé…', icon: 'ri-code-line', run: h.openCustomFormat },
          ],
        },
        { label: 'Ajouter une décimale', icon: 'ri-add-line', run: () => h.adjustDecimals(1) },
        { label: 'Retirer une décimale', icon: 'ri-subtract-line', run: () => h.adjustDecimals(-1) },
        DIV,
        { label: 'Mise en forme conditionnelle…', icon: 'ri-contrast-2-line', run: h.conditionalFormat },
        DIV,
        { label: 'Fusionner les cellules', icon: 'ri-layout-grid-fill', run: h.mergeCells },
        { label: 'Fusionner et centrer', icon: 'ri-layout-grid-line', run: h.mergeAndCenter },
        { label: 'Annuler la fusion', icon: 'ri-layout-grid-line', run: h.unmergeCells },
        DIV,
        { label: 'Effacer la mise en forme', icon: 'ri-format-clear', run: h.clearFormat },
      ],
    },
    {
      key: 'data',
      label: 'Données',
      entries: [
        { label: 'Trier A → Z', icon: 'ri-sort-asc', run: h.sortAsc },
        { label: 'Trier Z → A', icon: 'ri-sort-desc', run: h.sortDesc },
        DIV,
        { label: 'Filtrer', icon: 'ri-filter-line', checked: false, run: h.toggleFilter },
      ],
    },
    {
      key: 'tools',
      label: 'Outils',
      entries: [
        { label: 'Analyser les données', icon: 'ri-bar-chart-2-line', run: () => h.ai('summarize') },
        { label: 'Générer une formule', icon: 'ri-function-line', run: () => h.ai('write') },
        DIV,
        {
          label: 'Vérification orthographique',
          icon: 'ri-check-double-line',
          run: () => h.notify('La vérification orthographique arrive bientôt.'),
        },
      ],
    },
    {
      key: 'extensions',
      label: 'Extensions',
      entries: [
        {
          label: 'Modules complémentaires',
          icon: 'ri-puzzle-line',
          run: () => h.notify('Aucun module complémentaire installé.'),
        },
        {
          label: 'Macros',
          icon: 'ri-code-s-slash-line',
          run: () => h.notify('Les macros ne sont pas prises en charge.'),
        },
      ],
    },
    {
      key: 'ai',
      label: 'Assistant IA',
      entries: [
        { label: 'Générer une formule', icon: 'ri-function-line', run: () => h.ai('write') },
        { label: 'Analyser les données', icon: 'ri-bar-chart-2-line', run: () => h.ai('summarize') },
        { label: 'Expliquer la sélection', icon: 'ri-question-answer-line', run: () => h.ai('improve') },
        { label: 'Corriger le texte', icon: 'ri-check-double-line', run: () => h.ai('proofread') },
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