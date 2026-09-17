import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { CellBorders, ConditionalFormatRule, ExcelContent, ExcelFormat, ExcelSheet, NumFormat } from '@/lib/documents';
import type { DocumentAiAction } from '@/lib/documentAi';
import WordMenuBar from './WordMenuBar';
import EditorAiModal from './EditorAiModal';
import { EditorShortcutsDialog, EditorAboutDialog } from './EditorHelpDialogs';
import { WordPromptDialog } from './WordDialogs';
import { buildExcelMenus, type ExcelMenuHandlers } from './excelMenus';
import ExcelGrid from './ExcelGrid';
import ExcelToolbar from './ExcelToolbar';
import ExcelSheetTabs from './ExcelSheetTabs';
import ExcelFilterBar from './ExcelFilterBar';
import ExcelStatusBar, { type ExcelStatusStats } from './ExcelStatusBar';
import {
  buildContent,
  cellKey,
  colLabel,
  getMerge,
  mergeOverlaps,
  newSheet,
  normalizeSheets,
  selBounds,
  shiftMerges,
  DEFAULT_COL_W,
  DEFAULT_ROW_H,
  type Selection,
} from '@/lib/excelModel';
import { computeSheetValues, displayValue, isFormula } from '@/lib/excelFormula';
import { applyNumFormat, NUM_FORMAT_OPTIONS } from '@/lib/excelNumberFormat';
import ExcelCustomFormatDialog from './ExcelCustomFormatDialog';
import ConditionalFormatDialog from './ConditionalFormatDialog';

interface ExcelEditorProps {
  content: ExcelContent;
  onChange: (content: ExcelContent) => void;
  readOnly?: boolean;
  docName?: string;
  canManage?: boolean;
  onSave?: () => void;
  onRename?: (name: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onShare?: () => void;
  onHistory?: () => void;
  onExport?: (format: 'xlsx' | 'pdf' | 'csv') => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type Snapshot = { sheets: ExcelSheet[]; activeId: string };

export default function ExcelEditor({
  content,
  onChange,
  readOnly = false,
  docName = 'Classeur',
  canManage = false,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
  onShare,
  onHistory,
  onExport,
}: ExcelEditorProps) {
  const [init] = useState(() => {
    const s = normalizeSheets(content);
    const active = content.activeSheetId && s.some((x) => x.id === content.activeSheetId)
      ? content.activeSheetId
      : s[0]?.id || '';
    return { s, active };
  });
  const [sheets, setSheets] = useState<ExcelSheet[]>(init.s);
  const [activeId, setActiveId] = useState<string>(init.active);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [editSurface, setEditSurface] = useState<'cell' | 'bar'>('cell');
  const [gridlines, setGridlines] = useState(true);
  const [formulaBar, setFormulaBar] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [freezeRows, setFreezeRows] = useState(0);
  const [freezeCols, setFreezeCols] = useState(0);
  const [filter, setFilter] = useState<{ col: number; selected: Set<string> } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [customFormatOpen, setCustomFormatOpen] = useState(false);
  const [painterActive, setPainterActive] = useState(false);
  const [condFormatOpen, setCondFormatOpen] = useState(false);
  const [ai, setAi] = useState<{ open: boolean; action: DocumentAiAction | null }>({
    open: false,
    action: null,
  });

  const sheetsRef = useRef<ExcelSheet[]>(sheets);
  const activeIdRef = useRef<string>(activeId);
  const selectionRef = useRef<Selection | null>(selection);
  const editingRef = useRef<{ r: number; c: number } | null>(editing);
  const emittedRef = useRef<ExcelContent>(content);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const editRecordedRef = useRef(false);
  const clipboardRef = useRef<{ value: string; fmt: ExcelFormat } | null>(null);
  const dragSelectRef = useRef(false);
  const dragAnchorRef = useRef<{ r: number; c: number }>({ r: 0, c: 0 });
  const fillRef = useRef<{ source: { r1: number; c1: number; r2: number; c2: number } } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const painterFmtRef = useRef<ExcelFormat | null>(null);
  const painterActiveRef = useRef(false);
  const paintingRef = useRef(false);
  const painterRecordedRef = useRef(false);

  const activeSheet = sheets.find((s) => s.id === activeId) ?? sheets[0];
  const computed = useMemo(
    () => computeSheetValues(activeSheet.cells),
    [activeSheet],
  );

  const selectionLabel = useMemo(() => {
    if (!selection) return '';
    const sh = activeSheet;
    const m = getMerge(sh.merges, selection.focus.r, selection.focus.c);
    if (m) return `${colLabel(m.c1)}${m.r1 + 1}:${colLabel(m.c2)}${m.r2 + 1}`;
    const b = selBounds(selection);
    const start = `${colLabel(b.c1)}${b.r1 + 1}`;
    const end = `${colLabel(b.c2)}${b.r2 + 1}`;
    return start === end ? start : `${start}:${end}`;
  }, [selection, activeSheet]);

  const statusStats = useMemo<ExcelStatusStats | null>(() => {
    if (!selection) return null;
    const b = selBounds(selection);
    if (b.r1 === b.r2 && b.c1 === b.c2) return null;
    const sh = activeSheet;
    const nums: number[] = [];
    let count = 0;
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        const raw = sh.cells[cellKey(r, c)];
        const val = isFormula(raw) ? displayValue(computed.get(cellKey(r, c)) ?? null) : raw ?? '';
        if (val === '') continue;
        count += 1;
        const n = Number(val.replace(',', '.'));
        if (!Number.isNaN(n)) nums.push(n);
      }
    }
    if (count === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      sum,
      avg: nums.length ? sum / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
      countNums: nums.length,
      count,
    };
  }, [selection, computed, activeSheet]);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  // ── Émission & historique ────────────────────────────────────────────────
  const applyFull = (nextSheets: ExcelSheet[], nextActive: string) => {
    sheetsRef.current = nextSheets;
    activeIdRef.current = nextActive;
    setSheets(nextSheets);
    setActiveId(nextActive);
    const built = buildContent(nextSheets, nextActive);
    emittedRef.current = built;
    onChange(built);
  };

