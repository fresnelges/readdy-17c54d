import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { WordContent, ExcelContent, PowerPointContent } from '@/lib/documents';
import { normalizeSheets } from '@/lib/excelModel';
import { sheetToDisplayGrid } from '@/lib/excelFormula';

interface RunStyle {
  bold: boolean;
  italics: boolean;
  underline: boolean;
  strike: boolean;
  superScript: boolean;
  subScript: boolean;
  color: string | null;
  highlight: string | null;
  sizePt: number | null;
  font: string | null;
}

const BASE_STYLE: RunStyle = {
  bold: false,
  italics: false,
  underline: false,
  strike: false,
  superScript: false,
  subScript: false,
  color: null,
  highlight: null,
  sizePt: null,
  font: null,
};

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'div',
  'table',
  'blockquote',
  'pre',
]);

export function safeFileName(name: string, ext: string): string {
  const base = (name || 'document')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\.[^.]+$/, '');
  return `${base || 'document'}.${ext}`;
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function alignmentFromElement(el: Element): AlignmentType | undefined {
  const align = (el.getAttribute('align') || '').toLowerCase();
  const styleAlign = (el.style?.textAlign || '').toLowerCase();
  const value = align || styleAlign;
  if (value === 'center') return AlignmentType.CENTER;
  if (value === 'right') return AlignmentType.RIGHT;
  if (value === 'justify') return AlignmentType.JUSTIFIED;
  if (value === 'left') return AlignmentType.LEFT;
  return undefined;
}

const NAMED_COLORS: Record<string, string> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '00FF00',
  blue: '0000FF',
  yellow: 'FFFF00',
  gray: '808080',
  grey: '808080',
  orange: 'FFA500',
  purple: '800080',
  navy: '000080',
  maroon: '800000',
  teal: '008080',
  olive: '808000',
  silver: 'C0C0C0',
  lime: '00FF00',
  aqua: '00FFFF',
  fuchsia: 'FF00FF',
};

function colorToHex(color: string): string | null {
  const t = color.trim();
  if (t.startsWith('#')) {
    const c = t.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(c)) return (c[0] + c[0] + c[1] + c[1] + c[2] + c[2]).toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(c)) return c.toUpperCase();
    return null;
  }
  return NAMED_COLORS[t.toLowerCase()] || null;
}

function parseInlineCss(el: Element, base: RunStyle): RunStyle {
  const styleAttr = el.getAttribute('style') || '';
  const s: RunStyle = { ...base };
  const mColor = styleAttr.match(/color:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
  if (mColor) {
    const hex = colorToHex(mColor[1]);
    if (hex) s.color = hex;
  }
  const mBg = styleAttr.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
  if (mBg) {
    const hex = colorToHex(mBg[1]);
    if (hex) s.highlight = hex;
  }
  const mSize = styleAttr.match(/font-size:\s*([\d.]+)(pt|px)/);
  if (mSize) {
    const v = parseFloat(mSize[1]);
    s.sizePt = mSize[2] === 'pt' ? v : Math.max(4, Math.round(v * 0.75));
  }
  const mFace = styleAttr.match(/font-family:\s*'?([^';,]+)/);
  if (mFace) s.font = mFace[1].trim();
  if (/text-decoration:\s*line-through/.test(styleAttr)) s.strike = true;
  if (/vertical-align:\s*super/.test(styleAttr)) s.superScript = true;
  if (/vertical-align:\s*sub/.test(styleAttr)) s.subScript = true;
  return s;
}

