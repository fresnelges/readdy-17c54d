import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { DocType, ExcelContent, PowerPointContent, Slide, SlideElement } from '@/lib/documents';

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Parse un XML en toute sécurité : renvoie un document vide au lieu de lever
// une exception quand le XML est mal formé (fréquent avec des fichiers Office
// générés par des outils tiers). Cela évite de faire planter tout l'import.
function safeParseXml(xml: string): Document {
  try {
    return new DOMParser().parseFromString(xml, 'application/xml');
  } catch (err) {
    console.error('[documentImport] XML invalide, contenu ignoré :', err);
    return new DOMParser().parseFromString('<root />', 'application/xml');
  }
}

// Encode un fichier en base64 en utilisant l'implémentation native du navigateur
// (FileReader.readAsDataURL), bien plus rapide qu'un encodage manuel en JS pour
// les gros fichiers comme les PDF.
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Détermine le type de document éditable à partir de l'extension du fichier.
 * Renvoie null si le fichier n'est pas un document éditable (image, vidéo, pdf, zip…).
 */
export function detectDocType(fileName: string): DocType | null {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['doc', 'docx', 'docm', 'dotx', 'dotm', 'rtf', 'txt', 'md', 'odt'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'csv', 'ods'].includes(ext)) return 'excel';
  if (['ppt', 'pptx', 'pptm', 'ppsx', 'potx', 'odp'].includes(ext)) return 'powerpoint';
  if (['pdf'].includes(ext)) return 'pdf';
  return null;
}

// ── Excel / CSV ───────────────────────────────────────────────

function parseSpreadsheet(buffer: ArrayBuffer): ExcelContent {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : {};
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][];
  const rows = Math.max(20, aoa.length);
  const cols = Math.max(8, aoa.reduce((max, row) => Math.max(max, row.length), 0));
  const cells: Record<string, string> = {};
  aoa.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val === null || val === undefined || val === '') return;
      cells[`${r},${c}`] = String(val);
    });
  });
  return { cells, rows, cols };
}

// ── Word / texte ──────────────────────────────────────────────

function getParagraphStyle(p: Element): string {
  const pPr = p.getElementsByTagNameNS(WORD_NS, 'pPr')[0];
  const pStyle = pPr?.getElementsByTagNameNS(WORD_NS, 'pStyle')[0];
  return (pStyle?.getAttribute('w:val') || pStyle?.getAttribute('val') || '').toLowerCase();
}

const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const WORD_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: '#ffff00',
  green: '#00ff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  blue: '#0000ff',
  red: '#ff0000',
  darkBlue: '#00008b',
  darkCyan: '#008b8b',
  darkGreen: '#006400',
  darkMagenta: '#8b008b',
  darkRed: '#8b0000',
  darkYellow: '#808000',
  darkGray: '#808080',
  lightGray: '#c0c0c0',
  black: '#000000',
};

function wVal(el: Element | null | undefined): string | null {
  if (!el) return null;
  return el.getAttributeNS(WORD_NS, 'val') ?? el.getAttribute('val');
}

interface RunStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
  color: string | null;
  highlight: string | null;
  sz: number | null;
  font: string | null;
}

function readRunStyle(rPr: Element | null): RunStyle {
  const s: RunStyle = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    superscript: false,
    subscript: false,
    color: null,
    highlight: null,
    sz: null,
    font: null,
  };
  if (!rPr) return s;
  if (rPr.getElementsByTagNameNS(WORD_NS, 'b').length > 0 || rPr.getElementsByTagNameNS(WORD_NS, 'bCs').length > 0) {
    s.bold = true;
  }
  if (rPr.getElementsByTagNameNS(WORD_NS, 'i').length > 0 || rPr.getElementsByTagNameNS(WORD_NS, 'iCs').length > 0) {
    s.italic = true;
  }
  const u = rPr.getElementsByTagNameNS(WORD_NS, 'u')[0];
  if (u) s.underline = (wVal(u) || 'single') !== 'none';
  if (rPr.getElementsByTagNameNS(WORD_NS, 'strike').length > 0 || rPr.getElementsByTagNameNS(WORD_NS, 'dstrike').length > 0) {
    s.strike = true;
  }
  const va = wVal(rPr.getElementsByTagNameNS(WORD_NS, 'vertAlign')[0]);
  if (va === 'superscript') s.superscript = true;
  else if (va === 'subscript') s.subscript = true;
  const cv = wVal(rPr.getElementsByTagNameNS(WORD_NS, 'color')[0]);
  if (cv && cv !== 'auto') s.color = `#${cv}`;
  const hv = wVal(rPr.getElementsByTagNameNS(WORD_NS, 'highlight')[0]);
  if (hv && hv !== 'none') s.highlight = HIGHLIGHT_COLORS[hv] || hv;
  const szv = wVal(rPr.getElementsByTagNameNS(WORD_NS, 'sz')[0]);
  if (szv) s.sz = parseInt(szv, 10);
  const rF = rPr.getElementsByTagNameNS(WORD_NS, 'rFonts')[0];
  const fv =
    rF?.getAttributeNS(WORD_NS, 'ascii') ||
    rF?.getAttributeNS(WORD_NS, 'hAnsi') ||
    rF?.getAttributeNS(WORD_NS, 'cs') ||
    null;
  if (fv) s.font = fv;
  return s;
}

function runStyleToCss(s: RunStyle): string {
  const parts: string[] = [];
  if (s.sz) parts.push(`font-size:${s.sz / 2}pt`);
  if (s.font) parts.push(`font-family:'${s.font}',sans-serif`);
  if (s.color) parts.push(`color:${s.color}`);
  if (s.highlight) parts.push(`background-color:${s.highlight}`);
  if (s.strike) parts.push('text-decoration:line-through');
  if (s.superscript) parts.push('vertical-align:super;font-size:smaller');
  if (s.subscript) parts.push('vertical-align:sub;font-size:smaller');
  return parts.join(';');
}

