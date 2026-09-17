import { parseCellRef, expandRange } from './excelModel';
import type { ExcelSheet } from './documents';
import { applyNumFormat } from './excelNumberFormat';

export type CellValue = string | number | boolean | null;

// ── Tokenizer ───────────────────────────────────────────────────────────────

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string }
  | { t: 'range'; s: string; e: string }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'sep' };

function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  // En français le séparateur d'arguments est « ; » et la décimale « , ».
  // Sinon, on considère « , » comme séparateur et « . » comme décimale.
  const decimalComma = src.includes(';');
  const dec = decimalComma ? ',' : '.';
  const n = src.length;
  let i = 0;
  const isDigit = (ch: string) => ch >= '0' && ch <= '9';

  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '"') {
      let s = '';
      i += 1;
      while (i < n && src[i] !== '"') {
        s += src[i];
        i += 1;
      }
      i += 1;
      toks.push({ t: 'str', v: s });
      continue;
    }
    if (isDigit(ch) || (ch === dec && i + 1 < n && isDigit(src[i + 1]))) {
      let num = '';
      while (i < n && (isDigit(src[i]) || src[i] === dec)) {
        num += src[i];
        i += 1;
      }
      toks.push({ t: 'num', v: parseFloat(num.replace(',', '.')) });
      continue;
    }
    if (ch === ';' || ch === ',') {
      if (ch === dec) {
        i += 1;
        continue;
      }
      toks.push({ t: 'sep' });
      i += 1;
      continue;
    }
    if (/[A-Za-z$]/.test(ch)) {
      const rest = src.slice(i);
      const refMatch = /^\$?[A-Za-z]+\$?\d+/.exec(rest);
      if (refMatch) {
        const ref = refMatch[0];
        let j = i + ref.length;
        if (src[j] === ':') {
          const rest2 = src.slice(j + 1);
          const ref2 = /^\$?[A-Za-z]+\$?\d+/.exec(rest2);
          if (ref2) {
            toks.push({ t: 'range', s: ref, e: ref2[0] });
            i = j + 1 + ref2[0].length;
            continue;
          }
        }
        toks.push({ t: 'ref', v: ref });
        i = j;
        continue;
      }
      const idMatch = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9.]*/.exec(rest);
      if (idMatch) {
        toks.push({ t: 'ident', v: idMatch[0] });
        i += idMatch[0].length;
        continue;
      }
      i += 1;
      continue;
    }
    if ('+-*/^&'.includes(ch)) {
      toks.push({ t: 'op', v: ch });
      i += 1;
      continue;
    }
    if (ch === '<' || ch === '>' || ch === '=') {
      if ((ch === '<' || ch === '>') && i + 1 < n && (src[i + 1] === '=' || src[i + 1] === '>')) {
        toks.push({ t: 'op', v: ch + src[i + 1] });
        i += 2;
        continue;
      }
      toks.push({ t: 'op', v: ch });
      i += 1;
      continue;
    }
    if (ch === '(') {
      toks.push({ t: 'lp' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      toks.push({ t: 'rp' });
      i += 1;
      continue;
    }
    i += 1;
  }
  return toks;
}

// ── Parser ──────────────────────────────────────────────────────────────────

type Node =
  | { type: 'num'; v: number }
  | { type: 'str'; v: string }
  | { type: 'bool'; v: boolean }
  | { type: 'ref'; ref: string }
  | { type: 'range'; s: string; e: string }
  | { type: 'bin'; op: string; l: Node; r: Node }
  | { type: 'un'; op: string; x: Node }
  | { type: 'call'; name: string; args: Node[] };

class Parser {
  toks: Token[];
  pos = 0;

  constructor(toks: Token[]) {
    this.toks = toks;
  }

  peek(): Token | undefined {
    return this.toks[this.pos];
  }

  next(): Token {
    return this.toks[this.pos++];
  }

  parse(): Node {
    const node = this.comparison();
    if (this.pos < this.toks.length) throw new Error('Jeton inattendu');
    return node;
  }

