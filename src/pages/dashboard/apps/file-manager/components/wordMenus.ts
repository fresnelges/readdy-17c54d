import type { MenuEntry, MenuGroup } from './WordMenuBar';
import type { DocumentAiAction } from '@/lib/documentAi';

export interface WordMenuHandlers {
  exec: (command: string, value?: string) => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  pastePlain: () => void;
  selectAll: () => void;
  deleteSelection: () => void;

  openFindReplace: () => void;
  insertImage: () => void;
  insertImageFromUrl: () => void;
  insertTable: (rows: number, cols: number) => void;
  insertLink: () => void;
  insertHtml: (html: string) => void;
  insertText: (text: string) => void;
  addComment: () => void;
  toggleComments: () => void;

  lineHeight: (value: string) => void;
  columns: (n: number) => void;
  insertTableOfContents: () => void;

  save: () => void;
  print: () => void;
  exportAs: (format: 'docx' | 'pdf' | 'html' | 'txt') => void;
  rename: () => void;
  duplicate: () => void;
  del: () => void;
  close: () => void;
  share: () => void;
  history: () => void;
  importFile: () => void;

  setZoom: (z: number) => void;
  toggleSetting: (key: 'ruler' | 'toolbar' | 'marks' | 'spellcheck' | 'pagination' | 'fullscreen') => void;
  settings: {
    ruler: boolean;
    toolbar: boolean;
    marks: boolean;
    spellcheck: boolean;
    pagination: boolean;
    fullscreen: boolean;
    zoom: number;
  };

  showStats: () => void;
  showShortcuts: () => void;
  showAbout: () => void;
  showPreferences: () => void;

  trackChanges: boolean;
  toggleTrackChanges: () => void;
  acceptTrackChanges: () => void;

  notify: (message: string) => void;

  ai: (action: DocumentAiAction, options?: { targetLang?: string; targetTone?: string }) => void;

  canManage: boolean;
}

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#b91c1c', '#ea580c', '#d97706', '#eab308', '#65a30d', '#16a34a',
  '#0d9488', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fed7aa', '#fecaca', '#e9d5ff', '#bfdbfe', '#a7f3d0',
  '#fde68a', '#fbcfe8', '#d9f99d', '#bae6fd', '#e5e7eb', '#ffffff',
];