function wrapRunText(text: string, s: RunStyle): string {
  let html = escapeHtml(text);
  if (s.bold) html = `<strong>${html}</strong>`;
  if (s.italic) html = `<em>${html}</em>`;
  if (s.underline) html = `<u>${html}</u>`;
  const css = runStyleToCss(s);
  if (css) html = `<span style="${css}">${html}</span>`;
  return html;
}

interface WordStyleDef {
  name: string;
  basedOn: string | null;
  sz: number | null;
  font: string | null;
  color: string | null;
  bold: boolean;
  italic: boolean;
  jc: string | null;
}

async function parseStyles(zip: JSZip): Promise<Map<string, WordStyleDef>> {
  const map = new Map<string, WordStyleDef>();
  const xml = await zip.file('word/styles.xml')?.async('string');
  if (!xml) return map;
  const doc = safeParseXml(xml);
  const styles = doc.getElementsByTagNameNS(WORD_NS, 'style');
  Array.from(styles).forEach((st) => {
    const id = st.getAttributeNS(WORD_NS, 'styleId') || '';
    const type = st.getAttributeNS(WORD_NS, 'type');
    if (type && type !== 'paragraph' && type !== 'character') return;
    const name = wVal(st.getElementsByTagNameNS(WORD_NS, 'name')[0]) || '';
    const basedOn = wVal(st.getElementsByTagNameNS(WORD_NS, 'basedOn')[0]);
    const rPr = st.getElementsByTagNameNS(WORD_NS, 'rPr')[0] || null;
    const rs = readRunStyle(rPr);
    const pPr = st.getElementsByTagNameNS(WORD_NS, 'pPr')[0] || null;
    const jc = pPr ? wVal(pPr.getElementsByTagNameNS(WORD_NS, 'jc')[0]) : null;
    map.set(id.toLowerCase(), {
      name: name.toLowerCase(),
      basedOn,
      sz: rs.sz,
      font: rs.font,
      color: rs.color,
      bold: rs.bold,
      italic: rs.italic,
      jc,
    });
  });
  return map;
}

function resolveHeadingLevel(styleId: string, styles: Map<string, WordStyleDef>): number {
  let level = 0;
  let id: string | null = styleId.toLowerCase();
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const def = styles.get(id);
    if (!def) break;
    const name = def.name;
    if (name.includes('heading 1') || name === 'title') return Math.max(level, 1);
    if (name.includes('heading 2')) return Math.max(level, 2);
    if (name.includes('heading 3')) return Math.max(level, 3);
    if (name.includes('heading 4')) return Math.max(level, 4);
    if (name.includes('heading 5')) return Math.max(level, 5);
    if (/heading\s*[6-9]/.test(name)) return Math.max(level, 6);
    id = def.basedOn;
  }
  return level;
}

function getParagraphAlign(p: Element): 'left' | 'center' | 'right' | 'justify' | null {
  const pPr = p.getElementsByTagNameNS(WORD_NS, 'pPr')[0];
  const jc = pPr?.getElementsByTagNameNS(WORD_NS, 'jc')[0];
  const v = jc ? wVal(jc) : null;
  if (v === 'center') return 'center';
  if (v === 'right' || v === 'end') return 'right';
  if (v === 'both') return 'justify';
  return null;
}

async function parseRunDrawing(
  run: Element,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  let html = '';
  const drawings = run.getElementsByTagNameNS(WORD_NS, 'drawing');
  for (const drawing of Array.from(drawings)) {
    const inline =
      drawing.getElementsByTagNameNS(WP_NS, 'inline')[0] ||
      drawing.getElementsByTagNameNS(WP_NS, 'anchor')[0];
    if (!inline) continue;
    const extent = inline.getElementsByTagNameNS(WP_NS, 'extent')[0];
    const cx = parseInt(extent?.getAttribute('cx') || '0', 10);
    const cy = parseInt(extent?.getAttribute('cy') || '0', 10);
    const blips = inline.getElementsByTagNameNS(DRAWING_NS, 'blip');
    for (const blip of Array.from(blips)) {
      const rid = blip.getAttributeNS(WORD_REL_NS, 'embed') || blip.getAttributeNS(WORD_REL_NS, 'link');
      if (!rid) continue;
      const rel = rels.get(rid);
      if (!rel || rel.external) continue;
      const src = await media(rel.target);
      if (!src) continue;
      const wPx = Math.round(cx / 9525);
      const hPx = Math.round(cy / 9525);
      const dims = `${wPx > 0 ? `width:${wPx}px;` : ''}${hPx > 0 ? `height:${hPx}px;` : ''}`;
      html += `<img src="${src}" alt="Image" style="max-width:100%;height:auto;${dims}" />`;
    }
  }
  const picts = run.getElementsByTagNameNS(WORD_NS, 'pict');
  for (const pict of Array.from(picts)) {
    const imagedata = pict.getElementsByTagNameNS('urn:schemas-microsoft-com:vml', 'imagedata')[0];
    const rid = imagedata?.getAttributeNS(WORD_REL_NS, 'id');
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel || rel.external) continue;
    const src = await media(rel.target);
    if (src) html += `<img src="${src}" alt="Image" style="max-width:100%;height:auto;" />`;
  }
  return html;
}

async function parseRun(
  run: Element,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  const rPr = run.getElementsByTagNameNS(WORD_NS, 'rPr')[0] || null;
  const s = readRunStyle(rPr);
  const img = await parseRunDrawing(run, rels, media);

  let text = '';
  for (const child of Array.from(run.children)) {
    const local = child.localName;
    if (local === 't' || local === 'delText') text += child.textContent || '';
    else if (local === 'tab') text += '\t';
    else if (local === 'br' || local === 'cr') text += '\n';
    else if (local === 'sym' || local === 'noBreakHyphen' || local === 'softHyphen') text += child.textContent || '';
  }

  let textHtml = '';
  if (text) {
    const lines = text.split('\n');
    textHtml = lines
      .map((line) => (line ? wrapRunText(line.replace(/\t/g, '    '), s) : ''))
      .join('<br>');
  }
  return textHtml + img;
}

