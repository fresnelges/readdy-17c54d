export type DiffType = 'equal' | 'add' | 'remove';

export interface DiffToken {
  value: string;
  type: DiffType;
}

/** Découpe un texte en « mots » (séquences sans espaces) et en espaces/sauts. */
function tokenize(text: string): string[] {
  return text.match(/[^\s]+|\s+/g) || [];
}

/** Matrice de la plus longue sous-séquence commune (LCS). */
function buildLcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/** Diff mot à mot entre deux textes (retourne des ajouts / suppressions / passages identiques). */
export function diffWords(oldText: string, newText: string): DiffToken[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const dp = buildLcs(a, b);
  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ value: a[i], type: 'equal' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ value: a[i], type: 'remove' });
      i += 1;
    } else {
      out.push({ value: b[j], type: 'add' });
      j += 1;
    }
  }
  while (i < a.length) {
    out.push({ value: a[i], type: 'remove' });
    i += 1;
  }
  while (j < b.length) {
    out.push({ value: b[j], type: 'add' });
    j += 1;
  }
  return out;
}

/** Convertit du HTML en texte brut en conservant les sauts de ligne (pour le diff). */
export function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  div.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,tr').forEach((b) => b.append('\n'));
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n');
}

/** Compte les mots ajoutés et supprimés d'un diff. */
export function diffStats(tokens: DiffToken[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  tokens.forEach((t) => {
    if (!t.value.trim()) return;
    if (t.type === 'add') added += 1;
    else if (t.type === 'remove') removed += 1;
  });
  return { added, removed };
}