function buildTextRun(text: string, s: RunStyle): TextRun {
  const opts: ConstructorParameters<typeof TextRun>[0] = { text };
  if (s.bold) opts.bold = true;
  if (s.italics) opts.italics = true;
  if (s.underline) opts.underline = {};
  if (s.strike) opts.strike = true;
  if (s.superScript) opts.superScript = true;
  if (s.subScript) opts.subScript = true;
  if (s.color) opts.color = s.color;
  if (s.highlight) opts.shading = { fill: s.highlight, type: ShadingType.CLEAR, color: 'auto' };
  if (s.sizePt) opts.size = Math.round(s.sizePt * 2);
  if (s.font) opts.font = { name: s.font };
  return new TextRun(opts);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function toPngDataUrl(src: string): Promise<string | null> {
  try {
    const img = await loadImage(src);
    if (!img) return null;
    const w = img.naturalWidth || 200;
    const h = img.naturalHeight || 150;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function imageRunFromElement(el: Element): Promise<ImageRun | null> {
  const src = el.getAttribute('src') || '';
  if (!src) return null;

  const styleAttr = el.getAttribute('style') || '';
  const mW = styleAttr.match(/width:\s*(\d+(?:\.\d+)?)px/);
  const mH = styleAttr.match(/height:\s*(\d+(?:\.\d+)?)px/);
  const styleW = mW ? Math.round(parseFloat(mW[1])) : 0;
  const styleH = mH ? Math.round(parseFloat(mH[1])) : 0;

  let data: string | Uint8Array;
  let type: 'jpg' | 'png' | 'gif' | 'bmp' = 'png';

  const dataMatch = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/s);
  if (dataMatch) {
    const mime = dataMatch[1].toLowerCase();
    type = mime === 'jpeg' || mime === 'jpg' ? 'jpg' : (mime as 'png' | 'gif' | 'bmp');
    data = dataMatch[2];
  } else {
    const png = await toPngDataUrl(src);
    if (!png) return null;
    const m = png.match(/^data:image\/png;base64,(.*)$/s);
    if (!m) return null;
    data = m[1];
    type = 'png';
  }

  let width = styleW;
  let height = styleH;
  if (width <= 0 || height <= 0) {
    const img = await loadImage(src);
    const nw = img?.naturalWidth || 200;
    const nh = img?.naturalHeight || 150;
    if (width <= 0 && height <= 0) {
      width = nw;
      height = nh;
    } else if (width <= 0) {
      width = Math.max(1, Math.round((nw / nh) * height));
    } else {
      height = Math.max(1, Math.round((nh / nw) * width));
    }
  }

  return new ImageRun({ data, type, transformation: { width, height } });
}

type DocxRun = TextRun | ImageRun | ExternalHyperlink;

async function inlineToDocxRuns(node: Node, style: RunStyle): Promise<DocxRun[]> {
  const runs: DocxRun[] = [];
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text) runs.push(buildTextRun(text, style));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') {
        runs.push(new TextRun({ break: 1 }));
      } else if (tag === 'img') {
        const img = await imageRunFromElement(el);
        if (img) runs.push(img);
      } else if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        const inner = await inlineToDocxRuns(el, style);
        if (inner.length && href && !href.startsWith('#') && inner.every((r) => r instanceof TextRun)) {
          runs.push(new ExternalHyperlink({ children: inner as TextRun[], link: href }));
        } else {
          runs.push(...inner);
        }
      } else if (tag === 'b' || tag === 'strong') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, bold: true })));
      } else if (tag === 'i' || tag === 'em') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, italics: true })));
      } else if (tag === 'u') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, underline: true })));
      } else if (tag === 'strike' || tag === 's' || tag === 'del') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, strike: true })));
      } else if (tag === 'sup') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, superScript: true })));
      } else if (tag === 'sub') {
        runs.push(...(await inlineToDocxRuns(el, { ...style, subScript: true })));
      } else if (tag === 'span' || tag === 'font') {
        runs.push(...(await inlineToDocxRuns(el, parseInlineCss(el, style))));
      } else {
        runs.push(...(await inlineToDocxRuns(el, style)));
      }
    }
  }
  return runs;
}

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

function cellBackground(td: Element): string | null {
  const m = (td.getAttribute('style') || '').match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
  return m ? colorToHex(m[1]) : null;
}