async function parseChildren(
  container: Element,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  let out = '';
  for (const child of Array.from(container.children)) {
    const local = child.localName;
    if (local === 'r') {
      out += await parseRun(child, rels, media);
    } else if (local === 'hyperlink') {
      const rid = child.getAttributeNS(WORD_REL_NS, 'id');
      const anchor = child.getAttributeNS(WORD_NS, 'anchor');
      let href = '';
      if (rid) {
        const rel = rels.get(rid);
        if (rel?.external) href = rel.target;
      } else if (anchor) {
        href = `#${anchor}`;
      }
      const inner = await parseChildren(child, rels, media);
      out += href
        ? `<a href="${escapeHtml(href).replace(/"/g, '&quot;')}" target="_blank" rel="nofollow">${inner}</a>`
        : inner;
    } else if (local === 'ins' || local === 'smartTag') {
      out += await parseChildren(child, rels, media);
    }
  }
  return out;
}

interface ParsedParagraph {
  html: string;
  tag: string;
  align: 'left' | 'center' | 'right' | 'justify' | null;
  numId: string | null;
  ilvl: number;
}

async function parseParagraph(
  p: Element,
  styles: Map<string, WordStyleDef>,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<ParsedParagraph> {
  const styleId = getParagraphStyle(p);
  const level = styleId ? resolveHeadingLevel(styleId, styles) : 0;
  const tag = level >= 1 ? `h${Math.min(level, 6)}` : 'p';

  let align = getParagraphAlign(p);
  if (!align && styleId) align = (styles.get(styleId)?.jc as ParsedParagraph['align']) || null;

  const pPr = p.getElementsByTagNameNS(WORD_NS, 'pPr')[0];
  const numPr = pPr?.getElementsByTagNameNS(WORD_NS, 'numPr')[0];
  const numId = wVal(numPr?.getElementsByTagNameNS(WORD_NS, 'numId')[0]);
  const ilvl = parseInt(wVal(numPr?.getElementsByTagNameNS(WORD_NS, 'ilvl')[0]) || '0', 10);

  const html = await parseChildren(p, rels, media);
  return { html, tag, align, numId, ilvl };
}

async function parseCell(
  tc: Element,
  styles: Map<string, WordStyleDef>,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  const tcPr = tc.getElementsByTagNameNS(WORD_NS, 'tcPr')[0];
  const gridSpan = parseInt(
    wVal(tcPr?.getElementsByTagNameNS(WORD_NS, 'gridSpan')[0]) || '1',
    10,
  );
  const fill = wVal(tcPr?.getElementsByTagNameNS(WORD_NS, 'shd')[0]);
  const fillStyle = fill && fill !== 'auto' ? `background-color:#${fill};` : '';
  const paras = Array.from(tc.getElementsByTagNameNS(WORD_NS, 'p'));
  let cellHtml = '';
  for (const p of paras) {
    const parsed = await parseParagraph(p, styles, rels, media);
    const pStyle = parsed.align ? ` style="text-align:${parsed.align}"` : '';
    cellHtml += `<div${pStyle}>${parsed.html || '&nbsp;'}</div>`;
  }
  const spanAttr = gridSpan > 1 ? ` colspan="${gridSpan}"` : '';
  return `<td${spanAttr} style="border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;${fillStyle}">${cellHtml || '&nbsp;'}</td>`;
}

async function parseTable(
  tbl: Element,
  styles: Map<string, WordStyleDef>,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  const rows = Array.from(tbl.getElementsByTagNameNS(WORD_NS, 'tr'));
  const trHtml: string[] = [];
  for (const tr of rows) {
    const cells = Array.from(tr.children).filter((c) => c.localName === 'tc');
    const tdHtml: string[] = [];
    for (const tc of cells) {
      tdHtml.push(await parseCell(tc, styles, rels, media));
    }
    trHtml.push(`<tr>${tdHtml.join('')}</tr>`);
  }
  return `<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tbody>${trHtml.join('')}</tbody></table>`;
}

interface NumberingInfo {
  abstract: Map<string, Map<number, string>>;
  numToAbstract: Map<string, string>;
}

async function parseNumbering(zip: JSZip): Promise<NumberingInfo> {
  const abstract = new Map<string, Map<number, string>>();
  const numToAbstract = new Map<string, string>();
  const xml = await zip.file('word/numbering.xml')?.async('string');
  if (!xml) return { abstract, numToAbstract };
  const doc = safeParseXml(xml);
  const abstractNums = doc.getElementsByTagNameNS(WORD_NS, 'abstractNum');
  Array.from(abstractNums).forEach((an) => {
    const id = an.getAttributeNS(WORD_NS, 'abstractNumId') || '';
    const levels = new Map<number, string>();
    Array.from(an.getElementsByTagNameNS(WORD_NS, 'lvl')).forEach((lvl) => {
      const ilvl = parseInt(lvl.getAttributeNS(WORD_NS, 'ilvl') || '0', 10);
      const fmt = wVal(lvl.getElementsByTagNameNS(WORD_NS, 'numFmt')[0]) || 'decimal';
      levels.set(ilvl, fmt);
    });
    abstract.set(id, levels);
  });
  const nums = doc.getElementsByTagNameNS(WORD_NS, 'num');
  Array.from(nums).forEach((num) => {
    const numId = num.getAttributeNS(WORD_NS, 'numId') || '';
    const abId = wVal(num.getElementsByTagNameNS(WORD_NS, 'abstractNumId')[0]) || '';
    numToAbstract.set(numId, abId);
  });
  return { abstract, numToAbstract };
}

function isBulletList(numbering: NumberingInfo, numId: string, ilvl: number): boolean {
  const abId = numbering.numToAbstract.get(numId);
  if (!abId) return false;
  const levels = numbering.abstract.get(abId);
  const fmt = levels?.get(ilvl) || levels?.get(0) || 'decimal';
  return fmt === 'bullet';
}

async function parseBlockContainer(
  container: Element,
  styles: Map<string, WordStyleDef>,
  numbering: NumberingInfo,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
): Promise<string> {
  const parts: string[] = [];
  let openList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (openList) {
      parts.push(`</${openList}>`);
      openList = null;
    }
  };

  for (const child of Array.from(container.children)) {
    const local = child.localName;
    if (local === 'p') {
      const p = await parseParagraph(child, styles, rels, media);
      if (p.numId && p.numId !== '0') {
        const bullet = isBulletList(numbering, p.numId, p.ilvl);
        const target: 'ul' | 'ol' = bullet ? 'ul' : 'ol';
        if (openList !== target) {
          closeList();
          parts.push(`<${target}>`);
          openList = target;
        }
        parts.push(`<li>${p.html || '&nbsp;'}</li>`);
      } else {
        closeList();
        const style = p.align ? ` style="text-align:${p.align}"` : '';
        parts.push(`<${p.tag}${style}>${p.html || '&nbsp;'}</${p.tag}>`);
      }
    } else if (local === 'tbl') {
      closeList();
      parts.push(await parseTable(child, styles, rels, media));
    }
  }
  closeList();
  return parts.join('');
}

