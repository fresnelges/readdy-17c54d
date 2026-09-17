import type { CSSProperties, MouseEvent } from 'react';
import type { ExcelSheet, MergeRange } from '@/lib/documents';
import type { CellValue } from '@/lib/excelFormula';
import { cellDisplay } from '@/lib/excelFormula';
import { applyNumFormat, parseNumericValue } from '@/lib/excelNumberFormat';
import { resolveConditionalStyle } from '@/lib/excelConditionalFormat';
import {
  DEFAULT_COL_W,
  DEFAULT_ROW_H,
  HEADER_H,
  ROW_NUM_W,
  cellKey,
  colLabel,
  inSel,
  type Selection,
} from '@/lib/excelModel';

interface ExcelGridProps {
  sheet: ExcelSheet;
  computed: Map<string, CellValue>;
  selection: Selection | null;
  editing: { r: number; c: number } | null;
  editingInCell: boolean;
  gridlines: boolean;
  zoom: number;
  freezeRows: number;
  freezeCols: number;
  readOnly: boolean;
  hiddenRows: Set<number> | null;
  onCellPointerDown: (r: number, c: number, e: MouseEvent) => void;
  onCellEnter: (r: number, c: number) => void;
  onCellDoubleClick: (r: number, c: number) => void;
  onCellChange: (r: number, c: number, value: string) => void;
  onFillPointerDown: (e: MouseEvent) => void;
  onResizeColStart: (c: number, e: MouseEvent) => void;
  onResizeRowStart: (r: number, e: MouseEvent) => void;
}

function flexAlign(v: string | undefined): CSSProperties['alignItems'] {
  if (v === 'top') return 'flex-start';
  if (v === 'middle') return 'center';
  return 'flex-end';
}

// Alignement automatique façon Google Sheets : nombres à droite, texte à
// gauche. Respecte un alignement explicite choisi par l'utilisateur.
function resolveAlign(
  raw: string | undefined,
  computed: Map<string, CellValue>,
  r: number,
  c: number,
  fmt: { align?: 'left' | 'center' | 'right' },
): CSSProperties['textAlign'] {
  if (fmt.align) return fmt.align;
  // Formule : on se base sur le type de la valeur calculée.
  if (raw && raw.startsWith('=')) {
    const val = computed.get(cellKey(r, c));
    if (typeof val === 'number') return 'right';
    if (typeof val === 'boolean') return 'center';
    return 'left';
  }
  // Valeur saisie : un nombre s'aligne à droite, le reste à gauche.
  if (raw && parseNumericValue(raw) !== null) return 'right';
  return 'left';
}