  comparison(): Node {
    let left = this.concat();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const t = this.peek();
      if (t && t.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) {
        this.next();
        const right = this.concat();
        left = { type: 'bin', op: t.v, l: left, r: right };
      } else break;
    }
    return left;
  }

  concat(): Node {
    let left = this.additive();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const t = this.peek();
      if (t && t.t === 'op' && t.v === '&') {
        this.next();
        const right = this.additive();
        left = { type: 'bin', op: '&', l: left, r: right };
      } else break;
    }
    return left;
  }

  additive(): Node {
    let left = this.multiplicative();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const t = this.peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.next();
        const right = this.multiplicative();
        left = { type: 'bin', op: t.v, l: left, r: right };
      } else break;
    }
    return left;
  }

  multiplicative(): Node {
    let left = this.unary();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const t = this.peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
        this.next();
        const right = this.unary();
        left = { type: 'bin', op: t.v, l: left, r: right };
      } else break;
    }
    return left;
  }

  unary(): Node {
    const t = this.peek();
    if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
      this.next();
      const x = this.unary();
      return { type: 'un', op: t.v, x };
    }
    return this.power();
  }

  power(): Node {
    const base = this.primary();
    const t = this.peek();
    if (t && t.t === 'op' && t.v === '^') {
      this.next();
      const exp = this.unary();
      return { type: 'bin', op: '^', l: base, r: exp };
    }
    return base;
  }

  primary(): Node {
    const t = this.next();
    if (!t) throw new Error('Fin de formule inattendue');
    if (t.t === 'num') return { type: 'num', v: t.v };
    if (t.t === 'str') return { type: 'str', v: t.v };
    if (t.t === 'ref') return { type: 'ref', ref: t.v };
    if (t.t === 'range') return { type: 'range', s: t.s, e: t.e };
    if (t.t === 'ident') {
      const up = t.v.toUpperCase();
      if (up === 'VRAI' || up === 'TRUE') return { type: 'bool', v: true };
      if (up === 'FAUX' || up === 'FALSE') return { type: 'bool', v: false };
      const nxt = this.peek();
      if (nxt && nxt.t === 'lp') {
        this.next();
        const args: Node[] = [];
        if (this.peek() && this.peek()!.t !== 'rp') {
          args.push(this.comparison());
          while (this.peek() && this.peek()!.t === 'sep') {
            this.next();
            args.push(this.comparison());
          }
        }
        const rp = this.next();
        if (!rp || rp.t !== 'rp') throw new Error('Parenthèse fermante manquante');
        return { type: 'call', name: up, args };
      }
      throw new Error(`Nom inconnu : ${t.v}`);
    }
    if (t.t === 'lp') {
      const node = this.comparison();
      const rp = this.next();
      if (!rp || rp.t !== 'rp') throw new Error('Parenthèse fermante manquante');
      return node;
    }
    throw new Error('Jeton inattendu');
  }
}

export function parse(src: string): Node {
  const toks = tokenize(src);
  if (toks.length === 0) throw new Error('Formule vide');
  const p = new Parser(toks);
  return p.parse();
}

// ── Évaluation ──────────────────────────────────────────────────────────────

export interface EvalContext {
  resolveRef: (ref: string) => CellValue;
  resolveRange: (s: string, e: string) => CellValue[];
}

export function toNumber(v: CellValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return 0;
    const num = Number(t.replace(',', '.'));
    return Number.isFinite(num) ? num : NaN;
  }
  return 0;
}

function toBool(v: CellValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    return t === 'true' || t === 'vrai' || t === '1';
  }
  return false;
}

export function displayValue(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'VRAI' : 'FAUX';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '';
    if (!Number.isFinite(v)) return '#DIV/0!';
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10);
  }
  return v;
}

function isNumericValue(v: CellValue): boolean {
  if (typeof v === 'number') return !Number.isNaN(v);
  if (typeof v === 'string' && v.trim() !== '') return !Number.isNaN(toNumber(v));
  return false;
}

function evalBin(node: Extract<Node, { type: 'bin' }>, ctx: EvalContext): CellValue {
  const { op } = node;
  if (op === '&') {
    return displayValue(evaluate(node.l, ctx)) + displayValue(evaluate(node.r, ctx));
  }
  if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
    const l = evaluate(node.l, ctx);
    const r = evaluate(node.r, ctx);
    const bothNum = isNumericValue(l) && isNumericValue(r);
    let cmp: number;
    if (bothNum) {
      cmp = toNumber(l) - toNumber(r);
    } else {
      cmp = displayValue(l).localeCompare(displayValue(r));
    }
    switch (op) {
      case '=':
        return cmp === 0;
      case '<>':
        return cmp !== 0;
      case '<':
        return cmp < 0;
      case '>':
        return cmp > 0;
      case '<=':
        return cmp <= 0;
      case '>=':
        return cmp >= 0;
      default:
        return null;
    }
  }
  const l = toNumber(evaluate(node.l, ctx));
  const r = toNumber(evaluate(node.r, ctx));
  switch (op) {
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '*':
      return l * r;
    case '/':
      return r === 0 ? NaN : l / r;
    case '^':
      return Math.pow(l, r);
    default:
      return null;
  }
}

