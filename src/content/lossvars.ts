/**
 * Explains every symbol in a use case's loss / objective formula.
 *
 * The formula (LaTeX) is scanned into "units" (a variable with its subscripts, a named term like \mathrm{Calibration},
 * a Greek letter, an operator). Each unit's meaning comes from, in order:
 *   1. content/loss-variables.json   per-use-case overrides (symbols whose meaning depends on the use case)
 *   2. content/loss-lexicon.json     shared meanings for standard symbols and named penalty terms
 * A unit with no meaning is a build error, so a formula can never ship with an unexplained symbol.
 */

export interface LossVariable {
  symbol: string;
  meaning: string;
}

type Lexicon = Record<string, string>;

const TEXTLIKE = new Set(['mathcal', 'mathrm', 'mathbb', 'text', 'operatorname', 'textit', 'mathbf', 'mathsf', 'bm']);
const ACCENT = new Set(['hat', 'widehat', 'tilde', 'bar', 'widetilde', 'overline']);
/** layout and pure operators that need no explanation of their own */
const SKIP = new Set(['left', 'right', 'quad', 'qquad', 'cdot', 'le', 'ge', 'leq', 'geq', 'in', 'notin', 'sim', 'propto', 'ldots', 'dots', 'times', 'to', 'approx', 'neq', 'big', 'Big', 'bigg', 'limits']);
const INDEX_WORDS: Record<string, string> = {
  i: 'example i',
  t: 'time step or token t',
  k: 'class or label k',
  c: 'channel or segment c',
  j: 'candidate or other item j',
  u: 'user u',
  a: 'action or arm a',
  r: 'request r',
  q: 'quantile level q',
  h: 'forecast step h',
  m: 'item m',
  n: 'example n',
};

function group(s: string, i: number): [string, number] {
  // s[i] is '{': return the balanced content and the index after the closing brace
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

function scripts(s: string, i: number): [string, number] {
  let out = '';
  for (;;) {
    while (s[i] === ' ') i++;
    if (s[i] !== '_' && s[i] !== '^') return [out, i];
    const op = s[i]!;
    i++;
    if (s[i] === '{') {
      const [g, j] = group(s, i);
      out += `${op}{${g}}`;
      i = j;
    } else if (s[i] === '\\') {
      const m = /^\\[a-zA-Z]+/.exec(s.slice(i));
      out += op + (m ? m[0] : s[i]);
      i += m ? m[0].length : 1;
    } else {
      out += op + (s[i] ?? '');
      i++;
    }
  }
}

/** `\text{...}` that is a remark, connector or constraint rather than a named quantity, e.g. "s.t. spend" or "(T-learner)" */
const isRemark = (t: string) => /^\s*(\(|s\.t\.|subject to|with |and\b|rank by|policy:|via )/i.test(t) || t.trim().split(/\s+/).length >= 5 || /(\s|:)$/.test(t) || /^\s/.test(t);

export interface Unit {
  /** lookup key, without sub/superscripts, e.g. `y`, `\lambda`, `\mathrm{BCE}`, `\hat{y}` */
  key: string;
  /** the first occurrence as written, with its sub/superscripts */
  display: string;
  subs: string;
}

export function units(latex: string): Unit[] {
  const out = new Map<string, Unit>();
  const add = (key: string, display: string, subs: string) => {
    if (!out.has(key)) out.set(key, { key, display, subs });
  };
  let i = 0;
  const s = latex;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === '\\') {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (!m) {
        // \| \, \; \! \{ \}
        if (s[i + 1] === '|') add('\\|', '\\|x\\|', '');
        i += 2;
        continue;
      }
      const cmd = m[1]!;
      i += m[0].length;
      if (SKIP.has(cmd)) continue;
      if (TEXTLIKE.has(cmd)) {
        while (s[i] === ' ') i++;
        if (s[i] === '{') {
          const [g, j] = group(s, i);
          const [sc, k] = scripts(s, j);
          const key = `\\${cmd}{${g}}`;
          // a labelled sub-loss such as \mathcal{L}_{\text{det}} is its own quantity, not the total loss
          const sub = key === '\\mathcal{L}' && sc.includes('\\text');
          if (!(cmd === 'text' && isRemark(g))) add(sub ? key + sc : key, key + sc, sc);
          i = k;
        }
        continue;
      }
      if (ACCENT.has(cmd)) {
        while (s[i] === ' ') i++;
        let inner = '';
        if (s[i] === '{') {
          const [g, j] = group(s, i);
          inner = g;
          i = j;
        } else {
          const mm = /^(\\[a-zA-Z]+|[A-Za-z])/.exec(s.slice(i));
          inner = mm ? mm[0] : '';
          i += mm ? mm[0].length : 0;
        }
        const [sc, k] = scripts(s, i);
        const innerKey = inner.replace(/^\\text\{(.*)\}$/, '$1');
        add(`\\${cmd}{${innerKey}}`, `\\${cmd}{${inner}}${sc}`, sc);
        i = k;
        continue;
      }
      const [sc, k] = scripts(s, i);
      add(`\\${cmd}`, cmd === 'frac' ? '\\frac{a}{b}' : `\\${cmd}${sc}`, sc);
      i = k;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const [sc, k] = scripts(s, i + 1);
      // `y_{<t}` (everything before t) and `p_\theta` (the language model) are their own symbols
      const own = sc.includes('<') || (ch === 'p' && sc === '_\\theta');
      add(own ? ch + sc : ch, ch + sc, sc);
      i = k;
      continue;
    }
    i++;
  }
  return [...out.values()];
}

/** words for single-letter subscripts that mean the same thing everywhere */
const NO_INDEX_NOTE = new Set(['\\sum', '\\prod', '\\int', '\\max', '\\min', '\\log', '\\exp', '\\mid', '\\frac', 'e']);
function indexNote(key: string, subs: string): string {
  if (NO_INDEX_NOTE.has(key) || key.startsWith('\\mathrm') || key.startsWith('\\text') || key.startsWith('\\mathcal')) return '';
  const letters = [...subs.replace(/[_^{}]/g, '')].filter((c) => INDEX_WORDS[c]);
  const uniq = [...new Set(letters)].slice(0, 2);
  return uniq.length ? ` (one value per ${uniq.map((c) => INDEX_WORDS[c]).join(' and ')})` : '';
}

export function explainLoss(
  slug: string,
  latex: string,
  lexicon: Lexicon,
  overrides: Record<string, Lexicon>,
): { variables: LossVariable[]; unresolved: string[] } {
  const own = overrides[slug] ?? {};
  const variables: LossVariable[] = [];
  const unresolved: string[] = [];
  for (const u of units(latex)) {
    const meaning = own[u.display] ?? own[u.key] ?? lexicon[u.display] ?? lexicon[u.key];
    if (!meaning) {
      unresolved.push(u.key === u.display ? u.key : `${u.key}   (as written: ${u.display})`);
      continue;
    }
    variables.push({ symbol: u.display, meaning: meaning.includes('(one value per') || own[u.key] || own[u.display] ? meaning : meaning + indexNote(u.key, u.subs) });
  }
  return { variables, unresolved };
}
