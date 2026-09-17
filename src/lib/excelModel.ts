import type { ExcelContent, ExcelSheet, MergeRange } from './documents';

export const DEFAULT_ROWS = 20;
export const DEFAULT_COLS = 8;
export const DEFAULT_ROW_H = 22;
export const DEFAULT_COL_W = 100;
export const HEADER_H = 25;
export const ROW_NUM_W = 40;

export const cellKey = (r: number, c: number): string => `${r},${c}`;

export function getMerge(
  merges: MergeRange[] | undefined,
  r: number,
  c: number,
): MergeRange | null {
  if (!merges) return null;
  return (
    merges.find((m) => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) ?? null
  );
}

export function mergeOverlaps(
  m: MergeRange,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  return m.r2 >= r1 && m.r1 <= r2 && m.c2 >= c1 && m.c1 <= c2;
}

export function shiftMerges(
  merges: MergeRange[] | undefined,
  type: 'row' | 'col',
  index: number,
  delta: 1 | -1,
): MergeRange[] {
  if (!merges) return [];
  const out: MergeRange[] = [];
  for (const m of merges) {
    let { r1, c1, r2, c2 } = m;
    if (type === 'row') {
      if (r1 >= index) r1 += delta;
      if (r2 >= index) r2 += delta;
    } else {
      if (c1 >= index) c1 += delta;
      if (c2 >= index) c2 += delta;
    }
    if (r1 > r2 || c1 > c2 || r1 < 0 || c1 < 0) continue;
    out.push({ r1, c1, r2, c2 });
  }
  return out;
}

export function colLabel(index: number): string {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    label = String.fromCharCode(65 + m) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function colToIndex(label: string): number {
  let n = 0;
  for (let i = 0; i < label.length; i += 1) {
    n = n * 26 + (label.toUpperCase().charCodeAt(i) - 64);
  }
  return n - 1;
}

export function parseCellRef(ref: string): { r: number; c: number } | null {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(ref.trim());
  if (!m) return null;
  return { r: parseInt(m[2], 10) - 1, c: colToIndex(m[1]) };
}

export function expandRange(start: string, end: string): { r: number; c: number }[] {
  const s = parseCellRef(start);
  const e = parseCellRef(end);
  if (!s || !e) return [];
  const r1 = Math.min(s.r, e.r);
  const r2 = Math.max(s.r, e.r);
  const c1 = Math.min(s.c, e.c);
  const c2 = Math.max(s.c, e.c);
  const out: { r: number; c: number }[] = [];
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) out.push({ r, c });
  }
  return out;
}

export function newSheet(name: string, rows = DEFAULT_ROWS, cols = DEFAULT_COLS): ExcelSheet {
  return {
    id: crypto.randomUUID(),
    name,
    cells: {},
    rows,
    cols,
    formats: {},
    colWidths: {},
    rowHeights: {},
    merges: [],
    conditionalFormats: [],
  };
}

export function normalizeSheets(content: ExcelContent): ExcelSheet[] {
  if (content.sheets && content.sheets.length > 0) {
    return content.sheets.map((s) => ({
      id: s.id,
      name: s.name || 'Feuille',
      cells: s.cells || {},
      rows: s.rows || DEFAULT_ROWS,
      cols: s.cols || DEFAULT_COLS,
      formats: s.formats || {},
      colWidths: s.colWidths || {},
      rowHeights: s.rowHeights || {},
      merges: s.merges || [],
      conditionalFormats: s.conditionalFormats || [],
    }));
  }
  const legacy: ExcelSheet = {
    id: crypto.randomUUID(),
    name: 'Feuille 1',
    cells: content.cells || {},
    rows: content.rows || DEFAULT_ROWS,
    cols: content.cols || DEFAULT_COLS,
    formats: content.formats || {},
    colWidths: {},
    rowHeights: {},
    merges: [],
    conditionalFormats: [],
  };
  return [legacy];
}

export function buildContent(sheets: ExcelSheet[], activeSheetId: string): ExcelContent {
  return { sheets, activeSheetId };
}

export interface Selection {
  anchor: { r: number; c: number };
  focus: { r: number; c: number };
}

export function selBounds(s: Selection): { r1: number; c1: number; r2: number; c2: number } {
  return {
    r1: Math.min(s.anchor.r, s.focus.r),
    c1: Math.min(s.anchor.c, s.focus.c),
    r2: Math.max(s.anchor.r, s.focus.r),
    c2: Math.max(s.anchor.c, s.focus.c),
  };
}

export function inSel(r: number, c: number, s: Selection | null): boolean {
  if (!s) return false;
  const b = selBounds(s);
  return r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2;
}