function cellColspan(td: Element): number {
  const n = parseInt(td.getAttribute('colspan') || '1', 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

async function tableToDocx(tableEl: Element): Promise<Table | null> {
  const rows: TableRow[] = [];
  const trs = Array.from(tableEl.querySelectorAll('tr'));
  for (const tr of trs) {
    const cells: TableCell[] = [];
    const tds = Array.from(tr.children).filter(
      (c) => c.tagName.toLowerCase() === 'td' || c.tagName.toLowerCase() === 'th',
    );
    for (const td of tds) {
      const paras: Paragraph[] = [];
      const hasBlock = Array.from(td.children).some(
        (c) => c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as Element).tagName.toLowerCase()),
      );
      if (hasBlock) {
        await blockChildrenToDocx(td, paras);
      } else {
        const runs = await inlineToDocxRuns(td, BASE_STYLE);
        paras.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')] }));
      }
      const shading = cellBackground(td);
      const span = cellColspan(td);
      cells.push(
        new TableCell({
          children: paras.length ? paras : [new Paragraph({ children: [new TextRun('')] })],
          shading: shading ? { fill: shading } : undefined,
          columnSpan: span > 1 ? span : undefined,
          verticalAlign: VerticalAlign.TOP,
        }),
      );
    }
    if (cells.length) rows.push(new TableRow({ children: cells }));
  }
  if (!rows.length) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
      insideHorizontal: CELL_BORDER,
      insideVertical: CELL_BORDER,
    },
    rows,
  });
}

async function blockToDocx(node: Node, out: (Paragraph | Table)[]): Promise<void> {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim();
    if (text) out.push(new Paragraph({ children: [new TextRun(text)] }));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const align = alignmentFromElement(el);

  if (/^h[1-6]$/.test(tag)) {
    const headings: Record<string, HeadingLevel> = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_5,
      h6: HeadingLevel.HEADING_6,
    };
    const runs = await inlineToDocxRuns(el, BASE_STYLE);
    out.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')], heading: headings[tag], alignment: align }));
  } else if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
    const runs = await inlineToDocxRuns(el, BASE_STYLE);
    out.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')], alignment: align }));
  } else if (tag === 'ul' || tag === 'ol') {
    const ordered = tag === 'ol';
    for (const li of Array.from(el.children)) {
      if (li.tagName.toLowerCase() !== 'li') continue;
      const runs = await inlineToDocxRuns(li, BASE_STYLE);
      const children = runs.length ? runs : [new TextRun('')];
      if (ordered) {
        out.push(new Paragraph({ children, numbering: { reference: 'doc-ordered-list', level: 0 } }));
      } else {
        out.push(new Paragraph({ children, bullet: { level: 0 } }));
      }
    }
  } else if (tag === 'table') {
    const tbl = await tableToDocx(el);
    if (tbl) out.push(tbl);
  } else if (tag === 'div') {
    const hasBlock = Array.from(el.childNodes).some(
      (c) => c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as Element).tagName.toLowerCase()),
    );
    if (hasBlock) {
      await blockChildrenToDocx(el, out);
    } else {
      const runs = await inlineToDocxRuns(el, BASE_STYLE);
      if (runs.length) out.push(new Paragraph({ children: runs, alignment: align }));
    }
  } else {
    await blockChildrenToDocx(el, out);
  }
}

async function blockChildrenToDocx(container: Element, out: (Paragraph | Table)[]): Promise<void> {
  for (const c of Array.from(container.childNodes)) {
    await blockToDocx(c, out);
  }
}

async function htmlToDocxBlocks(html: string): Promise<(Paragraph | Table)[]> {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const out: (Paragraph | Table)[] = [];
  for (const node of Array.from(doc.body.childNodes)) {
    await blockToDocx(node, out);
  }
  return out;
}

export async function exportWordAsDocxBlob(name: string, content: WordContent): Promise<Blob> {
  const children = await htmlToDocxBlocks(content.html || '');
  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun('')] }));
  }

  const headerChildren = content.header?.trim() ? await htmlToDocxBlocks(content.header) : null;
  const footerChildren = content.footer?.trim() ? await htmlToDocxBlocks(content.footer) : null;

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'doc-ordered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: headerChildren ? { default: new Header({ children: headerChildren }) } : undefined,
        footers: footerChildren ? { default: new Footer({ children: footerChildren }) } : undefined,
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function exportWordAsDocx(name: string, content: WordContent): Promise<void> {
  const blob = await exportWordAsDocxBlob(name, content);
  await downloadBlob(blob, safeFileName(name, 'docx'));
}

