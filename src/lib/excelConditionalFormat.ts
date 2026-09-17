import type { CondFormatOperator, ConditionalFormatRule } from './documents';
import { parseNumericValue } from './excelNumberFormat';

export interface CondOperatorOption {
  value: CondFormatOperator;
  label: string;
  needsValue: boolean;
  needsValue2?: boolean;
}

// Liste des opérateurs proposés dans la boîte de dialogue, ordonnée de façon
// lisible (vides, comparaisons, texte, dates).
export const COND_OPERATORS: CondOperatorOption[] = [
  { value: 'isEmpty', label: 'La cellule est vide' },
  { value: 'notEmpty', label: 'La cellule n\u2019est pas vide' },
  { value: 'gt', label: 'Supérieur à', needsValue: true },
  { value: 'gte', label: 'Supérieur ou égal à', needsValue: true },
  { value: 'lt', label: 'Inférieur à', needsValue: true },
  { value: 'lte', label: 'Inférieur ou égal à', needsValue: true },
  { value: 'eq', label: 'Égal à', needsValue: true },
  { value: 'neq', label: 'Différent de', needsValue: true },
  { value: 'between', label: 'Compris entre', needsValue: true, needsValue2: true },
  { value: 'contains', label: 'Le texte contient', needsValue: true },
  { value: 'notContains', label: 'Le texte ne contient pas', needsValue: true },
  { value: 'startsWith', label: 'Le texte commence par', needsValue: true },
  { value: 'endsWith', label: 'Le texte se termine par', needsValue: true },
  { value: 'dateIs', label: 'La date est', needsValue: true },
  { value: 'dateBefore', label: 'La date est avant', needsValue: true },
  { value: 'dateAfter', label: 'La date est après', needsValue: true },
];

// Couleurs de fond proposées par défaut, proches de celles de Google Sheets.
export const COND_BG_PRESETS = [
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc',
  '#eeeeee',
];

export const COND_TEXT_PRESETS = [
  '#990000',
  '#783f04',
  '#7f6000',
  '#274e13',
  '#0b5394',
  '#351c75',
  '#741b47',
  '#333333',
];

// Analyse une date en millisecondes (timestamp). Gère les formats ISO,
// français et les numéros de série Excel.
function parseDateValue(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(y, +m[2] - 1, +m[1]).getTime();
  }
  const num = parseNumericValue(t);
  if (num !== null && num >= 1 && num <= 2958465) {
    return Math.round((num - 25569) * 86400000);
  }
  return null;
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// Évalue une règle de mise en forme conditionnelle sur la valeur affichée
// d'une cellule (avant application du format de nombre).
export function evaluateConditionalRule(display: string, rule: ConditionalFormatRule): boolean {
  const v = display;
  const trimmed = v.trim();
  const needle = rule.value ?? '';
  const needle2 = rule.value2 ?? '';

  switch (rule.operator) {
    case 'isEmpty':
      return trimmed === '';
    case 'notEmpty':
      return trimmed !== '';
    case 'contains':
      return needle !== '' && v.toLowerCase().includes(needle.toLowerCase());
    case 'notContains':
      return needle === '' || !v.toLowerCase().includes(needle.toLowerCase());
    case 'startsWith':
      return needle !== '' && v.toLowerCase().startsWith(needle.toLowerCase());
    case 'endsWith':
      return needle !== '' && v.toLowerCase().endsWith(needle.toLowerCase());
    default:
      break;
  }

  // Opérateurs numériques.
  if (
    rule.operator === 'gt' ||
    rule.operator === 'gte' ||
    rule.operator === 'lt' ||
    rule.operator === 'lte' ||
    rule.operator === 'between'
  ) {
    const num = parseNumericValue(v);
    if (num === null) return false;
    const t1 = parseNumericValue(needle);
    if (t1 === null) return false;
    if (rule.operator === 'gt') return num > t1;
    if (rule.operator === 'gte') return num >= t1;
    if (rule.operator === 'lt') return num < t1;
    if (rule.operator === 'lte') return num <= t1;
    const t2 = parseNumericValue(needle2);
    if (t2 === null) return false;
    const lo = Math.min(t1, t2);
    const hi = Math.max(t1, t2);
    return num >= lo && num <= hi;
  }

  // Égal / différent : numérique si les deux sont des nombres, sinon texte.
  if (rule.operator === 'eq' || rule.operator === 'neq') {
    const num = parseNumericValue(v);
    const t1 = parseNumericValue(needle);
    let eq: boolean;
    if (num !== null && t1 !== null) {
      eq = num === t1;
    } else {
      eq = trimmed.toLowerCase() === needle.trim().toLowerCase();
    }
    return rule.operator === 'eq' ? eq : !eq;
  }

  // Opérateurs de date.
  if (rule.operator === 'dateIs' || rule.operator === 'dateBefore' || rule.operator === 'dateAfter') {
    const cellDate = parseDateValue(v);
    const target = parseDateValue(needle);
    if (cellDate === null || target === null) return false;
    if (rule.operator === 'dateIs') return sameDay(cellDate, target);
    if (rule.operator === 'dateBefore') return cellDate < target;
    return cellDate > target;
  }

  return false;
}

// Résout le style (fond + couleur de texte) à appliquer à une cellule selon
// les règles qui la concernent. Les règles suivantes priment sur les
// précédentes, comme sur Google Sheets.
export function resolveConditionalStyle(
  display: string,
  rules: ConditionalFormatRule[] | undefined,
  r: number,
  c: number,
): { bg?: string; color?: string } {
  let bg: string | undefined;
  let color: string | undefined;
  if (!rules) return { bg, color };
  for (const rule of rules) {
    if (r < rule.r1 || r > rule.r2 || c < rule.c1 || c > rule.c2) continue;
    if (evaluateConditionalRule(display, rule)) {
      if (rule.bg) bg = rule.bg;
      if (rule.color) color = rule.color;
    }
  }
  return { bg, color };
}