function relIdOf(el: Element): string | null {
  return (
    el.getAttributeNS(WORD_REL_NS, 'id') ||
    el.getAttribute('r:id') ||
    el.getAttribute('id')
  );
}

// Retrouve la référence d'en-tête/pied de page d'une section, en préférant le type « default ».
function findReference(sectPr: Element, local: string): string | null {
  const els = sectPr.getElementsByTagNameNS(WORD_NS, local);
  let fallback: string | null = null;
  for (const el of Array.from(els)) {
    const rid = relIdOf(el);
    if (!rid) continue;
    const type = el.getAttributeNS(WORD_NS, 'type') || '';
    if (type === 'default') return rid;
    if (!fallback) fallback = rid;
  }
  return fallback;
}

async function parseHeaderFooterPart(
  zip: JSZip,
  rid: string,
  rels: Map<string, Relationship>,
  styles: Map<string, WordStyleDef>,
  numbering: NumberingInfo,
): Promise<string> {
  const rel = rels.get(rid);
  if (!rel || rel.external) return '';
  const partPath = resolveTarget('word/document.xml', rel.target);
  const xml = await zip.file(partPath)?.async('string');
  if (!xml) return '';
  const doc = safeParseXml(xml);
  const root = doc.getElementsByTagNameNS(WORD_NS, 'hdr')[0] || doc.getElementsByTagNameNS(WORD_NS, 'ftr')[0];
  if (!root) return '';
  const partRels = await readRelationships(zip, getRelsPath(partPath));
  const partMedia = (target: string) => mediaToDataUrl(zip, resolveTarget(partPath, target));
  return parseBlockContainer(root, styles, numbering, partRels, partMedia);
}

async function parseDocxZip(zip: JSZip): Promise<{ html: string; header?: string; footer?: string }> {
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return { html: '' };
  const doc = safeParseXml(xml);
  const body = doc.getElementsByTagNameNS(WORD_NS, 'body')[0];
  if (!body) return { html: '' };

  const styles = await parseStyles(zip);
  const numbering = await parseNumbering(zip);
  const rels = await readRelationships(zip, 'word/_rels/document.xml.rels');
  const media = (target: string) => mediaToDataUrl(zip, resolveTarget('word/document.xml', target));

  const html = await parseBlockContainer(body, styles, numbering, rels, media);

  const result: { html: string; header?: string; footer?: string } = { html };

  const sectPr = firstChildNS(body, WORD_NS, 'sectPr');
  if (sectPr) {
    const headerRid = findReference(sectPr, 'headerReference');
    const footerRid = findReference(sectPr, 'footerReference');
    if (headerRid) {
      const header = await parseHeaderFooterPart(zip, headerRid, rels, styles, numbering);
      if (header.trim()) result.header = header;
    }
    if (footerRid) {
      const footer = await parseHeaderFooterPart(zip, footerRid, rels, styles, numbering);
      if (footer.trim()) result.footer = footer;
    }
  }

  return result;
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Extraction de secours pour les formats binaires anciens (.doc, .ppt)
function extractLegacyText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === 0) out += ' ';
    else if (b === 10 || b === 13 || b === 9) out += String.fromCharCode(b);
    else if (b >= 32 && b < 127) out += String.fromCharCode(b);
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

// ── PowerPoint ────────────────────────────────────────────────

const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const EMU_PER_INCH = 914400;

const SCHEME_COLORS: Record<string, string> = {
  tx1: '#000000',
  tx2: '#1f2937',
  bg1: '#ffffff',
  bg2: '#e5e7eb',
  dk1: '#000000',
  dk2: '#44546a',
  lt1: '#ffffff',
  lt2: '#e7e6e6',
  accent1: '#4472c4',
  accent2: '#ed7d31',
  accent3: '#a5a5a5',
  accent4: '#ffc000',
  accent5: '#5b9bd5',
  accent6: '#70ad47',
  hlink: '#0563c1',
  folHlink: '#954f72',
};

interface Relationship {
  target: string;
  external: boolean;
  type: string;
}

function firstChildNS(el: Element, ns: string, local: string): Element | null {
  const list = el.getElementsByTagNameNS(ns, local);
  return list.length ? list[0] : null;
}

function getAttrNS(el: Element, ns: string, local: string): string | null {
  const v = el.getAttributeNS(ns, local);
  if (v !== null && v !== '') return v;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (a.localName === local) return a.value;
  }
  return null;
}