const SPECIAL_CHARS = ['—', '–', '«', '»', '“', '”', '’', '€', '$', '£', '¥', '§', '¶', '©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '→', '←', '↑', '↓', '•', '·', '…', '†', '‡', '№'];

const EMOJIS = ['😀', '😊', '😉', '😍', '🤝', '👍', '👏', '🙏', '💡', '✅', '❗', '⭐', '🔥', '🚀', '📌', '📊', '📈', '📅', '📎', '🔔'];

const DIV = { divider: true } as MenuEntry;

const colorEntries = (
  label: string,
  colors: string[],
  apply: (value: string) => void,
): MenuEntry => ({
  label,
  icon: 'ri-palette-line',
  grid: 6,
  children: colors.map((c) => ({ label: c, color: c, run: () => apply(c) })),
});

export function buildWordMenus(h: WordMenuHandlers): MenuGroup[] {
  return [
    {
      key: 'file',
      label: 'Fichier',
      entries: [
        { label: 'Enregistrer', icon: 'ri-save-line', shortcut: 'Ctrl+S', run: h.save },
        { label: 'Faire une copie', icon: 'ri-file-copy-line', run: h.duplicate },
        { label: 'Renommer le document', icon: 'ri-edit-line', run: h.rename },
        { label: 'Importer un fichier', icon: 'ri-upload-2-line', run: h.importFile },
        DIV,
        {
          label: 'Exporter',
          icon: 'ri-download-2-line',
          children: [
            { label: 'Microsoft Word (.docx)', icon: 'ri-file-word-2-line', run: () => h.exportAs('docx') },
            { label: 'PDF (.pdf)', icon: 'ri-file-pdf-2-line', run: () => h.exportAs('pdf') },
            { label: 'Page Web (.html)', icon: 'ri-code-s-slash-line', run: () => h.exportAs('html') },
            { label: 'Texte brut (.txt)', icon: 'ri-file-text-line', run: () => h.exportAs('txt') },
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
        { label: 'Annuler', icon: 'ri-arrow-go-back-line', shortcut: 'Ctrl+Z', run: () => h.exec('undo') },
        { label: 'Rétablir', icon: 'ri-arrow-go-forward-line', shortcut: 'Ctrl+Y', run: () => h.exec('redo') },
        DIV,
        { label: 'Couper', icon: 'ri-scissors-line', shortcut: 'Ctrl+X', run: h.cut },
        { label: 'Copier', icon: 'ri-file-copy-line', shortcut: 'Ctrl+C', run: h.copy },
        { label: 'Coller', icon: 'ri-clipboard-line', shortcut: 'Ctrl+V', run: h.paste },
        { label: 'Coller sans mise en forme', icon: 'ri-clipboard-line', shortcut: 'Ctrl+Maj+V', run: h.pastePlain },
        DIV,
        { label: 'Tout sélectionner', icon: 'ri-checkbox-multiple-line', shortcut: 'Ctrl+A', run: h.selectAll },
        { label: 'Rechercher et remplacer', icon: 'ri-search-line', shortcut: 'Ctrl+F', run: h.openFindReplace },
        DIV,
        {
          label: 'Supprimer',
          icon: 'ri-delete-bin-6-line',
          children: [
            { label: 'Supprimer la sélection', run: h.deleteSelection },
            { label: 'Supprimer le formatage', run: () => h.exec('removeFormat') },
          ],
        },
      ],
    },
    {
      key: 'view',
      label: 'Affichage',
      entries: [
        {
          label: 'Mode d\u2019affichage',
          icon: 'ri-layout-masonry-line',
          children: [
            { label: 'Sans pagination', checked: !h.settings.pagination, run: () => h.toggleSetting('pagination') },
            { label: 'Pages (format A4)', checked: h.settings.pagination, run: () => h.toggleSetting('pagination') },
          ],
        },
        DIV,
        { label: 'Suivi des modifications', icon: 'ri-edit-circle-line', checked: h.trackChanges, run: h.toggleTrackChanges },
        { label: 'Afficher la règle', icon: 'ri-ruler-line', checked: h.settings.ruler, run: () => h.toggleSetting('ruler') },
        { label: 'Afficher la barre d\u2019outils', icon: 'ri-layout-top-line', checked: h.settings.toolbar, run: () => h.toggleSetting('toolbar') },
        { label: 'Afficher les caractères non imprimables', icon: 'ri-eye-line', checked: h.settings.marks, run: () => h.toggleSetting('marks') },
        DIV,
        {
          label: 'Zoom',
          icon: 'ri-zoom-in-line',
          children: [50, 75, 100, 125, 150, 200].map((z) => ({
            label: `${z} %`,
            checked: h.settings.zoom === z,
            run: () => h.setZoom(z),
          })),
        },
        { label: h.settings.fullscreen ? 'Quitter le plein écran' : 'Plein écran', icon: 'ri-fullscreen-line', run: () => h.toggleSetting('fullscreen') },
      ],
    },
    {
      key: 'insert',
      label: 'Insertion',
      entries: [
        {
          label: 'Image',
          icon: 'ri-image-line',
          children: [
            { label: 'Importer depuis l\u2019ordinateur', icon: 'ri-upload-2-line', run: h.insertImage },
            { label: 'À partir d\u2019une URL', icon: 'ri-link', run: h.insertImageFromUrl },
          ],
        },
        {
          label: 'Tableau',
          icon: 'ri-table-line',
          children: [
            { label: '2 × 2', run: () => h.insertTable(2, 2) },
            { label: '3 × 3', run: () => h.insertTable(3, 3) },
            { label: '4 × 4', run: () => h.insertTable(4, 4) },
            { label: '5 × 3', run: () => h.insertTable(5, 3) },
            { label: '5 × 5', run: () => h.insertTable(5, 5) },
            { label: '8 × 4', run: () => h.insertTable(8, 4) },
          ],
        },
        { label: 'Lien', icon: 'ri-link', shortcut: 'Ctrl+K', run: h.insertLink },
        { label: 'Commentaire', icon: 'ri-chat-1-line', shortcut: 'Ctrl+Alt+M', run: h.addComment },
        { label: 'Ligne horizontale', icon: 'ri-separator', run: () => h.insertHtml('<hr style="border:none;border-top:1px solid #d1d5db;margin:16px 0;" />') },
        {
          label: 'Saut de page',
          icon: 'ri-page-separator',
          run: () => h.insertHtml('<div style="page-break-after:always;border-top:1px dashed #cbd5e1;margin:20px 0;"></div>'),
        },
        DIV,
        {
          label: 'Caractères spéciaux',
          icon: 'ri-omega',
          grid: 6,
          children: SPECIAL_CHARS.map((c) => ({ label: c, run: () => h.insertText(c) })),
        },
        {
          label: 'Émoji',
          icon: 'ri-emotion-happy-line',
          grid: 5,
          children: EMOJIS.map((e) => ({ label: e, run: () => h.insertText(e) })),
        },
        DIV,
        {
          label: 'Date',
          icon: 'ri-calendar-line',
          run: () => h.insertText(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })),
        },
        {
          label: 'Heure',
          icon: 'ri-time-line',
          run: () => h.insertText(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })),
        },
        {
          label: 'Zone de texte',
          icon: 'ri-text',
          run: () => h.insertHtml('<div style="border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;margin:10px 0;">Zone de texte</div>'),
        },
        { label: 'Case à cocher', icon: 'ri-checkbox-line', run: () => h.insertText('☐ ') },
        DIV,
        { label: 'Table des matières', icon: 'ri-list-check-2', run: h.insertTableOfContents },
      ],
    },
    {
      key: 'format',
      label: 'Format',
      entries: [
        {
          label: 'Texte',
          icon: 'ri-text',
          children: [
            { label: 'Gras', icon: 'ri-bold', shortcut: 'Ctrl+B', run: () => h.exec('bold') },
            { label: 'Italique', icon: 'ri-italic', shortcut: 'Ctrl+I', run: () => h.exec('italic') },
            { label: 'Souligné', icon: 'ri-underline', shortcut: 'Ctrl+U', run: () => h.exec('underline') },
            { label: 'Barré', icon: 'ri-strikethrough', run: () => h.exec('strikeThrough') },
            DIV,
            { label: 'Exposant', icon: 'ri-superscript', run: () => h.exec('superscript') },
            { label: 'Indice', icon: 'ri-subscript', run: () => h.exec('subscript') },
          ],
        },
        {
          label: 'Alignement',
          icon: 'ri-align-left',
          children: [
            { label: 'À gauche', icon: 'ri-align-left', run: () => h.exec('justifyLeft') },
            { label: 'Centré', icon: 'ri-align-center', run: () => h.exec('justifyCenter') },
            { label: 'À droite', icon: 'ri-align-right', run: () => h.exec('justifyRight') },
            { label: 'Justifié', icon: 'ri-align-justify', run: () => h.exec('justifyFull') },
          ],
        },
        {
          label: 'Interligne',
          icon: 'ri-line-height',
          children: [
            { label: 'Simple', run: () => h.lineHeight('1.15') },
            { label: '1,5', run: () => h.lineHeight('1.5') },
            { label: 'Double', run: () => h.lineHeight('2') },
            { label: 'Personnalisé 2,5', run: () => h.lineHeight('2.5') },
          ],
        },
        {
          label: 'Listes',
          icon: 'ri-list-unordered',
          children: [
            { label: 'Liste à puces', icon: 'ri-list-unordered', run: () => h.exec('insertUnorderedList') },
            { label: 'Liste numérotée', icon: 'ri-list-ordered', run: () => h.exec('insertOrderedList') },
            { label: 'Cases à cocher', icon: 'ri-checkbox-line', run: () => h.insertText('☐ ') },
          ],
        },
        {
          label: 'Colonnes',
          icon: 'ri-layout-column-line',
          children: [
            { label: '1 colonne', run: () => h.columns(1) },
            { label: '2 colonnes', run: () => h.columns(2) },
            { label: '3 colonnes', run: () => h.columns(3) },
          ],
        },
        {
          label: 'Titres et styles',
          icon: 'ri-heading',
          children: [
            { label: 'Normal', icon: 'ri-text', run: () => h.exec('formatBlock', 'p') },
            { label: 'Titre 1', icon: 'ri-h-1', run: () => h.exec('formatBlock', 'h1') },
            { label: 'Titre 2', icon: 'ri-h-2', run: () => h.exec('formatBlock', 'h2') },
            { label: 'Titre 3', icon: 'ri-h-3', run: () => h.exec('formatBlock', 'h3') },
            { label: 'Titre 4', icon: 'ri-h-4', run: () => h.exec('formatBlock', 'h4') },
            { label: 'Citation', icon: 'ri-double-quotes-l', run: () => h.exec('formatBlock', 'blockquote') },
          ],
        },
        DIV,
        colorEntries('Couleur du texte', TEXT_COLORS, (c) => h.exec('foreColor', c)),
        colorEntries('Surlignage', HIGHLIGHT_COLORS, (c) => h.exec('hiliteColor', c)),
        DIV,
        { label: 'Effacer la mise en forme', icon: 'ri-format-clear', run: () => h.exec('removeFormat') },
      ],
    },
    {
      key: 'tools',
      label: 'Outils',
      entries: [
        { label: 'Orthographe et grammaire', icon: 'ri-check-double-line', checked: h.settings.spellcheck, run: () => h.toggleSetting('spellcheck') },
        { label: 'Corriger avec l\u2019IA', icon: 'ri-magic-line', run: () => h.ai('proofread') },
        DIV,
        { label: 'Comptage des mots', icon: 'ri-file-list-3-line', shortcut: 'Ctrl+Maj+C', run: h.showStats },
        { label: 'Statistiques du document', icon: 'ri-bar-chart-2-line', run: h.showStats },
        DIV,
        {
          label: 'Dictionnaire',
          icon: 'ri-book-2-line',
          children: [
            { label: 'Français (Larousse)', run: () => window.open('https://www.larousse.fr/dictionnaires/francais', '_blank', 'noopener') },
            { label: 'Synonymes (WordReference)', run: () => window.open('https://www.wordreference.com/fr/', '_blank', 'noopener') },
          ],
        },
        { label: 'Traduire le document', icon: 'ri-translate-2', run: () => h.ai('translate', { targetLang: 'anglais' }) },
        DIV,
        { label: 'Accepter toutes les modifications', icon: 'ri-check-double-line', run: h.acceptTrackChanges },
        DIV,
        { label: 'Préférences de l\u2019éditeur', icon: 'ri-settings-3-line', run: h.showPreferences },
      ],
    },
    {
      key: 'ai',
      label: 'Assistant IA',
      entries: [
        { label: 'Aide-moi à écrire', icon: 'ri-quill-pen-line', run: () => h.ai('write') },
        { label: 'Continuer le texte', icon: 'ri-arrow-right-line', run: () => h.ai('continue') },
        { label: 'Améliorer la rédaction', icon: 'ri-sparkling-line', run: () => h.ai('improve') },
        { label: 'Résumer le document', icon: 'ri-file-reduce-line', run: () => h.ai('summarize') },
        { label: 'Générer un plan', icon: 'ri-list-check', run: () => h.ai('outline') },
        DIV,
        { label: 'Corriger l\u2019orthographe', icon: 'ri-check-double-line', run: () => h.ai('proofread') },
        { label: 'Raccourcir', icon: 'ri-contract-line', run: () => h.ai('shorten') },
        { label: 'Développer', icon: 'ri-expand-width-line', run: () => h.ai('expand') },
        {
          label: 'Changer le ton',
          icon: 'ri-emotion-line',
          children: [
            { label: 'Professionnel', run: () => h.ai('tone', { targetTone: 'professionnel' }) },
            { label: 'Formel', run: () => h.ai('tone', { targetTone: 'formel et soutenu' }) },
            { label: 'Amical', run: () => h.ai('tone', { targetTone: 'amical et chaleureux' }) },
            { label: 'Concis', run: () => h.ai('tone', { targetTone: 'concis et direct' }) },
            { label: 'Commercial', run: () => h.ai('tone', { targetTone: 'commercial et persuasif' }) },
          ],
        },
        {
          label: 'Traduire',
          icon: 'ri-translate-2',
          children: [
            { label: 'Anglais', run: () => h.ai('translate', { targetLang: 'anglais' }) },
            { label: 'Espagnol', run: () => h.ai('translate', { targetLang: 'espagnol' }) },
            { label: 'Arabe', run: () => h.ai('translate', { targetLang: 'arabe' }) },
            { label: 'Allemand', run: () => h.ai('translate', { targetLang: 'allemand' }) },
            { label: 'Italien', run: () => h.ai('translate', { targetLang: 'italien' }) },
          ],
        },
        DIV,
        { label: 'Mettre en forme en HTML', icon: 'ri-code-s-slash-line', run: () => h.ai('html') },
      ],
    },
    {
      key: 'extensions',
      label: 'Extensions',
      entries: [
        { label: 'Générateur de sommaire', icon: 'ri-list-check-2', run: h.insertTableOfContents },
        { label: 'Correcteur IA avancé', icon: 'ri-magic-line', run: () => h.ai('proofread') },
        { label: 'Insérer des émojis', icon: 'ri-emotion-happy-line', run: () => h.notify('Utilisez Insertion → Émoji pour ajouter des émojis.') },
        DIV,
        { label: 'Gérer les extensions', icon: 'ri-apps-2-line', run: h.showAbout },
      ],
    },
    {
      key: 'help',
      label: 'Aide',
      entries: [
        { label: 'Aide de l\u2019éditeur', icon: 'ri-question-line', run: h.showAbout },
        { label: 'Raccourcis clavier', icon: 'ri-keyboard-line', shortcut: 'Ctrl+/', run: h.showShortcuts },
        DIV,
        { label: 'Préférences', icon: 'ri-settings-3-line', run: h.showPreferences },
        { label: 'Signaler un problème', icon: 'ri-flag-line', run: () => h.notify('Merci ! Votre signalement a bien été pris en compte.') },
      ],
    },
  ];
}