export function exportExcelAsXlsxBlob(name: string, content: ExcelContent): Blob {
  const sheets = normalizeSheets(content);
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet, idx) => {
    const aoa = sheetToDisplayGrid(sheet, true);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (sheet.merges && sheet.merges.length > 0) {
      ws['!merges'] = sheet.merges.map((m) => ({
        s: { r: m.r1, c: m.c1 },
        e: { r: m.r2, c: m.c2 },
      }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Feuille ${idx + 1}`);
  });
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportExcelAsXlsx(name: string, content: ExcelContent): void {
  const blob = exportExcelAsXlsxBlob(name, content);
  void downloadBlob(blob, safeFileName(name, 'xlsx'));
}

function stripHex(color: string): string {
  return (color || '').replace('#', '') || 'FFFFFF';
}

// Convertit le HTML riche d'un élément (issu de l'import) en runs PptxGenJS,
// en conservant gras/italique/souligné, taille, couleur, police et liens.
function htmlToRuns(html: string, defaultColor: string, defaultSizePt: number): PptxGenJS.TextProps[] {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const runs: PptxGenJS.TextProps[] = [];
  let bold = false;
  let italic = false;
  let underline = false;
  let strike = false;
  let superscript = false;
  let subscript = false;
  let color: string | null = null;
  let highlight: string | null = null;
  let fontSize: number | null = null;
  let fontFace: string | null = null;
  let link: string | null = null;
  let buffer = '';
  let pendingBullet: boolean | { code?: string; style?: string; type?: string; indent?: number } | null = null;

  const flush = () => {
    if (!buffer) return;
    const options: PptxGenJS.TextPropsOptions = {
      color: stripHex(color || defaultColor),
      fontSize: fontSize || defaultSizePt,
    };
    if (bold) options.bold = true;
    if (italic) options.italic = true;
    if (underline) options.underline = true;
    if (strike) options.strike = true;
    if (superscript) options.superscript = true;
    if (subscript) options.subscript = true;
    if (highlight) options.highlight = stripHex(highlight);
    if (fontFace) options.fontFace = fontFace;
    if (link) options.hyperlink = { url: link };
    if (pendingBullet) {
      options.bullet = pendingBullet as PptxGenJS.TextPropsOptions['bullet'];
      pendingBullet = null;
    }
    runs.push({ text: buffer, options });
    buffer = '';
  };

  const newline = () => {
    flush();
    runs.push({ text: '', options: { breakLine: true } });
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      newline();
      return;
    }
    if (tag === 'p' || tag === 'div') {
      newline();
      el.childNodes.forEach(walk);
      newline();
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const bulletCode = el.getAttribute('data-bullet') || '•';
      const numStyle = el.getAttribute('data-num') || 'arabicPeriod';
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
      items.forEach((li) => {
        if (ordered) {
          pendingBullet = { style: numStyle };
        } else if (bulletCode === '•') {
          pendingBullet = true;
        } else {
          const cp = bulletCode.codePointAt(0);
          pendingBullet = { code: cp ? cp.toString(16).toUpperCase() : '2022' };
        }
        li.childNodes.forEach(walk);
        flush();
      });
      pendingBullet = null;
      return;
    }
    if (tag === 'span' || tag === 'font') {
      const style = el.getAttribute('style') || '';
      const prevColor = color;
      const prevHighlight = highlight;
      const prevSize = fontSize;
      const prevFace = fontFace;
      const mColor = style.match(/color:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
      const mHighlight = style.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
      const mSize = style.match(/font-size:\s*([\d.]+)(pt|px)/);
      const mFace = style.match(/font-family:\s*'?([^';]+)/);
      if (mColor) color = mColor[1];
      if (mHighlight) highlight = mHighlight[1];
      if (mSize) {
        const v = parseFloat(mSize[1]);
        fontSize = mSize[2] === 'pt' ? v : Math.max(4, Math.round(v * 0.75));
      }
      if (mFace) fontFace = mFace[1].split(',')[0].trim();
      el.childNodes.forEach(walk);
      color = prevColor;
      highlight = prevHighlight;
      fontSize = prevSize;
      fontFace = prevFace;
      return;
    }
    if (tag === 'b' || tag === 'strong') {
      const prev = bold;
      bold = true;
      el.childNodes.forEach(walk);
      bold = prev;
      return;
    }
    if (tag === 'i' || tag === 'em') {
      const prev = italic;
      italic = true;
      el.childNodes.forEach(walk);
      italic = prev;
      return;
    }
    if (tag === 'u') {
      const prev = underline;
      underline = true;
      el.childNodes.forEach(walk);
      underline = prev;
      return;
    }
    if (tag === 's' || tag === 'strike' || tag === 'del') {
      const prev = strike;
      strike = true;
      el.childNodes.forEach(walk);
      strike = prev;
      return;
    }
    if (tag === 'sup') {
      const prev = superscript;
      superscript = true;
      el.childNodes.forEach(walk);
      superscript = prev;
      return;
    }
    if (tag === 'sub') {
      const prev = subscript;
      subscript = true;
      el.childNodes.forEach(walk);
      subscript = prev;
      return;
    }
    if (tag === 'a') {
      const prev = link;
      link = el.getAttribute('href') || '';
      el.childNodes.forEach(walk);
      link = prev;
      return;
    }
    el.childNodes.forEach(walk);
  };

  doc.body.childNodes.forEach(walk);
  flush();
  return runs;
}

export async function exportPowerPointAsPptxBlob(name: string, content: PowerPointContent): Promise<Blob> {
  const slides = content.slides && content.slides.length > 0 ? content.slides : [];
  const pptx = new PptxGenJS();

  // Dimensions de la présentation (en points), par défaut 16:9.
  const canvasW = slides[0]?.canvasW || 960;
  const canvasH = slides[0]?.canvasH || 540;
  const layoutW = canvasW / 72;
  const layoutH = canvasH / 72;
  pptx.defineLayout({ name: 'CUSTOM', width: layoutW, height: layoutH });
  pptx.layout = 'CUSTOM';

  slides.forEach((slide) => {
    const s = pptx.addSlide();

    // Fond : couleur ou image.
    if (slide.bgImage) {
      if (slide.bgImage.startsWith('data:')) {
        s.background = { data: slide.bgImage };
      } else {
        s.background = { path: slide.bgImage };
      }
    } else {
      s.background = { color: stripHex(slide.bg || '#ffffff') };
    }

    const isRich = Boolean(slide.rich && slide.elements && slide.elements.length > 0);

    if (isRich) {
      const dark = (slide.bg || '').toLowerCase() === '#1f2937';
      const defaultColor = dark ? '#e5e7eb' : '#1f2937';

      slide.elements!.forEach((e) => {
        const x = (e.x / 100) * layoutW;
        const y = (e.y / 100) * layoutH;
        const w = (e.w / 100) * layoutW;
        const h = (e.h / 100) * layoutH;

        if (e.type === 'image' && e.src) {
          const imgOpts: Record<string, unknown> = { x, y, w, h };
          if (e.src.startsWith('data:')) imgOpts.data = e.src;
          else imgOpts.path = e.src;
          if (e.link) imgOpts.hyperlink = { url: e.link };
          s.addImage(imgOpts as PptxGenJS.ImageProps);
        } else if (e.type === 'shape') {
          const shapeOpts: Record<string, unknown> = {
            x,
            y,
            w,
            h,
            fill: { color: stripHex(e.fill || '#ffffff') },
            line: { color: stripHex(e.fill || '#ffffff'), width: 0 },
          };
          if (e.link) shapeOpts.hyperlink = { url: e.link };
          s.addShape(pptx.ShapeType.rect, shapeOpts as PptxGenJS.ShapeProps);
        } else if (e.type === 'text' && e.html) {
          const runs = htmlToRuns(e.html, defaultColor, 18);
          if (runs.length === 0) return;
          const textOpts: Record<string, unknown> = {
            x,
            y,
            w,
            h,
            valign: e.valign || 'middle',
            align: e.align || 'left',
            margin: 0,
          };
          if (e.fill) textOpts.fill = { color: stripHex(e.fill) };
          s.addText(runs, textOpts as PptxGenJS.TextPropsOptions);
        }
      });
    } else {
      // Diapositive texte simple (créée dans l'éditeur).
      const dark = (slide.bg || '').toLowerCase() === '#1f2937';
      const textColor = dark ? 'E5E7EB' : '1F2937';
      s.addText(slide.title || '', {
        x: 0.6,
        y: 0.5,
        w: layoutW - 1.2,
        fontSize: 28,
        bold: true,
        color: textColor,
        align: slide.align || 'left',
      });
      if (slide.body) {
        s.addText(slide.body, {
          x: 0.6,
          y: 1.6,
          w: layoutW - 1.2,
          h: layoutH - 2.1,
          fontSize: 16,
          color: dark ? 'E5E7EB' : '374151',
          valign: 'top',
          align: slide.align || 'left',
        });
      }
    }
  });

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return blob;
}

export async function exportPowerPointAsPptx(name: string, content: PowerPointContent): Promise<void> {
  const blob = await exportPowerPointAsPptxBlob(name, content);
  await downloadBlob(blob, safeFileName(name, 'pptx'));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function exportHtmlAsPdf(name: string, html: string): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.padding = '32px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#1f2937';
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(safeFileName(name, 'pdf'));
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportWordAsPdf(name: string, content: WordContent): Promise<void> {
  const html = content.html || '<p></p>';
  await exportHtmlAsPdf(name, `<div style="font-size:14px;line-height:1.6;">${html}</div>`);
}

export function exportWordAsHtml(name: string, content: WordContent): void {
  const html = `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(name)}</title>\n<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:0 20px;color:#1f2937;}</style>\n</head>\n<body>\n${content.html || ''}\n</body>\n</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, safeFileName(name, 'html'));
}

export function exportWordAsTxt(name: string, content: WordContent): void {
  const div = document.createElement('div');
  div.innerHTML = content.html || '';
  const text = (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, safeFileName(name, 'txt'));
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function exportExcelAsCsv(name: string, content: ExcelContent): void {
  const sheet = normalizeSheets(content)[0];
  const grid = sheetToDisplayGrid(sheet);
  const lines: string[] = grid.map((row) => row.map(csvEscape).join(','));
  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, safeFileName(name, 'csv'));
}

export async function exportExcelAsPdf(name: string, content: ExcelContent): Promise<void> {
  const sheets = normalizeSheets(content);
  let html = '';
  sheets.forEach((sheet) => {
    html += `<h2 style="font-size:14px;margin:0 0 8px;">${escapeHtml(sheet.name || 'Feuille')}</h2>`;
    html += '<table style="border-collapse:collapse;width:100%;font-size:11px;margin-bottom:16px;">';
    const grid = sheetToDisplayGrid(sheet, true);
    grid.forEach((row) => {
      html += '<tr>';
      row.forEach((cell) => {
        html += `<td style="border:1px solid #ccc;padding:4px;">${escapeHtml(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</table>';
  });
  await exportHtmlAsPdf(name, html);
}

export async function exportPowerPointAsPdf(name: string, content: PowerPointContent): Promise<void> {
  const slides = content.slides || [];
  let html = '';
  slides.forEach((s) => {
    html += '<div style="width:100%;height:1000px;padding:24px;box-sizing:border-box;">';
    html += `<h2 style="margin:0 0 12px;font-size:22px;">${escapeHtml(s.title || '')}</h2>`;
    html += `<p style="font-size:13px;white-space:pre-wrap;">${escapeHtml(s.body || '')}</p>`;
    html += '</div>';
  });
  await exportHtmlAsPdf(name, html);
}