function colorFromClrContainer(el: Element): string | null {
  const srgb = firstChildNS(el, DRAWING_NS, 'srgbClr');
  if (srgb) return `#${srgb.getAttribute('val') || '000000'}`;
  const scheme = firstChildNS(el, DRAWING_NS, 'schemeClr');
  if (scheme) return SCHEME_COLORS[scheme.getAttribute('val') || ''] || '#000000';
  const sys = firstChildNS(el, DRAWING_NS, 'sysClr');
  if (sys) return `#${sys.getAttribute('lastClr') || sys.getAttribute('val') || '000000'}`;
  return null;
}

function fillColor(container: Element): string | null {
  const solid = firstChildNS(container, DRAWING_NS, 'solidFill');
  if (solid) return colorFromClrContainer(solid);
  const grad = firstChildNS(container, DRAWING_NS, 'gradFill');
  if (grad) {
    const stops = grad.getElementsByTagNameNS(DRAWING_NS, 'gs');
    if (stops.length) {
      const c = colorFromClrContainer(stops[0] as Element);
      if (c) return c;
    }
  }
  return null;
}

async function readRelationships(zip: JSZip, relPath: string): Promise<Map<string, Relationship>> {
  const map = new Map<string, Relationship>();
  const xml = await zip.file(relPath)?.async('string');
  if (!xml) return map;
  const doc = safeParseXml(xml);
  Array.from(doc.getElementsByTagName('Relationship')).forEach((rel) => {
    map.set(rel.getAttribute('Id') || '', {
      target: rel.getAttribute('Target') || '',
      external: rel.getAttribute('TargetMode') === 'External',
      type: rel.getAttribute('Type') || '',
    });
  });
  return map;
}

function resolveTarget(slidePath: string, target: string): string {
  const base = slidePath.split('/').slice(0, -1);
  target.split('/').forEach((s) => {
    if (s === '..') base.pop();
    else if (s && s !== '.') base.push(s);
  });
  return base.join('/');
}

async function mediaToDataUrl(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  const b64 = await file.async('base64');
  const ext = (path.split('.').pop() || 'png').toLowerCase();
  const mime =
    ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'gif'
        ? 'image/gif'
        : ext === 'svg'
          ? 'image/svg+xml'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';
  return `data:${mime};base64,${b64}`;
}

function getEmbedRid(el: Element): string | null {
  const blip = firstChildNS(el, DRAWING_NS, 'blip');
  if (!blip) return null;
  return getAttrNS(blip, R_NS, 'embed');
}

function getLink(el: Element, rels: Map<string, Relationship>): string | null {
  const hlink = firstChildNS(el, DRAWING_NS, 'hlinkClick');
  if (!hlink) return null;
  const rid = getAttrNS(hlink, R_NS, 'id');
  if (rid) {
    const rel = rels.get(rid);
    if (rel && rel.external && rel.target) return rel.target;
    return null;
  }
  return null;
}

function parseXfrm(container: Element): { x: number; y: number; w: number; h: number } | null {
  const xfrm = firstChildNS(container, DRAWING_NS, 'xfrm');
  if (!xfrm) return null;
  const off = firstChildNS(xfrm, DRAWING_NS, 'off');
  const ext = firstChildNS(xfrm, DRAWING_NS, 'ext');
  if (!off || !ext) return null;
  return {
    x: parseInt(off.getAttribute('x') || '0', 10),
    y: parseInt(off.getAttribute('y') || '0', 10),
    w: parseInt(ext.getAttribute('cx') || '0', 10),
    h: parseInt(ext.getAttribute('cy') || '0', 10),
  };
}

interface BulletInfo {
  kind: 'none' | 'char' | 'number';
  char?: string;
  numberFormat?: string;
  level: number;
}

function readBullet(pPr: Element | null): BulletInfo {
  if (!pPr) return { kind: 'none', level: 0 };
  const lvl = parseInt(pPr.getAttribute('lvl') || '0', 10) || 0;
  const buChar = firstChildNS(pPr, DRAWING_NS, 'buChar');
  if (buChar) {
    return { kind: 'char', char: buChar.getAttribute('char') || '•', level: lvl };
  }
  const buAutoNum = firstChildNS(pPr, DRAWING_NS, 'buAutoNum');
  if (buAutoNum) {
    return { kind: 'number', numberFormat: buAutoNum.getAttribute('type') || 'arabicPeriod', level: lvl };
  }
  return { kind: 'none', level: lvl };
}

const AUTONUM_STYLES: Record<string, string> = {
  arabicPeriod: 'decimal',
  arabicParenR: 'decimal',
  romanUcPeriod: 'upper-roman',
  romanLcPeriod: 'lower-roman',
  alphaUcPeriod: 'upper-alpha',
  alphaLcPeriod: 'lower-alpha',
};