  const applySheet = (nextSheet: ExcelSheet) => {
    const nextSheets = sheetsRef.current.map((s) => (s.id === nextSheet.id ? nextSheet : s));
    applyFull(nextSheets, activeIdRef.current);
  };

  const snapshot = (): Snapshot => ({
    sheets: JSON.parse(JSON.stringify(sheetsRef.current)),
    activeId: activeIdRef.current,
  });

  const record = () => {
    pastRef.current.push(snapshot());
    if (pastRef.current.length > 100) pastRef.current.shift();
    futureRef.current = [];
  };

  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(snapshot());
    applyFull(prev.sheets, prev.activeId);
    notify('Annulé.');
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(snapshot());
    applyFull(next.sheets, next.activeId);
    notify('Rétabli.');
  };

  const beginTyping = () => {
    if (!editRecordedRef.current) {
      editRecordedRef.current = true;
      record();
    }
  };
  const endTyping = () => {
    editRecordedRef.current = false;
  };

  // Synchronisation si le contenu change de l'extérieur (restauration d'historique)
  useEffect(() => {
    if (content !== emittedRef.current) {
      const s = normalizeSheets(content);
      const active = content.activeSheetId && s.some((x) => x.id === content.activeSheetId)
        ? content.activeSheetId
        : s[0]?.id || '';
      sheetsRef.current = s;
      activeIdRef.current = active;
      setSheets(s);
      setActiveId(active);
      emittedRef.current = content;
    }
  }, [content]);

  const updateSelection = (sel: Selection) => {
    selectionRef.current = sel;
    setSelection(sel);
  };
  const updateEditing = (v: { r: number; c: number } | null) => {
    editingRef.current = v;
    setEditing(v);
  };

  // ── Manipulation des cellules ────────────────────────────────────────────
  const setCellValue = (r: number, c: number, value: string) => {
    const sh = activeSheetRef();
    const cells = { ...sh.cells };
    const key = cellKey(r, c);
    if (value === '') delete cells[key];
    else cells[key] = value;
    applySheet({ ...sh, cells });
  };

  const activeSheetRef = (): ExcelSheet => {
    return sheetsRef.current.find((s) => s.id === activeIdRef.current) ?? sheetsRef.current[0];
  };

  const toggleFormat = (patch: Partial<ExcelFormat>) => {
    if (!selectionRef.current) return;
    record();
    const b = selBounds(selectionRef.current);
    const sh = activeSheetRef();
    const formats = { ...sh.formats };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        const k = cellKey(r, c);
        formats[k] = { ...(formats[k] || {}), ...patch };
      }
    }
    applySheet({ ...sh, formats });
  };

  const clearFormat = () => {
    if (!selectionRef.current) return;
    record();
    const b = selBounds(selectionRef.current);
    const sh = activeSheetRef();
    const formats = { ...sh.formats };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        delete formats[cellKey(r, c)];
      }
    }
    applySheet({ ...sh, formats });
  };

  // ── Mise en forme conditionnelle ──────────────────────────────────────────
  const addConditionalRule = (rule: Omit<ConditionalFormatRule, 'id'>) => {
    record();
    const sh = activeSheetRef();
    const rules = [...(sh.conditionalFormats || []), { ...rule, id: crypto.randomUUID() }];
    applySheet({ ...sh, conditionalFormats: rules });
  };

  const updateConditionalRule = (id: string, patch: Partial<ConditionalFormatRule>) => {
    record();
    const sh = activeSheetRef();
    const rules = (sh.conditionalFormats || []).map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    );
    applySheet({ ...sh, conditionalFormats: rules });
  };

  const removeConditionalRule = (id: string) => {
    record();
    const sh = activeSheetRef();
    const rules = (sh.conditionalFormats || []).filter((r) => r.id !== id);
    applySheet({ ...sh, conditionalFormats: rules });
  };

  // ── Format peintre ────────────────────────────────────────────────────────
  const activateFormatPainter = () => {
    if (!selectionRef.current) {
      notify('Sélectionnez une cellule source.');
      return;
    }
    const f = selectionRef.current.focus;
    const sh = activeSheetRef();
    const fmt = sh.formats[cellKey(f.r, f.c)] || {};
    painterFmtRef.current = fmt;
    painterActiveRef.current = true;
    paintingRef.current = false;
    painterRecordedRef.current = false;
    setPainterActive(true);
    notify('Format copié. Cliquez sur la cellule cible.');
  };

  const paintRange = (r1: number, c1: number, r2: number, c2: number) => {
    const fmt = painterFmtRef.current;
    if (!fmt) return;
    const sh = activeSheetRef();
    const formats = { ...sh.formats };
    const hasKeys = Object.keys(fmt).length > 0;
    for (let r = r1; r <= r2; r += 1) {
      for (let c = c1; c <= c2; c += 1) {
        const k = cellKey(r, c);
        if (hasKeys) formats[k] = { ...(formats[k] || {}), ...fmt };
        else delete formats[k];
      }
    }
    applySheet({ ...sh, formats });
  };

  const deactivateFormatPainter = () => {
    painterActiveRef.current = false;
    paintingRef.current = false;
    setPainterActive(false);
  };

  const setNumFormat = (numFormat: NumFormat, currencySymbol?: string) => {
    if (!selectionRef.current) {
      notify('Sélectionnez des cellules.');
      return;
    }
    const patch: Partial<ExcelFormat> = { numFormat };
    if (currencySymbol) patch.currencySymbol = currencySymbol;
    toggleFormat(patch);
    const label =
      NUM_FORMAT_OPTIONS.find(
        (f) => f.numFormat === numFormat && f.currencySymbol === currencySymbol,
      )?.label || 'Format';
    notify(`Format « ${label} » appliqué.`);
  };

  const adjustDecimals = (delta: number) => {
    if (!selectionRef.current) {
      notify('Sélectionnez des cellules.');
      return;
    }
    record();
    const b = selBounds(selectionRef.current);
    const sh = activeSheetRef();
    const formats = { ...sh.formats };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        const k = cellKey(r, c);
        const prev = formats[k] || {};
        const type = prev.numFormat;
        // N'ajuste que les formats numériques (ou l'absence de format).
        const numeric = !type || type === 'auto' || type === 'number' || type === 'currency' || type === 'percent';
        if (!numeric) continue;
        const base = prev.decimals ?? (type === 'percent' ? 0 : 2);
        const next = Math.max(0, Math.min(10, base + delta));
        formats[k] = {
          ...prev,
          numFormat: type && type !== 'auto' ? type : 'number',
          decimals: next,
        };
      }
    }
    applySheet({ ...sh, formats });
    notify(delta > 0 ? 'Décimale ajoutée.' : 'Décimale retirée.');
  };

  const setCustomFormat = (custom: string) => {
    if (!selectionRef.current) {
      notify('Sélectionnez des cellules.');
      return;
    }
    const c = custom.trim();
    if (!c) {
      notify('Saisissez un code de format.');
      return;
    }
    toggleFormat({ numFormat: 'custom', customFormat: c });
    notify('Format personnalisé appliqué.');
  };

  const setBorders = (patch: Partial<CellBorders> | 'none') => {
    if (!selectionRef.current) {
      notify('Sélectionnez des cellules.');
      return;
    }
    record();
    const b = selBounds(selectionRef.current);
    const sh = activeSheetRef();
    const formats = { ...sh.formats };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        const k = cellKey(r, c);
        const prev = formats[k] || {};
        if (patch === 'none') {
          const next = { ...prev };
          delete next.borders;
          formats[k] = next;
        } else {
          formats[k] = { ...prev, borders: { ...(prev.borders || {}), ...patch } };
        }
      }
    }
    applySheet({ ...sh, formats });
    notify(patch === 'none' ? 'Bordures retirées.' : 'Bordures appliquées.');
  };

  const mergeAndCenter = () => {
    if (!selectionRef.current) return;
    const b = selBounds(selectionRef.current);
    if (b.r1 === b.r2 && b.c1 === b.c2) {
      notify('Sélectionnez plusieurs cellules à fusionner.');
      return;
    }
    record();
    const sh = activeSheetRef();
    const merges = (sh.merges || []).filter((m) => !mergeOverlaps(m, b.r1, b.c1, b.r2, b.c2));
    const cells = { ...sh.cells };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        if (!(r === b.r1 && c === b.c1)) delete cells[cellKey(r, c)];
      }
    }
    merges.push({ r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2 });
    const formats = { ...sh.formats };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        const k = cellKey(r, c);
        formats[k] = { ...(formats[k] || {}), align: 'center', valign: 'middle' };
      }
    }
    applySheet({ ...sh, cells, merges, formats });
    updateSelection({ anchor: { r: b.r1, c: b.c1 }, focus: { r: b.r1, c: b.c1 } });
    notify('Cellules fusionnées et centrées.');
  };

  const isMerged = useMemo(() => {
    if (!selection) return false;
    return !!getMerge(activeSheet.merges, selection.focus.r, selection.focus.c);
  }, [selection, activeSheet]);

  // ── Fusion de cellules ────────────────────────────────────────────────────
  const mergeSelection = () => {
    if (!selectionRef.current) return;
    const b = selBounds(selectionRef.current);
    if (b.r1 === b.r2 && b.c1 === b.c2) {
      notify('Sélectionnez plusieurs cellules à fusionner.');
      return;
    }
    record();
    const sh = activeSheetRef();
    // Retire les fusions existantes qui chevauchent la sélection.
    const merges = (sh.merges || []).filter(
      (m) => !mergeOverlaps(m, b.r1, b.c1, b.r2, b.c2),
    );
    // Ne conserve que la valeur de la cellule en haut à gauche.
    const cells = { ...sh.cells };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) {
        if (!(r === b.r1 && c === b.c1)) delete cells[cellKey(r, c)];
      }
    }
    merges.push({ r1: b.r1, c1: b.c1, r2: b.r2, c2: b.c2 });
    applySheet({ ...sh, cells, merges });
    updateSelection({ anchor: { r: b.r1, c: b.c1 }, focus: { r: b.r1, c: b.c1 } });
    notify('Cellules fusionnées.');
  };

  const unmergeSelection = () => {
    if (!selectionRef.current) return;
    const f = selectionRef.current.focus;
    const sh = activeSheetRef();
    const m = getMerge(sh.merges, f.r, f.c);
    if (!m) {
      notify('Aucune fusion sur cette cellule.');
      return;
    }
    record();
    applySheet({ ...sh, merges: (sh.merges || []).filter((x) => x !== m) });
    updateSelection({ anchor: { r: m.r1, c: m.c1 }, focus: { r: m.r2, c: m.c2 } });
    notify('Fusion annulée.');
  };

  const shiftCells = (type: 'row' | 'col', index: number, delta: 1 | -1) => {
    const sh = activeSheetRef();
    const nextCells: Record<string, string> = {};
    Object.entries(sh.cells).forEach(([key, val]) => {
      const [r, c] = key.split(',').map(Number);
      const nr = type === 'row' && r >= index ? r + delta : r;
      const nc = type === 'col' && c >= index ? c + delta : c;
      if (nr < 0 || nc < 0) return;
      nextCells[`${nr},${nc}`] = val;
    });
    const nextFormats: Record<string, ExcelFormat> = {};
    Object.entries(sh.formats).forEach(([key, val]) => {
      const [r, c] = key.split(',').map(Number);
      const nr = type === 'row' && r >= index ? r + delta : r;
      const nc = type === 'col' && c >= index ? c + delta : c;
      if (nr < 0 || nc < 0) return;
      nextFormats[`${nr},${nc}`] = val;
    });
    return { nextCells, nextFormats };
  };

  const addRow = (position: 'above' | 'below') => {
    const sh = activeSheetRef();
    const target = selectionRef.current ? selectionRef.current.focus.r : sh.rows - 1;
    const insertAt = position === 'above' ? target : target + 1;
    record();
    const shifted = shiftCells('row', insertAt, 1);
    applySheet({
      ...sh,
      cells: shifted?.nextCells || {},
      formats: shifted?.nextFormats || {},
      merges: shiftMerges(sh.merges, 'row', insertAt, 1),
      rows: sh.rows + 1,
    });
    notify('Ligne insérée.');
  };

  const addCol = (position: 'left' | 'right') => {
    const sh = activeSheetRef();
    const target = selectionRef.current ? selectionRef.current.focus.c : sh.cols - 1;
    const insertAt = position === 'left' ? target : target + 1;
    record();
    const shifted = shiftCells('col', insertAt, 1);
    applySheet({
      ...sh,
      cells: shifted?.nextCells || {},
      formats: shifted?.nextFormats || {},
      merges: shiftMerges(sh.merges, 'col', insertAt, 1),
      cols: sh.cols + 1,
    });
    notify('Colonne insérée.');
  };

  const deleteRow = () => {
    const sh = activeSheetRef();
    if (!selectionRef.current) return;
    record();
    const shifted = shiftCells('row', selectionRef.current.focus.r, -1);
    applySheet({
      ...sh,
      cells: shifted?.nextCells || {},
      formats: shifted?.nextFormats || {},
      merges: shiftMerges(sh.merges, 'row', selectionRef.current.focus.r, -1),
      rows: Math.max(1, sh.rows - 1),
    });
    selectionRef.current = null;
    setSelection(null);
  };

  const deleteCol = () => {
    const sh = activeSheetRef();
    if (!selectionRef.current) return;
    record();
    const shifted = shiftCells('col', selectionRef.current.focus.c, -1);
    applySheet({
      ...sh,
      cells: shifted?.nextCells || {},
      formats: shifted?.nextFormats || {},
      merges: shiftMerges(sh.merges, 'col', selectionRef.current.focus.c, -1),
      cols: Math.max(1, sh.cols - 1),
    });
    setSelection(null);
    selectionRef.current = null;
  };

  const clearSelection = () => {
    if (!selectionRef.current) return;
    record();
    const b = selBounds(selectionRef.current);
    const sh = activeSheetRef();
    const cells = { ...sh.cells };
    for (let r = b.r1; r <= b.r2; r += 1) {
      for (let c = b.c1; c <= b.c2; c += 1) delete cells[cellKey(r, c)];
    }
    applySheet({ ...sh, cells });
    notify('Contenu effacé.');
  };

  const cut = () => {
    if (!selectionRef.current) return;
    const f = selectionRef.current.focus;
    const sh = activeSheetRef();
    const k = cellKey(f.r, f.c);
    clipboardRef.current = { value: sh.cells[k] || '', fmt: sh.formats[k] || {} };
    record();
    setCellValue(f.r, f.c, '');
  };

  const copy = () => {
    if (!selectionRef.current) return;
    const f = selectionRef.current.focus;
    const sh = activeSheetRef();
    const k = cellKey(f.r, f.c);
    clipboardRef.current = { value: sh.cells[k] || '', fmt: sh.formats[k] || {} };
    notify('Cellule copiée.');
  };

  const paste = () => {
    if (!selectionRef.current || !clipboardRef.current) {
      if (!selectionRef.current) notify('Sélectionnez une cellule.');
      return;
    }
    const f = selectionRef.current.focus;
    const { value, fmt } = clipboardRef.current;
    record();
    const sh = activeSheetRef();
    const key = cellKey(f.r, f.c);
    const cells = { ...sh.cells };
    if (value === '') delete cells[key];
    else cells[key] = value;
    const formats = { ...sh.formats, [key]: fmt };
    applySheet({ ...sh, cells, formats });
    notify('Cellule collée.');
  };

  // ── Feuilles ─────────────────────────────────────────────────────────────
  const addSheet = () => {
    record();
    const s = newSheet(`Feuille ${sheetsRef.current.length + 1}`);
    applyFull([...sheetsRef.current, s], s.id);
    notify('Nouvelle feuille ajoutée.');
  };

  const renameSheet = (id: string, name: string) => {
    const n = name.trim() || 'Feuille';
    applyFull(
      sheetsRef.current.map((s) => (s.id === id ? { ...s, name: n } : s)),
      activeIdRef.current,
    );
  };

  const deleteSheet = (id: string) => {
    if (sheetsRef.current.length <= 1) {
      notify('Impossible de supprimer la dernière feuille.');
      return;
    }
    record();
    const next = sheetsRef.current.filter((s) => s.id !== id);
    const nextActive = activeIdRef.current === id ? next[0].id : activeIdRef.current;
    applyFull(next, nextActive);
    notify('Feuille supprimée.');
  };

  const selectSheet = (id: string) => {
    if (id !== activeIdRef.current) applyFull(sheetsRef.current, id);
  };

  // ── Tri & filtre ─────────────────────────────────────────────────────────
  const cellValueStr = (r: number, c: number): string => {
    const sh = activeSheetRef();
    const raw = sh.cells[cellKey(r, c)];
    if (isFormula(raw)) return displayValue(computed.get(cellKey(r, c)) ?? null);
    return raw ?? '';
  };

  const sortSheet = (asc: boolean) => {
    const sh = activeSheetRef();
    const col = selectionRef.current ? selectionRef.current.focus.c : 0;
    record();
    const rowVals = Array.from({ length: sh.rows }, (_, r) => cellValueStr(r, col));
    const order = Array.from({ length: sh.rows }, (_, i) => i);
    order.sort((a, b) => {
      const va = rowVals[a];
      const vb = rowVals[b];
      const na = Number(va.replace(',', '.'));
      const nb = Number(vb.replace(',', '.'));
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      if (va === '' && vb === '') return 0;
      if (va === '') return 1;
      if (vb === '') return -1;
      return va.localeCompare(vb, 'fr');
    });
    if (!asc) order.reverse();
    const cells: Record<string, string> = {};
    const formats: Record<string, ExcelFormat> = {};
    order.forEach((srcR, destR) => {
      for (let c = 0; c < sh.cols; c += 1) {
        const k = cellKey(srcR, c);
        if (sh.cells[k] !== undefined) cells[cellKey(destR, c)] = sh.cells[k];
        if (sh.formats[k]) formats[cellKey(destR, c)] = sh.formats[k];
      }
    });
    applySheet({ ...sh, cells, formats, merges: [] });
    notify(asc ? 'Tri croissant appliqué.' : 'Tri décroissant appliqué.');
  };

  const toggleFilter = () => {
    if (!selectionRef.current) {
      notify('Sélectionnez une cellule de la colonne à filtrer.');
      return;
    }
    const col = selectionRef.current.focus.c;
    if (filter && filter.col === col) {
      setFilter(null);
      return;
    }
    const vals = new Set<string>();
    for (let r = 0; r < activeSheetRef().rows; r += 1) {
      const v = cellValueStr(r, col);
      if (v !== '') vals.add(v);
    }
    setFilter({ col, selected: vals });
  };

  const hiddenRows = useMemo(() => {
    if (!filter) return null;
    const set = new Set<number>();
    for (let r = 0; r < activeSheetRef().rows; r += 1) {
      if (!filter.selected.has(cellValueStr(r, filter.col))) set.add(r);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, computed, activeSheet]);

  const filterValues = useMemo(() => {
    if (!filter) return [];
    const vals = new Set<string>();
    for (let r = 0; r < activeSheet.rows; r += 1) {
      const v = cellValueStr(r, filter.col);
      if (v !== '') vals.add(v);
    }
    return Array.from(vals).sort((a, b) => a.localeCompare(b, 'fr'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, computed, activeSheet]);

  // ── Recopie (poignée) ────────────────────────────────────────────────────
  const parseNum = (s: string | undefined): number => {
    if (s === undefined || s === '') return NaN;
    return Number(s.replace(',', '.'));
  };

  const performFill = (
    source: { r1: number; c1: number; r2: number; c2: number },
    targetR: number,
    targetC: number,
  ) => {
    const sh = activeSheetRef();
    const cells = { ...sh.cells };
    const formats = { ...sh.formats };
    const srcW = source.c2 - source.c1 + 1;
    const srcH = source.r2 - source.r1 + 1;
    const single = srcW === 1 && srcH === 1;
    const srcNum = single ? parseNum(sh.cells[cellKey(source.r1, source.c1)]) : NaN;

    for (let r = source.r2 + 1; r <= targetR; r += 1) {
      for (let c = source.c1; c <= targetC; c += 1) {
        let val: string | undefined;
        if (single && !Number.isNaN(srcNum)) {
          val = String(srcNum + (r - source.r1) + (c - source.c1));
        } else {
          const sr = single ? source.r1 : source.r1 + ((r - source.r2 - 1) % srcH);
          const sc = single ? source.c1 : source.c1 + ((c - source.c1) % srcW);
          val = sh.cells[cellKey(sr, sc)];
          const f = sh.formats[cellKey(sr, sc)];
          if (f) formats[cellKey(r, c)] = f;
        }
        if (val === undefined) delete cells[cellKey(r, c)];
        else cells[cellKey(r, c)] = val;
      }
    }
    applySheet({ ...sh, cells, formats });
  };

  // ── Redimensionnement ────────────────────────────────────────────────────
  const onResizeColStart = (c: number, e: ReactMouseEvent) => {
    record();
    const startX = e.clientX;
    const startW = activeSheetRef().colWidths?.[c] || DEFAULT_COL_W;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(40, Math.min(600, startW + ev.clientX - startX));
      const sh = activeSheetRef();
      applySheet({ ...sh, colWidths: { ...(sh.colWidths || {}), [c]: w } });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeRowStart = (r: number, e: ReactMouseEvent) => {
    record();
    const startY = e.clientY;
    const startH = activeSheetRef().rowHeights?.[r] || DEFAULT_ROW_H;
    const onMove = (ev: MouseEvent) => {
      const h = Math.max(20, Math.min(300, startH + ev.clientY - startY));
      const sh = activeSheetRef();
      applySheet({ ...sh, rowHeights: { ...(sh.rowHeights || {}), [r]: h } });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Sélection & navigation ───────────────────────────────────────────────
  const onCellPointerDown = (r: number, c: number, e: ReactMouseEvent) => {
    if (painterActiveRef.current) {
      if (!painterRecordedRef.current) {
        record();
        painterRecordedRef.current = true;
      }
      paintRange(r, c, r, c);
      updateSelection({ anchor: { r, c }, focus: { r, c } });
      paintingRef.current = true;
      dragSelectRef.current = true;
      dragAnchorRef.current = { r, c };
      return;
    }
    if (editingRef.current && (editingRef.current.r !== r || editingRef.current.c !== c)) {
      endTyping();
      updateEditing(null);
    }
    if (e.shiftKey) {
      const s = selectionRef.current;
      updateSelection(
        s ? { anchor: s.anchor, focus: { r, c } } : { anchor: { r, c }, focus: { r, c } },
      );
    } else {
      updateSelection({ anchor: { r, c }, focus: { r, c } });
      updateEditing(null);
    }
    dragSelectRef.current = true;
    dragAnchorRef.current = { r, c };
  };

  const onCellEnter = (r: number, c: number) => {
    if (paintingRef.current) {
      const b = selBounds({ anchor: dragAnchorRef.current, focus: { r, c } });
      paintRange(b.r1, b.c1, b.r2, b.c2);
      updateSelection({ anchor: dragAnchorRef.current, focus: { r, c } });
    } else if (dragSelectRef.current) {
      updateSelection({ anchor: dragAnchorRef.current, focus: { r, c } });
    } else if (fillRef.current) {
      performFill(fillRef.current.source, r, c);
    }
  };

  const onCellDoubleClick = (r: number, c: number) => {
    updateEditing({ r, c });
    setEditSurface('cell');
  };

  const onCellChange = (r: number, c: number, value: string) => {
    beginTyping();
    setCellValue(r, c, value);
  };

  const onFillPointerDown = () => {
    if (!selectionRef.current) return;
    record();
    const b = selBounds(selectionRef.current);
    fillRef.current = { source: b };
  };

  useEffect(() => {
    const onUp = () => {
      if (dragSelectRef.current) dragSelectRef.current = false;
      if (fillRef.current) fillRef.current = null;
      if (paintingRef.current) deactivateFormatPainter();
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const moveSel = (dr: number, dc: number, extend: boolean) => {
    const sh = activeSheetRef();
    const s = selectionRef.current ?? { anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 } };
    const nr = Math.max(0, Math.min(sh.rows - 1, s.focus.r + dr));
    const nc = Math.max(0, Math.min(sh.cols - 1, s.focus.c + dc));
    updateSelection(
      extend
        ? { anchor: s.anchor, focus: { r: nr, c: nc } }
        : { anchor: { r: nr, c: nc }, focus: { r: nr, c: nc } },
    );
  };

  const startEditWith = (r: number, c: number, replaceWith?: string) => {
    updateEditing({ r, c });
    setEditSurface('cell');
    if (replaceWith !== undefined) {
      beginTyping();
      setCellValue(r, c, replaceWith);
    }
  };

  const commitEdit = () => {
    endTyping();
    updateEditing(null);
  };

  const cancelEdit = () => {
    endTyping();
    updateEditing(null);
    undo();
  };

  // ── Impression & IA ──────────────────────────────────────────────────────
  const printSheet = () => {
    const sh = activeSheet;
    let html = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;width:100%;color:#111;">';
    html += '<thead><tr><th style="border:1px solid #999;background:#f3f4f6;padding:4px 8px;"></th>';
    for (let c = 0; c < sh.cols; c += 1) {
      html += `<th style="border:1px solid #999;background:#f3f4f6;padding:4px 8px;font-weight:600;">${colLabel(c)}</th>`;
    }
    html += '</tr></thead><tbody>';
    const merges = sh.merges || [];
    const anchorByKey = new Map<string, { r2: number; c2: number }>();
    const covered = new Set<string>();
    for (const m of merges) {
      anchorByKey.set(cellKey(m.r1, m.c1), { r2: m.r2, c2: m.c2 });
      for (let rr = m.r1; rr <= m.r2; rr += 1) {
        for (let cc = m.c1; cc <= m.c2; cc += 1) {
          if (!(rr === m.r1 && cc === m.c1)) covered.add(cellKey(rr, cc));
        }
      }
    }
    for (let r = 0; r < sh.rows; r += 1) {
      html += `<tr><td style="border:1px solid #999;background:#f3f4f6;padding:4px 8px;text-align:center;">${r + 1}</td>`;
      for (let c = 0; c < sh.cols; c += 1) {
        const k = cellKey(r, c);
        if (covered.has(k)) continue;
        const raw = sh.cells[k];
        const val = applyNumFormat(isFormula(raw) ? displayValue(computed.get(k) ?? null) : raw ?? '', sh.formats?.[k]);
        const m = anchorByKey.get(k);
        const colspan = m ? ` colspan="${m.c2 - c + 1}"` : '';
        const rowspan = m ? ` rowspan="${m.r2 - r + 1}"` : '';
        html += `<td style="border:1px solid #ccc;padding:4px 8px;"${colspan}${rowspan}>${escapeHtml(val)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const frameDoc = frame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(frame);
      return;
    }
    frameDoc.open();
    frameDoc.write(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(docName)}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:6px 8px;}</style></head><body>${html}</body></html>`,
    );
    frameDoc.close();
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => {
        if (frame.parentNode) document.body.removeChild(frame);
      }, 1500);
    }, 350);
  };

  const getAiText = (): string => {
    const sh = activeSheet;
    if (selectionRef.current) {
      const f = selectionRef.current.focus;
      const raw = sh.cells[cellKey(f.r, f.c)];
      if (raw) return raw;
    }
    const lines = Object.entries(sh.cells).map(([key, val]) => {
      const [r, c] = key.split(',').map(Number);
      return `${colLabel(c)}${r + 1}: ${val}`;
    });
    return lines.join('\n') || 'Feuille vide';
  };

  const handleAiInsert = (text: string) => {
    const f = selectionRef.current?.focus ?? { r: 0, c: 0 };
    record();
    setCellValue(f.r, f.c, text);
    updateEditing(null);
    setAi({ open: false, action: null });
    notify('Contenu inséré dans la cellule.');
  };

  const cellAddress = selection ? `${colLabel(selection.focus.c)}${selection.focus.r + 1}` : '';
  const focusKey = selection ? cellKey(selection.focus.r, selection.focus.c) : '';
  const selectedFmt: ExcelFormat = selection ? activeSheet.formats[focusKey] || {} : {};
  const selectedRaw = selection ? activeSheet.cells[focusKey] || '' : '';

  const currentNumLabel = useMemo(() => {
    const opt = NUM_FORMAT_OPTIONS.find(
      (f) =>
        f.numFormat === selectedFmt.numFormat &&
        (f.numFormat !== 'currency' || f.currencySymbol === selectedFmt.currencySymbol),
    );
    return opt ? opt.label : '123';
  }, [selectedFmt]);

  // ── Raccourcis clavier ───────────────────────────────────────────────────
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); if (!readOnly) toggleFormat({ bold: !selectedFmt.bold }); }
      else if (k === 'i') { e.preventDefault(); if (!readOnly) toggleFormat({ italic: !selectedFmt.italic }); }
      else if (k === 'u') { e.preventDefault(); if (!readOnly) toggleFormat({ underline: !selectedFmt.underline }); }
      else if (k === 'x') { e.preventDefault(); if (!readOnly) cut(); }
      else if (k === 'c') { e.preventDefault(); if (!readOnly) copy(); }
      else if (k === 'v') { e.preventDefault(); if (!readOnly) paste(); }
      else if (k === 'p') { e.preventDefault(); printSheet(); }
      else if (k === 'z') { e.preventDefault(); if (!readOnly) (e.shiftKey ? redo() : undo()); }
      else if (k === 'y') { e.preventDefault(); if (!readOnly) redo(); }
      else if (k === 's') { e.preventDefault(); onSave?.(); }
      else if (k === '/') { e.preventDefault(); setShowShortcuts(true); }
      return;
    }
    if (readOnly) return;
    if (!editingRef.current) {
      const f = selectionRef.current?.focus;
      if (e.key === 'Escape' && painterActiveRef.current) {
        e.preventDefault();
        deactivateFormatPainter();
        return;
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1, 0, e.shiftKey); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1, 0, e.shiftKey); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSel(0, -1, e.shiftKey); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveSel(0, 1, e.shiftKey); }
      else if (e.key === 'Enter') { e.preventDefault(); if (f) startEditWith(f.r, f.c); }
      else if (e.key === 'Tab') { e.preventDefault(); moveSel(0, e.shiftKey ? -1 : 1, false); }
      else if (e.key === 'F2') { e.preventDefault(); if (f) startEditWith(f.r, f.c); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearSelection(); }
      else if (e.key.length === 1 && !e.altKey) {
        e.preventDefault();
        if (f) startEditWith(f.r, f.c, e.key);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        const f = editingRef.current;
        commitEdit();
        if (f) {
          const nr = Math.min(activeSheetRef().rows - 1, f.r + 1);
          selectionRef.current = { anchor: { r: nr, c: f.c }, focus: { r: nr, c: f.c } };
          setSelection(selectionRef.current);
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const f = editingRef.current;
        commitEdit();
        if (f) {
          const nc = Math.max(0, Math.min(activeSheetRef().cols - 1, f.c + (e.shiftKey ? -1 : 1)));
          const nf = { r: f.r, c: nc };
          selectionRef.current = { anchor: nf, focus: nf };
          setSelection(selectionRef.current);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Menus ────────────────────────────────────────────────────────────────
  const handlers: ExcelMenuHandlers = {
    save: () => (onSave ? onSave() : notify('Utilisez Ctrl+S.')),
    duplicate: () => (onDuplicate ? onDuplicate() : notify('Action indisponible ici.')),
    rename: () => (onRename ? setRenameOpen(true) : notify('Renommage indisponible ici.')),
    exportAs: (format) => (onExport ? onExport(format) : notify('Export indisponible.')),
    print: printSheet,
    share: () => (onShare ? onShare() : notify('Action indisponible ici.')),
    history: () => (onHistory ? onHistory() : notify('Action indisponible ici.')),
    close: () => (onClose ? onClose() : notify('Action indisponible ici.')),
    del: () => (onDelete ? onDelete() : notify('Action indisponible ici.')),
    canManage,

    cut,
    copy,
    paste,
    clearContents: clearSelection,

    addRowAbove: () => addRow('above'),
    addRowBelow: () => addRow('below'),
    addColLeft: () => addCol('left'),
    addColRight: () => addCol('right'),
    deleteRow,
    deleteCol,
    insertFormula: (value) => {
      const f = selectionRef.current?.focus ?? { r: 0, c: 0 };
      record();
      setCellValue(f.r, f.c, value);
      notify(`Formule « ${value} » insérée.`);
    },
    addSheet,

    sortAsc: () => sortSheet(true),
    sortDesc: () => sortSheet(false),
    toggleFilter,

    toggleBold: () => toggleFormat({ bold: !selectedFmt.bold }),
    toggleItalic: () => toggleFormat({ italic: !selectedFmt.italic }),
    toggleStrike: () => toggleFormat({ strike: !selectedFmt.strike }),
    toggleWrap: () => toggleFormat({ wrap: !selectedFmt.wrap }),
    setValign: (v) => toggleFormat({ valign: v }),
    setTextColor: (color) => toggleFormat({ color }),
    format: selectedFmt,
    align: (a) => toggleFormat({ align: a }),
    setBg: (color) => toggleFormat({ bg: color }),
    setNumFormat,
    currentNumFormat: selectedFmt.numFormat,
    currentCurrencySymbol: selectedFmt.currencySymbol,
    clearFormat,
    conditionalFormat: () => setCondFormatOpen(true),
    adjustDecimals,
    openCustomFormat: () => setCustomFormatOpen(true),
    mergeCells: mergeSelection,
    mergeAndCenter,
    unmergeCells: unmergeSelection,

    settings: { gridlines, formulaBar, zoom },
    toggleSetting: (key) => {
      if (key === 'gridlines') setGridlines((v) => !v);
      else if (key === 'formulaBar') setFormulaBar((v) => !v);
    },
    setZoom,
    freezeRows,
    freezeCols,
    setFreezeRows: (n) => setFreezeRows(Math.max(0, Math.min(n, activeSheet.rows))),
    setFreezeCols: (n) => setFreezeCols(Math.max(0, Math.min(n, activeSheet.cols))),

    ai: (action) => setAi({ open: true, action }),

    notify,
    showShortcuts: () => setShowShortcuts(true),
    showAbout: () => setShowAbout(true),
  };

  const groups = buildExcelMenus(handlers).filter(
    (g) => !readOnly || ['file', 'view', 'help'].includes(g.key),
  );

  return (
    <div className="relative flex flex-col h-full bg-white">
      <div className="flex items-center gap-1 border-b border-background-200/70 px-2 py-1 bg-background-50">
        <WordMenuBar groups={groups} />
        {readOnly && (
          <span className="ml-auto mr-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-100 text-[11px] font-medium text-foreground-500 whitespace-nowrap">
            <i className="ri-eye-line"></i>
            Lecture seule
          </span>
        )}
      </div>

      {!readOnly && (
        <ExcelToolbar
          hasSelection={!!selection}
          fmt={selectedFmt}
          numLabel={currentNumLabel}
          zoom={zoom}
          isMerged={isMerged}
          painterActive={painterActive}
          onFormatPainter={activateFormatPainter}
          onUndo={undo}
          onRedo={redo}
          onPrint={printSheet}
          onZoom={(z) => setZoom(Math.max(50, Math.min(300, Math.round(z))))}
          onPickNumFormat={setNumFormat}
          onAdjustDecimals={adjustDecimals}
          onOpenCustomFormat={() => setCustomFormatOpen(true)}
          onToggle={toggleFormat}
          onSetBorder={setBorders}
          onMerge={mergeSelection}
          onMergeCenter={mergeAndCenter}
          onUnmerge={unmergeSelection}
          onConditionalFormat={() => setCondFormatOpen(true)}
          onAiSummarize={() => setAi({ open: true, action: 'summarize' })}
        />
      )}

      {formulaBar && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-background-200/70 bg-white">
          <span className="w-12 text-center text-xs font-semibold text-foreground-500 border border-background-200/70 rounded px-1 py-1">
            {cellAddress || '—'}
          </span>
          <i className="ri-function-line text-foreground-400 text-sm"></i>
          <input
            value={selectedRaw}
            onChange={(e) => {
              if (!selection) return;
              updateEditing(selection.focus);
              setEditSurface('bar');
              beginTyping();
              setCellValue(selection.focus.r, selection.focus.c, e.target.value);
            }}
            onFocus={() => {
              if (selection) {
                updateEditing(selection.focus);
                setEditSurface('bar');
              }
            }}
            placeholder={selection ? '' : 'Sélectionnez une cellule'}
            readOnly={readOnly}
            className="flex-1 px-2 py-1 text-sm text-foreground-900 bg-transparent focus:outline-none"
          />
        </div>
      )}

      {filter && (
        <ExcelFilterBar
          columnLabel={colLabel(filter.col)}
          values={filterValues}
          selected={filter.selected}
          onToggle={(v) => {
            const next = new Set(filter.selected);
            if (next.has(v)) next.delete(v);
            else next.add(v);
            setFilter({ ...filter, selected: next });
          }}
          onSelectAll={() => {
            const all = filterValues.every((v) => filter.selected.has(v));
            setFilter({ ...filter, selected: all ? new Set<string>() : new Set(filterValues) });
          }}
          onClose={() => setFilter(null)}
        />
      )}

      <div className="flex-1 overflow-auto">
        <ExcelGrid
          sheet={activeSheet}
          computed={computed}
          selection={selection}
          editing={editing}
          editingInCell={!!editing && editSurface === 'cell'}
          gridlines={gridlines}
          zoom={zoom}
          freezeRows={freezeRows}
          freezeCols={freezeCols}
          readOnly={readOnly}
          hiddenRows={hiddenRows}
          onCellPointerDown={onCellPointerDown}
          onCellEnter={onCellEnter}
          onCellDoubleClick={onCellDoubleClick}
          onCellChange={onCellChange}
          onFillPointerDown={onFillPointerDown}
          onResizeColStart={onResizeColStart}
          onResizeRowStart={onResizeRowStart}
        />
      </div>

      <ExcelSheetTabs
        sheets={sheets.map((s) => ({ id: s.id, name: s.name }))}
        activeId={activeId}
        readOnly={readOnly}
        onSelect={selectSheet}
        onAdd={addSheet}
        onRename={renameSheet}
        onDelete={deleteSheet}
      />

      <ExcelStatusBar
        stats={statusStats}
        selectionLabel={selectionLabel}
        zoom={zoom}
        onZoomChange={(z) => setZoom(Math.max(50, Math.min(300, Math.round(z))))}
      />

      <EditorAiModal
        open={ai.open}
        action={ai.action}
        title={ai.action === 'write' ? 'Générer une formule' : undefined}
        getText={getAiText}
        onInsert={handleAiInsert}
        onClose={() => setAi({ open: false, action: null })}
      />

      <EditorShortcutsDialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={[
          ['Ctrl + S', 'Enregistrer le document'],
          ['Ctrl + B / I / U', 'Gras / Italique / Souligné'],
          ['Ctrl + Z / Y', 'Annuler / Rétablir'],
          ['Ctrl + X / C / V', 'Couper / Copier / Coller'],
          ['Ctrl + P', 'Imprimer'],
          ['Flèches', 'Naviguer entre les cellules'],
          ['Entrée / Tab', 'Valider et passer à la cellule suivante'],
          ['F2 / Double-clic', 'Modifier une cellule'],
          ['Suppr', 'Effacer la sélection'],
          ['Ctrl + /', 'Afficher les raccourcis'],
        ]}
      />
      <EditorAboutDialog
        open={showAbout}
        title="À propos de l'éditeur de feuilles de calcul"
        description="Un tableur complet intégré à votre espace de travail : formules, multi-feuilles, tri, filtre, mise en forme et export multi-format."
        features={[
          'Calcul réel des formules (SOMME, MOYENNE, SI, références…)',
          'Sélection multiple, poignée de recopie et redimensionnement',
          'Plusieurs feuilles avec onglets',
          'Annuler / rétablir et navigation au clavier',
          'Tri et filtrage des données',
          'Formatage des nombres (monnaie, pourcentage, dates)',
          'Export Excel, PDF et CSV',
          'Assistant IA pour les formules et l\u2019analyse',
        ]}
        onClose={() => setShowAbout(false)}
      />

      <WordPromptDialog
        open={renameOpen}
        title="Renommer le document"
        label="Nom du document"
        defaultValue={docName}
        confirmLabel="Renommer"
        onConfirm={(value) => {
          onRename?.(value);
          notify('Document renommé.');
        }}
        onClose={() => setRenameOpen(false)}
      />

      <ExcelCustomFormatDialog
        open={customFormatOpen}
        initialValue={selectedFmt.customFormat || '# ##0,00 €'}
        onConfirm={(value) => setCustomFormat(value)}
        onClose={() => setCustomFormatOpen(false)}
      />

      <ConditionalFormatDialog
        open={condFormatOpen}
        rules={activeSheet.conditionalFormats || []}
        selectionRange={selection ? selBounds(selection) : null}
        onAdd={addConditionalRule}
        onUpdate={updateConditionalRule}
        onRemove={removeConditionalRule}
        onClose={() => setCondFormatOpen(false)}
        notify={notify}
      />

      {toast && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[70] animate-toast-in px-4 py-2.5 rounded-lg bg-foreground-950 text-background-50 text-xs font-medium max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}