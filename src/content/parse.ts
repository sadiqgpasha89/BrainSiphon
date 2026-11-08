/**
 * Parser for the BrainSiphon `.uc` authoring format.
 *
 * One file per domain, many use cases per file. Strict by design: any malformed
 * line throws with `file:line` so the content gate fails the build early.
 *
 *   == slug-tail | Title | paradigm,paradigm | latency | difficulty | a=8 k=2
 *   obj:   business objective
 *   loss:  LaTeX (optional)
 *   con:   constraint ; constraint
 *   sn:    concept | true signal | common noise | why engineers fail     (repeatable)
 *   sig:   name | formula or logic | intuition | leakage risk            (repeatable)
 *   noise: feature | why it is noise                                    (repeatable)
 *   base:  baseline model and why start there
 *   prod:  production model and serving stack
 *   pipe:  Stage label @ tech ; Stage label @ tech
 *   edge:  scenario | failure mode | mitigation                         (repeatable)
 *   off:   metric ; metric          on: metric ; metric        gap: trap ; trap
 */

export interface RawStage {
  label: string;
  tech: string;
}

export interface RawUseCase {
  file: string;
  line: number;
  key: string;
  title: string;
  paradigms: string[];
  latency: string;
  difficulty: string;
  /** a = model-touching events per active user per day, k = KB per event, s = LLM steps, t = output tokens per step */
  opts: { a: number; k: number; s?: number; t?: number };
  obj: string;
  loss?: string;
  con: string[];
  sn: string[][];
  sig: string[][];
  noise: string[][];
  base: string;
  prod: string;
  pipe: RawStage[];
  edge: string[][];
  off: string[];
  on: string[];
  gap: string[];
}

const SINGLE = new Set(['obj', 'loss', 'base', 'prod']);
const LIST = new Set(['con', 'pipe', 'off', 'on', 'gap']);
const ROWS: Record<string, number> = { sn: 4, sig: 4, noise: 2, edge: 3 };

const splitList = (v: string) =>
  v
    .split(' ; ')
    .map((s) => s.trim())
    .filter(Boolean);

export function parseUseCaseFile(file: string, text: string): RawUseCase[] {
  const out: RawUseCase[] = [];
  let cur: Partial<RawUseCase> & { line?: number } = {};
  const flush = () => {
    if (cur.key) out.push(finish(file, cur));
    cur = {};
  };

  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) return;
    const fail = (m: string): never => {
      throw new Error(`${file}:${ln}: ${m}`);
    };

    if (line.startsWith('== ')) {
      flush();
      const parts = line.slice(3).split(' | ').map((s) => s.trim());
      if (parts.length !== 6) fail(`header needs 6 fields (key | title | paradigms | latency | difficulty | opts), got ${parts.length}`);
      const [key, title, paradigms, latency, difficulty, optStr] = parts as [string, string, string, string, string, string];
      const opts: Record<string, number> = {};
      for (const kv of optStr.split(/\s+/)) {
        const [k, v] = kv.split('=');
        const n = Number(v);
        if (!k || !Number.isFinite(n)) fail(`bad option "${kv}"`);
        opts[k as string] = n;
      }
      if (opts.a === undefined || opts.k === undefined) fail('opts must include a= and k=');
      cur = {
        file,
        line: ln,
        key,
        title,
        paradigms: paradigms.split(',').map((s) => s.trim()),
        latency,
        difficulty,
        opts: opts as RawUseCase['opts'],
        con: [],
        sn: [],
        sig: [],
        noise: [],
        pipe: [],
        edge: [],
        off: [],
        on: [],
        gap: [],
      };
      return;
    }

    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!m || !cur.key) return fail(`unrecognised line: "${line.slice(0, 60)}"`);
    const [, k, v] = m as unknown as [string, string, string];
    const target = cur as Record<string, unknown>;
    if (SINGLE.has(k)) target[k] = v.trim();
    else if (LIST.has(k)) {
      if (k === 'pipe') {
        cur.pipe = splitList(v).map((s) => {
          const [label, tech] = s.split(' @ ').map((x) => x.trim());
          if (!label || !tech) fail(`pipe stage must be "Label @ tech": "${s}"`);
          return { label: label as string, tech: tech as string };
        });
      } else target[k] = splitList(v);
    } else if (k in ROWS) {
      const cols = v.split(' | ').map((s) => s.trim());
      if (cols.length !== ROWS[k]) fail(`"${k}" needs ${ROWS[k]} columns separated by " | ", got ${cols.length}`);
      (target[k] as string[][]).push(cols);
    } else fail(`unknown field "${k}"`);
  });
  flush();
  return out;
}

function finish(file: string, c: Partial<RawUseCase> & { line?: number }): RawUseCase {
  const need = ['obj', 'base', 'prod'] as const;
  for (const f of need) {
    if (!c[f]) throw new Error(`${file}:${c.line}: use case "${c.key}" missing required field "${f}"`);
  }
  return c as RawUseCase;
}