function parseTextRuns(
  txBody: Element,
  rels: Map<string, Relationship>,
): { html: string; align: 'left' | 'center' | 'right'; valign: 'top' | 'middle' | 'bottom' } {
  const bodyPr = firstChildNS(txBody, DRAWING_NS, 'bodyPr');
  const anchor = bodyPr?.getAttribute('anchor') || '';
  const valign: 'top' | 'middle' | 'bottom' = anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top';
  const paras = Array.from(txBody.getElementsByTagNameNS(DRAWING_NS, 'p'));
  let align: 'left' | 'center' | 'right' = 'left';
  const blocks: { inner: string; bullet: BulletInfo }[] = [];
  paras.forEach((p) => {
    const pPr = firstChildNS(p, DRAWING_NS, 'pPr');
    const algn = pPr?.getAttribute('algn') || '';
    if (algn === 'ctr') align = 'center';
    else if (algn === 'r') align = 'right';
    const runs = Array.from(p.getElementsByTagNameNS(DRAWING_NS, 'r'));
    let inner = '';
    runs.forEach((run) => {
      const rPr = firstChildNS(run, DRAWING_NS, 'rPr');
      const text = Array.from(run.getElementsByTagNameNS(DRAWING_NS, 't'))
        .map((t) => t.textContent || '')
        .join('');
      if (!text) return;
      let style = '';
      let bold = false;
      let italic = false;
      let underline = false;
      let strike = false;
      let sup = false;
      let sub = false;
      if (rPr) {
        const color = fillColor(rPr);
        const sz = rPr.getAttribute('sz');
        if (sz) style += `font-size:${parseInt(sz, 10) / 100}pt;`;
        const latin = firstChildNS(rPr, DRAWING_NS, 'latin');
        const font = latin?.getAttribute('typeface');
        if (font) style += `font-family:'${font}',sans-serif;`;
        if (color) style += `color:${color};`;
        const highlight = firstChildNS(rPr, DRAWING_NS, 'highlight');
        if (highlight) {
          const hlColor = colorFromClrContainer(highlight);
          if (hlColor) style += `background-color:${hlColor};`;
        }
        bold = rPr.getElementsByTagNameNS(DRAWING_NS, 'b').length > 0;
        italic = rPr.getElementsByTagNameNS(DRAWING_NS, 'i').length > 0;
        underline = rPr.getElementsByTagNameNS(DRAWING_NS, 'u').length > 0;
        strike = rPr.getElementsByTagNameNS(DRAWING_NS, 'strike').length > 0;
        const baseline = rPr.getAttribute('baseline');
        if (baseline) {
          const bv = parseInt(baseline, 10);
          if (bv > 0) sup = true;
          else if (bv < 0) sub = true;
        }
      }
      let html = escapeHtml(text);
      if (bold) html = `<strong>${html}</strong>`;
      if (italic) html = `<em>${html}</em>`;
      if (underline) html = `<u>${html}</u>`;
      if (strike) html = `<s>${html}</s>`;
      if (sup) html = `<sup>${html}</sup>`;
      if (sub) html = `<sub>${html}</sub>`;
      const wrapped = style ? `<span style="${style}">${html}</span>` : html;
      const link = rPr ? getLink(rPr, rels) : null;
      if (link) {
        inner += `<a href="${link}" target="_blank" rel="nofollow" style="color:inherit;">${wrapped}</a>`;
      } else {
        inner += wrapped;
      }
    });
    blocks.push({ inner, bullet: readBullet(pPr) });
  });
  let html = '';
  let openList: { tag: 'ul' | 'ol'; level: number } | null = null;
  const closeList = () => {
    if (openList) {
      html += `</${openList.tag}>`;
      openList = null;
    }
  };
  blocks.forEach((b) => {
    if (b.bullet.kind === 'none') {
      closeList();
      html += `<p style="margin:0;">${b.inner || '<br>'}</p>`;
      return;
    }
    const tag: 'ul' | 'ol' = b.bullet.kind === 'char' ? 'ul' : 'ol';
    if (!openList || openList.tag !== tag || openList.level !== b.bullet.level) {
      closeList();
      let attrs = '';
      if (tag === 'ul') {
        attrs = ` data-bullet="${escapeHtml(b.bullet.char || '•').replace(/"/g, '&quot;')}"`;
      } else {
        attrs = ` data-num="${b.bullet.numberFormat || 'arabicPeriod'}"`;
      }
      const listType =
        tag === 'ol' ? ` list-style-type:${AUTONUM_STYLES[b.bullet.numberFormat || ''] || 'decimal'};` : '';
      const indentPx = 24 + b.bullet.level * 20;
      html += `<${tag}${attrs} style="margin:0;padding-left:${indentPx}px;${listType}">`;
      openList = { tag, level: b.bullet.level };
    }
    html += `<li>${b.inner || '<br>'}</li>`;
  });
  closeList();
  return { html, align, valign };
}

async function parseShape(
  sp: Element,
  rels: Map<string, Relationship>,
  slideW: number,
  slideH: number,
  offX: number,
  offY: number,
): Promise<SlideElement | null> {
  const spPr = firstChildNS(sp, P_NS, 'spPr');
  const txBody = firstChildNS(sp, P_NS, 'txBody');
  const nvSpPr = firstChildNS(sp, P_NS, 'nvSpPr');
  const cNvPr = nvSpPr ? firstChildNS(nvSpPr, P_NS, 'cNvPr') : null;
  const xfrm = spPr ? parseXfrm(spPr) : null;
  if (!xfrm) return null;
  const x = ((offX + xfrm.x) / slideW) * 100;
  const y = ((offY + xfrm.y) / slideH) * 100;
  const w = (xfrm.w / slideW) * 100;
  const h = (xfrm.h / slideH) * 100;
  const fill = spPr ? fillColor(spPr) : null;
  const link = cNvPr ? getLink(cNvPr, rels) : null;

  let html = '';
  let align: 'left' | 'center' | 'right' = 'left';
  let valign: 'top' | 'middle' | 'bottom' = 'middle';
  if (txBody) {
    const parsed = parseTextRuns(txBody, rels);
    html = parsed.html;
    align = parsed.align;
    valign = parsed.valign;
  }

  if (html.trim()) {
    return {
      id: crypto.randomUUID(),
      type: 'text',
      x,
      y,
      w,
      h,
      html,
      align,
      valign,
      fill: fill || undefined,
      link: link || undefined,
    };
  }
  if (fill) {
    return { id: crypto.randomUUID(), type: 'shape', x, y, w, h, fill, link: link || undefined };
  }
  return null;
}

