// ── Types partagés du builder d'apps ────────────────────────

export interface AppPage {
  id: number;
  app_id: number;
  title: string;
  slug: string;
  icon: string;
  position: number;
  visibility: string;
  native?: boolean;
}

export interface AppBlock {
  id: number;
  page_id: number;
  type: string;
  content: Record<string, unknown>;
  position: number;
}

export interface AppForm {
  id: number;
  app_id: number;
  name: string;
  title: string;
  description: string;
  position: number;
}

export interface AppFormField {
  id: number;
  form_id: number;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  position: number;
}

export interface AppTable {
  id: number;
  app_id: number;
  name: string;
  slug: string;
  position: number;
}

export interface AppTableField {
  id: number;
  table_id: number;
  label: string;
  type: string;
  position: number;
}

export interface AppTableRow {
  id: number;
  table_id: number;
  data: Record<string, unknown>;
  created_at: string;
}

export interface AppSetting {
  id: number;
  app_id: number;
  key: string;
  label: string;
  type: string;
  value: string;
  options: string[];
  position: number;
}

// ── Types de blocs ───────────────────────────────────────────

export const BLOCK_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'heading', label: 'Titre', icon: 'ri-heading' },
  { type: 'text', label: 'Texte', icon: 'ri-text' },
  { type: 'image', label: 'Image', icon: 'ri-image-line' },
  { type: 'list', label: 'Liste', icon: 'ri-list-check' },
  { type: 'form', label: 'Formulaire', icon: 'ri-survey-line' },
  { type: 'table', label: 'Tableau de données', icon: 'ri-table-line' },
  { type: 'spacer', label: 'Espace', icon: 'ri-space' },
];

export function getBlockLabel(type: string): string {
  return BLOCK_TYPES.find((b) => b.type === type)?.label || type;
}

// ── Types de champs de formulaire ────────────────────────────

export const FORM_FIELD_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'text', label: 'Texte court', icon: 'ri-text' },
  { type: 'textarea', label: 'Texte long', icon: 'ri-align-left' },
  { type: 'email', label: 'Email', icon: 'ri-mail-line' },
  { type: 'number', label: 'Nombre', icon: 'ri-hashtag' },
  { type: 'tel', label: 'Téléphone', icon: 'ri-phone-line' },
  { type: 'date', label: 'Date', icon: 'ri-calendar-line' },
  { type: 'select', label: 'Liste déroulante', icon: 'ri-list-check' },
  { type: 'radio', label: 'Choix unique', icon: 'ri-radio-button-line' },
  { type: 'checkbox', label: 'Cases à cocher', icon: 'ri-checkbox-line' },
];

export function getFieldLabel(type: string): string {
  return FORM_FIELD_TYPES.find((f) => f.type === type)?.label || type;
}

// ── Types de champs de table de données ──────────────────────

export const TABLE_FIELD_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'text', label: 'Texte', icon: 'ri-text' },
  { type: 'number', label: 'Nombre', icon: 'ri-hashtag' },
  { type: 'date', label: 'Date', icon: 'ri-calendar-line' },
  { type: 'select', label: 'Choix', icon: 'ri-list-check' },
  { type: 'boolean', label: 'Oui/Non', icon: 'ri-toggle-line' },
];

// ── Types de réglages ────────────────────────────────────────

export const SETTING_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'text', label: 'Texte', icon: 'ri-text' },
  { type: 'number', label: 'Nombre', icon: 'ri-hashtag' },
  { type: 'toggle', label: 'Interrupteur', icon: 'ri-toggle-line' },
  { type: 'select', label: 'Choix', icon: 'ri-list-check' },
];

// ── Icônes de pages disponibles ──────────────────────────────

export const PAGE_ICONS: string[] = [
  'ri-file-text-line',
  'ri-home-line',
  'ri-user-line',
  'ri-settings-3-line',
  'ri-bar-chart-line',
  'ri-dashboard-line',
  'ri-store-line',
  'ri-message-3-line',
  'ri-image-line',
  'ri-calendar-line',
  'ri-price-tag-3-line',
  'ri-map-pin-line',
];