import type { ExcelFormat, NumFormat } from './documents';

export interface NumFormatOption {
  key: string;
  label: string;
  numFormat: NumFormat;
  currencySymbol?: string;
}

export const NUM_FORMAT_OPTIONS: NumFormatOption[] = [
  { key: 'auto', label: 'Automatique', numFormat: 'auto' },
  { key: 'number', label: 'Nombre', numFormat: 'number' },
  { key: 'currency-eur', label: 'Monnaie (€)', numFormat: 'currency', currencySymbol: '€' },
  { key: 'currency-usd', label: 'Monnaie ($)', numFormat: 'currency', currencySymbol: '$' },
  { key: 'percent', label: 'Pourcentage', numFormat: 'percent' },
  { key: 'date', label: 'Date', numFormat: 'date' },
  { key: 'datetime', label: 'Date et heure', numFormat: 'datetime' },
  { key: 'time', label: 'Heure', numFormat: 'time' },
  { key: 'accounting', label: 'Comptable', numFormat: 'accounting' },
];

// Analyse un nombre écrit au format français (« 1 234,50 ») ou anglo-saxon
// (« 1,234.50 »). Retire les symboles monétaires et les espaces.
export function parseNumericValue(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  let t = s.trim();
  if (t === '') return null;
  t = t.replace(/[\s\u00a0\u202f€$£%]/g, '');
  if (t === '') return null;
  const hasComma = t.includes(',');
  const hasDot = t.includes('.');
  let num: number;
  if (hasComma && hasDot) {
    // Le séparateur le plus à droite est la décimale.
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) {
      num = Number(t.replace(/\./g, '').replace(',', '.'));
    } else {
      num = Number(t.replace(/,/g, ''));
    }
  } else if (hasComma) {
    num = Number(t.replace(',', '.'));
  } else {
    num = Number(t);
  }
  return Number.isFinite(num) ? num : null;
}

const intlCache = new Map<number, Intl.NumberFormat>();

function fmtIntl(decimals: number): Intl.NumberFormat {
  let f = intlCache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    intlCache.set(decimals, f);
  }
  return f;
}

function fmtIntlGrouping(decimals: number, useGrouping: boolean): Intl.NumberFormat {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });
}

// Interprète un format personnalisé façon Sheets/Excel (ex. « # ##0,00 € »,
// « 0% », « #,##0.00 », « 0,00 $ »). Gère : symbole monétaire, pourcentage,
// séparateur de milliers et nombre de décimales.
export function applyCustomFormat(display: string, custom: string): string {
  const format = custom.trim();
  if (!format) return display;
  const num = parseNumericValue(display);
  if (num === null) return display;

  // 1) Symbole monétaire littéral (en fin ou début de format).
  let symbol = '';
  let work = format;
  const symMatch = /([€$£¥]|USD|EUR|GBP)/i.exec(work);
  if (symMatch) {
    symbol = symMatch[0];
    work = work.replace(symMatch[0], '');
  }

  // 2) Pourcentage.
  const isPercent = work.includes('%');
  work = work.replace(/%/g, '');

  // 3) Nombre de décimales : compter les 0/# après le dernier séparateur décimal.
  let decimals = 0;
  const lastSep = Math.max(work.lastIndexOf('.'), work.lastIndexOf(','));
  if (lastSep >= 0) {
    const frac = work.slice(lastSep + 1);
    let count = 0;
    for (const ch of frac) {
      if (ch === '0' || ch === '#') count += 1;
      else break;
    }
    decimals = count;
    work = work.slice(0, lastSep);
  }

  // 4) Séparateur de milliers : présence de virgule ou espace dans la partie entière.
  const useGrouping = /[,\s]/.test(work);

  const value = isPercent ? num * 100 : num;
  let formatted = fmtIntlGrouping(decimals, useGrouping).format(value);
  if (symbol) formatted = `${formatted} ${symbol}`;
  if (isPercent) formatted = `${formatted} %`;
  return formatted;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Numéro de série Excel : 1 = 1900-01-01. 25569 = jours entre 1970 et 1900.
function excelSerialToDate(serial: number): Date | null {
  if (serial < 1 || serial > 2958465) return null;
  const ms = Math.round((serial - 25569) * 86400000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateValue(s: string, withTime: boolean): string {
  const t = s.trim();
  if (t === '') return s;
  // 1) Date + heure : « 2026-09-17 14:30 » ou « 2026-09-17T14:30:00 ».
  const dtm = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t);
  if (dtm) {
    const date = `${pad2(+dtm[3])}/${pad2(+dtm[2])}/${dtm[1]}`;
    return withTime ? `${date} ${pad2(+dtm[4])}:${pad2(+dtm[5])}` : date;
  }
  // 2) Date ISO : « 2026-09-17 ».
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (iso) return `${pad2(+iso[3])}/${pad2(+iso[2])}/${iso[1]}`;
  // 3) Date française : « 17/09/2026 », « 17-09-2026 », « 17.09.2026 ».
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (fr) {
    const y = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return `${pad2(+fr[1])}/${pad2(+fr[2])}/${y}`;
  }
  // 4) Nombre (numéro de série Excel).
  const num = parseNumericValue(t);
  if (num !== null) {
    const d = excelSerialToDate(num);
    if (d) {
      const date = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      return withTime ? `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : date;
    }
  }
  return s;
}

function formatTimeValue(s: string): string {
  const t = s.trim();
  if (t === '') return s;
  // Heure déjà écrite « 14:30 » / « 14:30:00 ».
  const tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t);
  if (tm) return `${pad2(+tm[1])}:${tm[2]}:${tm[3] ? tm[3] : '00'}`;
  // Date + heure ISO.
  const dtm = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t);
  if (dtm) return `${pad2(+dtm[4])}:${dtm[5]}:${dtm[6] ? dtm[6] : '00'}`;
  // Nombre : fraction de journée (ex. 0,5 = 12:00:00).
  const num = parseNumericValue(t);
  if (num !== null) {
    const frac = ((num % 1) + 1) % 1;
    const total = Math.round(frac * 86400);
    const h = Math.floor(total / 3600) % 24;
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  }
  return s;
}

// Applique le format de nombre à une valeur déjà convertie en chaîne
// (valeur calculée ou texte brut). Retourne la chaîne telle quelle si le
// format est absent, « auto », ou si la valeur n'est pas interprétable.
export function applyNumFormat(display: string, fmt: ExcelFormat | undefined): string {
  if (!fmt || !fmt.numFormat || fmt.numFormat === 'auto') return display;
  const type = fmt.numFormat;
  if (type === 'custom') {
    return fmt.customFormat ? applyCustomFormat(display, fmt.customFormat) : display;
  }
  if (type === 'date' || type === 'datetime') {
    return formatDateValue(display, type === 'datetime');
  }
  if (type === 'time') {
    return formatTimeValue(display);
  }
  const num = parseNumericValue(display);
  if (num === null) return display;
  const decimals = fmt.decimals ?? (type === 'percent' ? 0 : 2);
  const symbol = fmt.currencySymbol ?? '€';
  switch (type) {
    case 'number':
      return fmtIntl(decimals).format(num);
    case 'currency':
      return `${fmtIntl(decimals).format(num)} ${symbol}`;
    case 'accounting': {
      const abs = fmtIntl(decimals).format(Math.abs(num));
      const body = `${abs} ${symbol}`;
      return num < 0 ? `(${body})` : body;
    }
    case 'percent':
      return `${fmtIntl(decimals).format(num * 100)} %`;
    default:
      return display;
  }
}