async function parsePicture(
  pic: Element,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
  slideW: number,
  slideH: number,
  offX: number,
  offY: number,
): Promise<SlideElement | null> {
  const spPr = firstChildNS(pic, P_NS, 'spPr');
  const blipFill = firstChildNS(pic, P_NS, 'blipFill');
  const nvPicPr = firstChildNS(pic, P_NS, 'nvPicPr');
  const cNvPr = nvPicPr ? firstChildNS(nvPicPr, P_NS, 'cNvPr') : null;
  const xfrm = spPr ? parseXfrm(spPr) : null;
  if (!xfrm) return null;
  const rid = blipFill ? getEmbedRid(blipFill) : null;
  let src: string | null = null;
  if (rid) {
    const rel = rels.get(rid);
    if (rel && !rel.external) src = await media(rel.target);
  }
  if (!src) return null;
  return {
    id: crypto.randomUUID(),
    type: 'image',
    x: ((offX + xfrm.x) / slideW) * 100,
    y: ((offY + xfrm.y) / slideH) * 100,
    w: (xfrm.w / slideW) * 100,
    h: (xfrm.h / slideH) * 100,
    src,
    link: cNvPr ? (getLink(cNvPr, rels) || undefined) : undefined,
  };
}

async function parseTree(
  container: Element,
  rels: Map<string, Relationship>,
  media: (target: string) => Promise<string | null>,
  slideW: number,
  slideH: number,
  offX: number,
  offY: number,
): Promise<SlideElement[]> {
  const out: SlideElement[] = [];
  for (const node of Array.from(container.children)) {
    const el = node as Element;
    const local = el.localName;
    if (local === 'sp') {
      const e = await parseShape(el, rels, slideW, slideH, offX, offY);
      if (e) out.push(e);
    } else if (local === 'pic') {
      const e = await parsePicture(el, rels, media, slideW, slideH, offX, offY);
      if (e) out.push(e);
    } else if (local === 'grpSp') {
      const grpPr = firstChildNS(el, P_NS, 'grpSpPr');
      const xfrm = grpPr ? firstChildNS(grpPr, DRAWING_NS, 'xfrm') : null;
      const off = xfrm ? firstChildNS(xfrm, DRAWING_NS, 'off') : null;
      const gx = off ? parseInt(off.getAttribute('x') || '0', 10) : 0;
      const gy = off ? parseInt(off.getAttribute('y') || '0', 10) : 0;
      const sub = await parseTree(el, rels, media, slideW, slideH, offX + gx, offY + gy);
      out.push(...sub);
    }
  }
  return out;
}

function getRelsPath(partPath: string): string {
  const idx = partPath.lastIndexOf('/');
  if (idx < 0) return `_rels/${partPath}.rels`;
  const dir = partPath.slice(0, idx + 1);
  const name = partPath.slice(idx + 1);
  return `${dir}_rels/${name}.rels`;
}

function getRelTargetByType(rels: Map<string, Relationship>, typeSuffix: string): string | null {
  for (const rel of rels.values()) {
    if (rel.type.endsWith(`/${typeSuffix}`)) return rel.target;
  }
  return null;
}

/**
 * Lit le fond explicitement défini sur une partie (diapositive, layout ou masque).
 * Renvoie aussi bgRefIdx si le fond référence un style du thème (à résoudre via bgFillStyleLst).
 */
async function parsePartBackground(
  zip: JSZip,
  partPath: string,
): Promise<{ bg?: string; bgImage?: string; bgRefIdx?: number }> {
  const xml = await zip.file(partPath)?.async('string');
  if (!xml) return {};
  const doc = safeParseXml(xml);
  const cSld = firstChildNS(doc.documentElement, P_NS, 'cSld');
  const bg = cSld ? firstChildNS(cSld, P_NS, 'bg') : null;
  if (!bg) return {};
  const bgPr = firstChildNS(bg, P_NS, 'bgPr');
  if (!bgPr) return {};
  const color = fillColor(bgPr);
  if (color) return { bg: color };
  const blipFill = firstChildNS(bgPr, DRAWING_NS, 'blipFill');
  if (blipFill) {
    const rid = getEmbedRid(blipFill);
    if (rid) {
      const rels = await readRelationships(zip, getRelsPath(partPath));
      const rel = rels.get(rid);
      if (rel && !rel.external) {
        const src = await mediaToDataUrl(zip, resolveTarget(partPath, rel.target));
        if (src) return { bgImage: src };
      }
    }
    return {};
  }
  const bgRef = firstChildNS(bgPr, DRAWING_NS, 'bgRef');
  if (bgRef) {
    const idx = parseInt(bgRef.getAttribute('idx') || '', 10);
    if (!Number.isNaN(idx)) return { bgRefIdx: idx };
  }
  return {};
}

/**
 * Résout le fond hérité depuis le thème (liste bgFillStyleLst).
 */
async function parseThemeBackground(
  zip: JSZip,
  themePath: string,
  bgRefIdx?: number,
): Promise<{ bg?: string; bgImage?: string }> {
  const xml = await zip.file(themePath)?.async('string');
  if (!xml) return {};
  const doc = safeParseXml(xml);
  const lst = firstChildNS(doc.documentElement, DRAWING_NS, 'bgFillStyleLst');
  if (!lst) return {};
  const fills = Array.from(lst.children);
  let index = bgRefIdx !== undefined ? bgRefIdx - 1001 : 0;
  if (index < 0 || index >= fills.length) index = 0;
  const fill = fills[index] as Element | undefined;
  if (!fill) return {};
  const color = fillColor(fill);
  if (color) return { bg: color };
  const blipFill = firstChildNS(fill, DRAWING_NS, 'blipFill');
  if (blipFill) {
    const rid = getEmbedRid(blipFill);
    if (rid) {
      const rels = await readRelationships(zip, getRelsPath(themePath));
      const rel = rels.get(rid);
      if (rel && !rel.external) {
        const src = await mediaToDataUrl(zip, resolveTarget(themePath, rel.target));
        if (src) return { bgImage: src };
      }
    }
  }
  return {};
}

/**
 * Résout le fond effectif d'une diapositive en suivant la chaîne d'héritage PowerPoint :
 * diapositive → layout → masque (slide master) → thème.
 */