export default function ExcelGrid({
  sheet,
  computed,
  selection,
  editing,
  editingInCell,
  gridlines,
  zoom,
  freezeRows,
  freezeCols,
  readOnly,
  hiddenRows,
  onCellPointerDown,
  onCellEnter,
  onCellDoubleClick,
  onCellChange,
  onFillPointerDown,
  onResizeColStart,
  onResizeRowStart,
}: ExcelGridProps) {
  const colW = (c: number) => sheet.colWidths?.[c] || DEFAULT_COL_W;
  const rowH = (r: number) => sheet.rowHeights?.[r] || DEFAULT_ROW_H;

  const colOffsets: number[] = [];
  let acc = 0;
  for (let c = 0; c < sheet.cols; c += 1) {
    colOffsets[c] = acc;
    acc += colW(c);
  }
  const rowOffsets: number[] = [];
  let racc = 0;
  for (let r = 0; r < sheet.rows; r += 1) {
    rowOffsets[r] = racc;
    racc += rowH(r);
  }

  const visibleRows: number[] = [];
  for (let r = 0; r < sheet.rows; r += 1) {
    if (!hiddenRows || !hiddenRows.has(r)) visibleRows.push(r);
  }

  // ── Fusion de cellules ────────────────────────────────────────────────────
  const merges = sheet.merges || [];
  const mergeByAnchor = new Map<string, MergeRange>();
  const coveredNonAnchor = new Set<string>();
  for (const m of merges) {
    mergeByAnchor.set(cellKey(m.r1, m.c1), m);
    for (let r = m.r1; r <= m.r2; r += 1) {
      for (let c = m.c1; c <= m.c2; c += 1) {
        if (!(r === m.r1 && c === m.c1)) coveredNonAnchor.add(cellKey(r, c));
      }
    }
  }

  const mergedWidth = (m: MergeRange) => {
    let w = 0;
    for (let c = m.c1; c <= m.c2; c += 1) w += colW(c);
    return w;
  };
  const mergedHeight = (m: MergeRange) => {
    let h = 0;
    for (let r = m.r1; r <= m.r2; r += 1) h += rowH(r);
    return h;
  };

  return (
    <div style={{ zoom: zoom / 100 }}>
      <table
        className={`border-separate ${gridlines ? 'border-t border-l border-background-200/70' : ''}`}
        style={{ borderSpacing: 0 }}
      >
        <thead>
          <tr>
            <th
              className="relative sticky top-0 left-0 z-30 bg-background-100 border-r border-b border-background-200/70"
              style={{ width: ROW_NUM_W, minWidth: ROW_NUM_W, height: HEADER_H }}
            ></th>
            {Array.from({ length: sheet.cols }).map((_, c) => (
              <th
                key={c}
                className="relative sticky top-0 bg-background-100 border-r border-b border-background-200/70 text-xs font-medium text-foreground-500 px-2 text-center"
                style={{
                  left: c < freezeCols ? ROW_NUM_W + colOffsets[c] : undefined,
                  zIndex: c < freezeCols ? 20 : 10,
                  width: colW(c),
                  minWidth: colW(c),
                  height: HEADER_H,
                }}
              >
                {colLabel(c)}
                {!readOnly && (
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onResizeColStart(c, e);
                    }}
                    className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary-400/60 z-20"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r) => (
            <tr key={r}>
              <td
                className="relative sticky left-0 bg-background-100 border-r border-b border-background-200/70 text-xs text-foreground-500 text-center"
                style={{
                  top: r < freezeRows ? HEADER_H + rowOffsets[r] : undefined,
                  zIndex: r < freezeRows ? 20 : 10,
                  width: ROW_NUM_W,
                  minWidth: ROW_NUM_W,
                  height: rowH(r),
                }}
              >
                {r + 1}
                {!readOnly && (
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onResizeRowStart(r, e);
                    }}
                    className="absolute bottom-0 left-0 h-1.5 w-full cursor-row-resize hover:bg-primary-400/60 z-20"
                  />
                )}
              </td>
              {Array.from({ length: sheet.cols }).map((_, c) => {
                const key = cellKey(r, c);
                if (coveredNonAnchor.has(key)) return null;

                const merge = mergeByAnchor.get(key);
                const raw = sheet.cells[key];
                const fmt = sheet.formats?.[key] || {};
                const isEdit = !!editing && editing.r === r && editing.c === c;
                const editHere = isEdit && editingInCell;
                const isSel = inSel(r, c, selection);
                const isFocus = !!selection && selection.focus.r === r && selection.focus.c === c;
                const isFrozen = r < freezeRows || c < freezeCols;

                const frozenStyle: CSSProperties = {};
                // La fusion est incompatible avec le positionnement sticky :
                // on l'ignore pour les cellules fusionnées afin d'éviter des
                // artefacts de rendu pendant le défilement.
                if (isFrozen && !merge) {
                  frozenStyle.position = 'sticky';
                  if (r < freezeRows) frozenStyle.top = HEADER_H + rowOffsets[r];
                  if (c < freezeCols) frozenStyle.left = ROW_NUM_W + colOffsets[c];
                  frozenStyle.zIndex = r < freezeRows && c < freezeCols ? 15 : 5;
                }
                const shadows: string[] = [];
                if (isFocus) shadows.push('inset 0 0 0 2px oklch(var(--primary-500))');
                else if (isSel) shadows.push('inset 0 0 0 1px oklch(var(--primary-300))');
                if (freezeCols > 0 && c === freezeCols - 1)
                  shadows.push('inset -2px 0 0 0 oklch(var(--foreground-300) / 0.5)');
                if (freezeRows > 0 && r === freezeRows - 1)
                  shadows.push('inset 0 -2px 0 0 oklch(var(--foreground-300) / 0.5)');
                if (shadows.length) frozenStyle.boxShadow = shadows.join(', ');

                const cellW = merge ? mergedWidth(merge) : colW(c);
                const cellH = merge ? mergedHeight(merge) : rowH(r);

                // Bordures personnalisées choisies par l'utilisateur.
                const borders = fmt.borders;
                if (borders) {
                  const bc = borders.color || '#334155';
                  const bw = borders.style === 'medium' ? '2px' : borders.style === 'thick' ? '3px' : '1px';
                  if (borders.top) frozenStyle.borderTop = `${bw} solid ${bc}`;
                  if (borders.bottom) frozenStyle.borderBottom = `${bw} solid ${bc}`;
                  if (borders.left) frozenStyle.borderLeft = `${bw} solid ${bc}`;
                  if (borders.right) frozenStyle.borderRight = `${bw} solid ${bc}`;
                }

                const decorations = [
                  fmt.underline ? 'underline' : '',
                  fmt.strike ? 'line-through' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const rawDisplay = cellDisplay(raw, computed, r, c);
                const cond = resolveConditionalStyle(rawDisplay, sheet.conditionalFormats, r, c);

                const textStyle: CSSProperties = {
                  fontWeight: fmt.bold ? 700 : 400,
                  fontStyle: fmt.italic ? 'italic' : 'normal',
                  textDecoration: decorations || 'none',
                  textAlign: resolveAlign(raw, computed, r, c, fmt),
                  color: cond.color || fmt.color || undefined,
                  fontFamily: fmt.fontFamily || undefined,
                  fontSize: fmt.fontSize ? `${fmt.fontSize}px` : undefined,
                  whiteSpace: fmt.wrap ? 'pre-wrap' : 'nowrap',
                  wordBreak: fmt.wrap ? 'break-word' : undefined,
                  transform: fmt.rotation ? `rotate(${fmt.rotation}deg)` : undefined,
                };

                const displayVal = applyNumFormat(rawDisplay, fmt);

                return (
                  <td
                    key={c}
                    colSpan={merge ? merge.c2 - merge.c1 + 1 : undefined}
                    rowSpan={merge ? merge.r2 - merge.r1 + 1 : undefined}
                    onPointerDown={(e) => onCellPointerDown(r, c, e)}
                    onMouseEnter={() => onCellEnter(r, c)}
                    onDoubleClick={() => onCellDoubleClick(r, c)}
                    className="relative p-0 cursor-cell border-r border-b border-background-200/70 overflow-hidden"
                    style={{
                      width: cellW,
                      minWidth: cellW,
                      height: cellH,
                      backgroundColor: cond.bg || fmt.bg || (isFrozen ? '#ffffff' : undefined),
                      ...frozenStyle,
                    }}
                  >
                    {isSel && <div className="absolute inset-0 pointer-events-none bg-primary-500/10" />}
                    {isFocus && !readOnly && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onFillPointerDown(e);
                        }}
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-500 border border-background-50 rounded-[2px] z-20 cursor-crosshair"
                      />
                    )}
                    {editHere ? (
                      <textarea
                        value={raw ?? ''}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        readOnly={readOnly}
                        autoFocus
                        className="relative w-full h-full px-2 py-0.5 bg-transparent focus:outline-none resize-none overflow-hidden"
                        style={textStyle}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex px-2 py-0.5"
                        style={{ alignItems: flexAlign(fmt.valign) }}
                      >
                        <div className="w-full overflow-hidden select-none" style={textStyle}>
                          {displayVal}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}