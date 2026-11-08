/**
 * Deterministic feature-hashing text embedding (384-d, L2-normalised).
 * It gives real lexical-semantic overlap behaviour with zero external dependencies, and is the single
 * swap-in point for a learned encoder (e.g. a 384-d MiniLM served behind an internal endpoint).
 * Document and query vectors MUST come from the same function.
 */
export const EMBED_DIM = 384;

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'for',
  'on',
  'with',
  'by',
  'at',
  'is',
  'are',
  'be',
  'as',
  'from',
]);

function fnv1a(str: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function embed(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  const toks = tokenize(text);
  const add = (feat: string, w: number) => {
    const h = fnv1a(feat);
    const sign = fnv1a(feat, 0x9747b28c) & 1 ? 1 : -1;
    v[h % EMBED_DIM]! += sign * w;
  };
  toks.forEach((t, i) => {
    add(t, 1);
    if (i + 1 < toks.length) add(`${t}_${toks[i + 1]}`, 0.6);
    for (let n = 3; n <= 4 && t.length >= n; n++)
      for (let j = 0; j + n <= t.length; j++) add(`#${t.slice(j, j + n)}`, 0.15);
  });
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export const toPgVector = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;