async function resolveEffectiveBackground(
  zip: JSZip,
  slidePath: string,
): Promise<{ bg?: string; bgImage?: string }> {
  let bgRefIdx: number | undefined;

  const slideRels = await readRelationships(zip, getRelsPath(slidePath));
  const layoutRaw = getRelTargetByType(slideRels, 'slideLayout');
  const layoutPath = layoutRaw ? resolveTarget(slidePath, layoutRaw) : null;

  let result = await parsePartBackground(zip, slidePath);
  if (result.bgRefIdx !== undefined) bgRefIdx = result.bgRefIdx;
  if (result.bg || result.bgImage) return result;

  if (layoutPath) {
    result = await parsePartBackground(zip, layoutPath);
    if (result.bgRefIdx !== undefined) bgRefIdx = result.bgRefIdx;
    if (result.bg || result.bgImage) return result;
  }

  let masterPath: string | null = null;
  if (layoutPath) {
    const layoutRels = await readRelationships(zip, getRelsPath(layoutPath));
    const masterRaw = getRelTargetByType(layoutRels, 'slideMaster');
    masterPath = masterRaw ? resolveTarget(layoutPath, masterRaw) : null;
  }

  if (masterPath) {
    result = await parsePartBackground(zip, masterPath);
    if (result.bgRefIdx !== undefined) bgRefIdx = result.bgRefIdx;
    if (result.bg || result.bgImage) return result;

    const masterRels = await readRelationships(zip, getRelsPath(masterPath));
    const themeRaw = getRelTargetByType(masterRels, 'theme');
    const themePath = themeRaw ? resolveTarget(masterPath, themeRaw) : null;
    if (themePath) return parseThemeBackground(zip, themePath, bgRefIdx);
  }

  return {};
}

async function getSlideSize(zip: JSZip): Promise<{ w: number; h: number }> {
  const xml = await zip.file('ppt/presentation.xml')?.async('string');
  if (xml) {
    const doc = safeParseXml(xml);
    const sldSz = firstChildNS(doc.documentElement, P_NS, 'sldSz');
    if (sldSz) {
      const cx = parseInt(sldSz.getAttribute('cx') || '', 10);
      const cy = parseInt(sldSz.getAttribute('cy') || '', 10);
      if (cx && cy) return { w: cx, h: cy };
    }
  }
  return { w: 12192000, h: 6858000 };
}

function stripTags(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

async function parsePptxZip(zip: JSZip): Promise<PowerPointContent> {
  const slideFiles: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(relativePath)) slideFiles.push(relativePath);
  });
  slideFiles.sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
    const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
    return na - nb;
  });

  const { w: slideW, h: slideH } = await getSlideSize(zip);
  const canvasW = Math.round(slideW / 12700);
  const canvasH = Math.round(slideH / 12700);

  const slides: Slide[] = [];
  for (const path of slideFiles) {
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    const doc = safeParseXml(xml);
    const relPath = path.replace(/^ppt\/slides\/(slide\d+)\.xml$/, 'ppt/slides/_rels/$1.xml.rels');
    const rels = await readRelationships(zip, relPath);
    const media = (target: string) => mediaToDataUrl(zip, resolveTarget(path, target));

    const cSld = firstChildNS(doc.documentElement, P_NS, 'cSld');
    const spTree = cSld ? firstChildNS(cSld, P_NS, 'spTree') : null;

    const bgInfo = await resolveEffectiveBackground(zip, path);
    const elements = spTree ? await parseTree(spTree, rels, media, slideW, slideH, 0, 0) : [];

    const textEls = elements.filter((e) => e.type === 'text');
    const title = textEls.length ? stripTags(textEls[0].html || '') : 'Diapositive';
    const body = textEls
      .slice(1)
      .map((e) => stripTags(e.html || ''))
      .join('\n');

    slides.push({
      id: crypto.randomUUID(),
      title: title || 'Diapositive',
      body,
      bg: bgInfo.bg,
      bgImage: bgInfo.bgImage,
      elements,
      rich: elements.length > 0,
      canvasW,
      canvasH,
    });
  }

  if (slides.length === 0) {
    slides.push({ id: crypto.randomUUID(), title: 'Diapositive', body: '' });
  }
  return { slides };
}

// ── Point d'entrée ────────────────────────────────────────────

export async function importFileAsContent(file: File, type: DocType): Promise<Record<string, unknown>> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (type === 'pdf') {
    // Lit le fichier directement en base64 (un seul passage, encodage natif).
    const dataUrl = await readFileAsDataUrl(file);
    return { pdfBase64: dataUrl.split(',')[1] || '', fileName: file.name };
  }

  const buffer = await file.arrayBuffer();

  if (type === 'excel') {
    return parseSpreadsheet(buffer);
  }

  if (type === 'powerpoint') {
    if (['pptx', 'pptm', 'ppsx', 'potx'].includes(ext)) {
      try {
        const zip = await JSZip.loadAsync(buffer);
        return await parsePptxZip(zip);
      } catch (err) {
        console.error('[documentImport] Échec du parsing PowerPoint :', err);
        const title = file.name.replace(/\.[^.]+$/, '') || 'Diapositive';
        return { slides: [{ id: crypto.randomUUID(), title, body: extractLegacyText(buffer) }] };
      }
    }
    const title = file.name.replace(/\.[^.]+$/, '') || 'Diapositive';
    return { slides: [{ id: crypto.randomUUID(), title, body: extractLegacyText(buffer) }] };
  }

  // word
  if (['docx', 'docm', 'dotx', 'dotm'].includes(ext)) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      return await parseDocxZip(zip);
    } catch (err) {
      console.error('[documentImport] Échec du parsing Word :', err);
      return { html: textToHtml(extractLegacyText(buffer)) };
    }
  }
  if (ext === 'txt' || ext === 'md') {
    return { html: textToHtml(await file.text()) };
  }
  // .doc, .rtf, .odt → extraction de secours
  return { html: textToHtml(extractLegacyText(buffer)) };
}