function evalCall(node: Extract<Node, { type: 'call' }>, ctx: EvalContext): CellValue {
  const name = node.name;

  // SI / IF : évaluation paresseuse des branches.
  if (name === 'SI' || name === 'IF') {
    if (node.args.length < 2) return '#ERROR!';
    const cond = toBool(evaluate(node.args[0], ctx));
    if (cond) return evaluate(node.args[1], ctx);
    return node.args.length >= 3 ? evaluate(node.args[2], ctx) : false;
  }

  const vals: CellValue[] = [];
  node.args.forEach((arg) => {
    if (arg.type === 'range') vals.push(...ctx.resolveRange(arg.s, arg.e));
    else vals.push(evaluate(arg, ctx));
  });

  switch (name) {
    case 'SOMME':
    case 'SUM':
      return vals.reduce((acc, v) => acc + (Number.isNaN(toNumber(v)) ? 0 : toNumber(v)), 0);
    case 'MOYENNE':
    case 'AVERAGE': {
      const nums = vals.map(toNumber).filter((x) => !Number.isNaN(x));
      if (!nums.length) return 0;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    case 'MAX': {
      const nums = vals.map(toNumber).filter((x) => !Number.isNaN(x));
      return nums.length ? Math.max(...nums) : 0;
    }
    case 'MIN': {
      const nums = vals.map(toNumber).filter((x) => !Number.isNaN(x));
      return nums.length ? Math.min(...nums) : 0;
    }
    case 'NB':
    case 'COUNT':
      return vals.filter((v) => isNumericValue(v)).length;
    case 'NBVAL':
    case 'COUNTA':
      return vals.filter((v) => v !== null && v !== undefined && v !== '').length;
    case 'CONCATENER':
    case 'CONCAT':
    case 'CONCATENATE':
      return vals.map(displayValue).join('');
    case 'ARRONDI':
    case 'ROUND': {
      const x = toNumber(vals[0] ?? 0);
      const d = Math.round(toNumber(vals[1] ?? 0));
      const f = Math.pow(10, d);
      return Math.round(x * f) / f;
    }
    case 'ABS':
      return Math.abs(toNumber(vals[0] ?? 0));
    case 'ENT':
    case 'INT':
      return Math.floor(toNumber(vals[0] ?? 0));
    case 'RACINE':
    case 'SQRT':
      return Math.sqrt(toNumber(vals[0] ?? 0));
    case 'PUISSANCE':
    case 'POWER':
      return Math.pow(toNumber(vals[0] ?? 0), toNumber(vals[1] ?? 0));
    default:
      return '#NOM?';
  }
}

export function evaluate(node: Node, ctx: EvalContext): CellValue {
  switch (node.type) {
    case 'num':
      return node.v;
    case 'str':
      return node.v;
    case 'bool':
      return node.v;
    case 'ref':
      return ctx.resolveRef(node.ref);
    case 'range':
      return ctx.resolveRange(node.s, node.e)[0] ?? null;
    case 'un': {
      const x = toNumber(evaluate(node.x, ctx));
      return node.op === '-' ? -x : x;
    }
    case 'bin':
      return evalBin(node, ctx);
    case 'call':
      return evalCall(node, ctx);
    default:
      return null;
  }
}

// ── Calcul d'une feuille complète ───────────────────────────────────────────

export function isFormula(v: string | undefined): boolean {
  return typeof v === 'string' && v.startsWith('=');
}

export function computeSheetValues(cells: Record<string, string>): Map<string, CellValue> {
  const memo = new Map<string, CellValue>();
  const inProgress = new Set<string>();

  const compute = (r: number, c: number): CellValue => {
    const key = `${r},${c}`;
    if (memo.has(key)) return memo.get(key)!;
    const raw = cells[key];
    if (raw === undefined || raw === '') {
      memo.set(key, null);
      return null;
    }
    if (!raw.startsWith('=')) {
      memo.set(key, raw);
      return raw;
    }
    if (inProgress.has(key)) {
      memo.set(key, '#REF!');
      return '#REF!';
    }
    inProgress.add(key);
    try {
      const ast = parse(raw.slice(1));
      const ctx: EvalContext = {
        resolveRef: (ref) => {
          const p = parseCellRef(ref);
          if (!p) return null;
          return compute(p.r, p.c);
        },
        resolveRange: (s, e) => expandRange(s, e).map(({ r, c }) => compute(r, c)),
      };
      memo.set(key, evaluate(ast, ctx));
    } catch {
      memo.set(key, '#ERROR!');
    }
    inProgress.delete(key);
    return memo.get(key)!;
  };

  Object.keys(cells).forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    compute(r, c);
  });

  return memo;
}

// Renvoie la valeur « affichée » d'une cellule (formule évaluée ou texte brut).
export function cellDisplay(raw: string | undefined, computed: Map<string, CellValue>, r: number, c: number): string {
  if (raw === undefined || raw === '') return '';
  if (raw.startsWith('=')) return displayValue(computed.get(`${r},${c}`) ?? null);
  return raw;
}

export function sheetToDisplayGrid(sheet: ExcelSheet, formatted = false): string[][] {
  const computed = computeSheetValues(sheet.cells);
  const grid: string[][] = [];
  for (let r = 0; r < sheet.rows; r += 1) {
    const row: string[] = [];
    for (let c = 0; c < sheet.cols; c += 1) {
      const key = `${r},${c}`;
      const disp = cellDisplay(sheet.cells[key], computed, r, c);
      row.push(formatted ? applyNumFormat(disp, sheet.formats?.[key]) : disp);
    }
    grid.push(row);
  }
  return grid;
}