/**
 * Generated Build Playbook.
 *
 * Use cases without a hand-written playbook get one assembled from three things that all exist in the repository:
 *   1. the blueprint's own authored fields (objective, constraints, signals, noise, baseline and production model, pipeline,
 *      edge cases, metrics, traps) - this is what makes the plan specific to the use case;
 *   2. shared domain and paradigm knowledge pools (content/domain-knowledge) and a curated, link-checked dataset registry
 *      (content/dataset-registry.json), selected by relevance to the use case;
 *   3. a tested reference starter kit for the paradigm (content/kits/<id>), run on synthetic data in CI.
 * Everything here is deterministic. The page says it is generated; the 8 pilot playbooks are authored by hand.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMAIN_META, PARADIGM_LABEL, type Compatibility, type Domain, type LatencySLA, type Paradigm, type Playbook, PlaybookSchema } from '../schemas/usecase.schema';
import { buildCompletion, milestoneDelivery, milestoneState } from './completion';
import { TOTAL_BUDGET_MS, type Stage } from './design';
import type { RawUseCase } from './parse';
import type { ScaleResult } from './scale';
import { deriveFirst30Days, deriveTests } from './playbook';
import { NO_KIT_STATEMENT, type ProblemType } from '../lib/problem-types';

export const KIT_IDS = ['tabular', 'forecast', 'anomaly', 'recommender', 'graph', 'nlp', 'cv', 'bandit', 'optimize', 'llm-rag', 'llm-agent'] as const;
export type KitId = (typeof KIT_IDS)[number];

interface Kit {
  id: KitId;
  label: string;
  summary: string;
  runtime: string;
  run: string[];
  expected: string;
  files: { path: string; purpose: string }[];
  synthetic: { file: string; description: string; knobs: string[] };
  sample: { columns: string[]; rows: (string | number | boolean | null)[][] };
  slots: { feature: string; meaning: string }[];
  gates: Record<'data' | 'features' | 'baseline' | 'challenger', { metric: string; threshold: string; how: string }>;
  tests: { test: string; tool: string; pass: string }[];
  lessons: { trap: string; evidence: string; at: string }[];
  target: string;
  headline: { baseline: string; challenger: string };
}
interface PoolConcept { name: string; explanation: string; whyItMatters: string; tags: string[] }
interface PoolTerm { term: string; definition: string; tags: string[] }
interface Pool { overview?: string; concepts: PoolConcept[]; glossary: PoolTerm[] }
interface RegistryEntry { name: string; url: string; license: string; gives: string; caveat: string; domains: string[]; paradigms: string[]; tags: string[] }

interface Data {
  kits: Map<KitId, Kit & { code: { path: string; purpose: string; language: 'python' | 'text'; code: string }[] }>;
  pools: Map<string, Pool>;
  registry: RegistryEntry[];
}
const cache = new Map<string, Data>();

function load(root: string): Data {
  const hit = cache.get(root);
  if (hit) return hit;
  const content = join(root, 'content');
  const kits: Data['kits'] = new Map();
  for (const id of KIT_IDS) {
    const dir = join(content, 'kits', id);
    if (!existsSync(join(dir, 'kit.json'))) throw new Error(`content/kits/${id}/kit.json is missing`);
    const k = JSON.parse(readFileSync(join(dir, 'kit.json'), 'utf8')) as Kit;
    const code = k.files.map((f) => {
      const p = join(dir, f.path);
      if (!existsSync(p)) throw new Error(`content/kits/${id}: file ${f.path} listed in kit.json does not exist`);
      return { path: f.path, purpose: f.purpose, language: (f.path.endsWith('.py') ? 'python' : 'text') as 'python' | 'text', code: readFileSync(p, 'utf8').trimEnd() };
    });
    kits.set(id, { ...k, code });
  }
  const pools = new Map<string, Pool>();
  const kdir = join(content, 'domain-knowledge');
  for (const f of readdirSync(kdir).filter((x) => x.endsWith('.json'))) {
    const j = JSON.parse(readFileSync(join(kdir, f), 'utf8'));
    if (f === '_paradigms.json') for (const [name, pool] of Object.entries(j)) pools.set(`paradigm:${name}`, pool as Pool);
    else pools.set(`domain:${f.replace(/\.json$/, '')}`, j as Pool);
  }
  const registry = JSON.parse(readFileSync(join(content, 'dataset-registry.json'), 'utf8')) as RegistryEntry[];
  const d = { kits, pools, registry };
  cache.set(root, d);
  return d;
}

/* ------------------------------------------------------------------ kit choice */

export function pickKit(raw: RawUseCase, paradigms: Paradigm[]): KitId {
  const text = `${raw.key} ${raw.title} ${raw.prod} ${raw.pipe.map((p) => `${p.label} ${p.tech}`).join(' ')}`.toLowerCase().replace(/-/g, ' ');
  const has = (re: RegExp) => re.test(text);
  const first = paradigms[0]!;
  if (paradigms.includes('llm-agents'))
    return has(/\bagent\b|copilot|tool use|tool-using|autonom|runbook|playbook|investigat|orchestrat|in app|planner/) ? 'llm-agent' : 'llm-rag';
  if (paradigms.includes('computer-vision')) return 'cv';
  if (paradigms.includes('reinforcement-learning'))
    return has(/rout|schedul|timetab|dispatch|assign|packing|bin pack|slotting|wave|yard|replenish|cross dock|production|nurse|allocation|consolidat|vehicle|fleet|promising|digital twin|fulfil/) ? 'optimize' : 'bandit';
  if (first === 'graph' || has(/entity resolution|identity resolution|resolution|fraud ring|cross device|link|record matching|deduplication|community/)) {
    if (paradigms.includes('graph') || has(/resolution|matching|deduplication|ring/)) return 'graph';
  }
  if (paradigms.includes('recommender')) return 'recommender';
  if (first === 'time-series')
    return has(/anomal|detect|monitor|drift|spike|alert|failure|excursion|maintenance|intrusion|ransom|vital|outage|incident/) ? 'anomaly' : 'forecast';
  if (paradigms.includes('nlp')) return 'nlp';
  return 'tabular';
}

/* ------------------------------------------------------------------ relevance scoring */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ');

function bagOf(raw: RawUseCase): { all: string; head: string } {
  const head = norm(`${raw.key} ${raw.title}`);
  const all = norm(
    [
      raw.key, raw.title, raw.obj, raw.base, raw.prod,
      ...raw.con, ...raw.sig.flat(), ...raw.noise.flat(), ...raw.sn.flat(), ...raw.edge.flat(), ...raw.off, ...raw.on, ...raw.gap,
      ...raw.pipe.flatMap((p) => [p.label, p.tech]),
    ].join(' '),
  );
  return { all: ` ${all} `, head: ` ${head} ` };
}

function score(tags: string[], bag: { all: string; head: string }): number {
  let s = 0;
  for (const t of tags) {
    const k = ` ${norm(t).trim()} `;
    if (k.trim().length < 2) continue;
    // match whole words or word beginnings so "fraud" matches "fraudulent" but "ar" does not match "carrier"
    const stem = k.trimEnd();
    if (bag.head.includes(stem)) s += 2;
    else if (bag.all.includes(stem)) s += 1;
  }
  return s;
}

function top<T extends { tags: string[] }>(items: T[], bag: { all: string; head: string }, n: number, minScore = 1): T[] {
  return items
    .map((x, i) => ({ x, s: score(x.tags, bag), i }))
    .filter((e) => e.s >= minScore)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((e) => e.x);
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unq = <T,>(xs: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(key(x).toLowerCase()) ? false : (seen.add(key(x).toLowerCase()), true)));
};

/* ------------------------------------------------------------------ sections */

const SKILLS: Record<Paradigm, string> = {
  tabular: 'Gradient boosting, calibration and evaluation of imbalanced tabular problems (scikit-learn, LightGBM or XGBoost)',
  'time-series': 'Time-ordered validation, windowed features and forecasting or anomaly metrics',
  nlp: 'Text preprocessing, embeddings, retrieval and error analysis on labelled text',
  'llm-agents': 'Prompting, tool calling and building a golden evaluation set for a language-model system',
  recommender: 'Candidate retrieval plus ranking, and implicit-feedback evaluation (NDCG, hit rate, MRR)',
  graph: 'Graph construction, entity resolution and neighbourhood or embedding features',
  'computer-vision': 'Fine-tuning vision models, annotation quality control and evaluation across sites',
  'reinforcement-learning': 'Off-policy evaluation, bandits and optimisation under uncertainty',
};

const DAYS: Record<string, string[]> = {
  foundational: ['1-2', '3-4', '3-4', '2-3', '3-4', '5-6', '3-4'],
  'production-grade': ['2-3', '3-4', '4-5', '2-3', '4-5', '6-8', '3-4'],
  'staff-principal': ['2-3', '4-6', '5-7', '3-4', '5-7', '8-10', '4-6'],
};

const range = (days: string): [number, number] => {
  const m = /^(\d+)(?:-(\d+))?$/.exec(days)!;
  return [Number(m[1]), Number(m[2] ?? m[1])];
};

/** Can this public dataset exercise the problem the use case actually has? A fraud table cannot stand in for a survival problem. */
function datasetFits(r: RegistryEntry, type: ProblemType): boolean {
  const P = new Set(r.paradigms);
  const T = new Set(r.tags);
  const any = (...k: string[]) => k.some((x) => T.has(x));
  switch (type) {
    case 'survival-time-to-event':
      return any('survival', 'churn', 'retention', 'dropout', 'prepayment', 'remaining-life', 'failure', 'early-warning', 'deterioration', 'mortality');
    case 'forecasting':
      return P.has('time-series') && any('forecast', 'demand', 'capacity', 'workload', 'traffic', 'energy', 'load', 'staffing');
    case 'time-series-anomaly-detection':
      return P.has('time-series') && any('anomaly', 'monitoring', 'streaming', 'intrusion', 'incident', 'detection');
    case 'tabular-anomaly-detection':
      return any('anomaly', 'intrusion', 'detection', 'fraud', 'malware');
    case 'binary-event-classification':
    case 'multiclass-classification':
      return P.has('tabular') || P.has('time-series') || P.has('graph');
    case 'regression-estimation':
      return P.has('tabular') && !any('fraud', 'intrusion', 'malware', 'phishing', 'click-fraud');
    case 'uplift-causal-effect':
    case 'causal-measurement':
      return any('uplift', 'attribution', 'counterfactual', 'bandit', 'off-policy', 'benchmark', 'pricing', 'churn', 'ctr');
    case 'clustering-segmentation':
      return any('segmentation', 'clustering', 'community', 'benchmark', 'customer');
    case 'next-item-recommendation':
    case 'personalised-ranking':
      return P.has('recommender');
    case 'search-ranking':
      return any('search', 'relevance', 'retrieval', 'ranking') || P.has('recommender');
    case 'entity-resolution':
      return any('entity', 'matching', 'deduplication', 'resolution', 'link', 'community') || P.has('graph');
    case 'graph-analytics':
      return P.has('graph');
    case 'vision-classification':
    case 'vision-detection-segmentation':
      return P.has('computer-vision');
    case 'text-classification':
      return P.has('nlp') && !any('speech', 'asr', 'audio', 'code', 'sql');
    case 'information-extraction':
      return any('ner', 'extraction', 'entity', 'parsing', 'ocr', 'document', 'redaction');
    case 'speech-audio':
      return any('speech', 'asr', 'audio');
    case 'grounded-qa':
    case 'grounded-generation':
      return P.has('llm-agents') || any('retrieval', 'search', 'rag', 'question', 'summarization');
    case 'agentic-read-only':
    case 'agentic-write-actions':
      return P.has('llm-agents') || any('investigation', 'soc', 'agent', 'sql');
    case 'off-policy-decisioning':
      return any('bandit', 'off-policy', 'counterfactual', 'propensity');
    case 'sequential-control-simulation':
      return any('simulation', 'scheduling', 'capacity', 'optimization', 'autoscaling', 'routing');
    case 'optimisation-allocation':
      return any('optimization', 'routing', 'scheduling', 'assignment', 'packing', 'timetabling', 'allocation');
    default:
      return any('benchmark');
  }
}

function datasetsFor(raw: RawUseCase, domain: Domain, paradigms: Paradigm[], reg: RegistryEntry[], bag: { all: string; head: string }, problemType: ProblemType) {
  const fitting = reg.filter((r) => datasetFits(r, problemType));
  const pool = fitting.length >= 1 ? fitting : reg.filter((r) => r.tags.includes('benchmark'));
  const scored = pool
    .map((r, i) => {
      const dom = r.domains.includes(domain) ? 2 : 0;
      const par = r.paradigms.filter((p) => paradigms.includes(p as Paradigm)).length;
      const tag = score(r.tags, bag);
      return { r, i, s: tag * 2 + dom + par, tag, dom, par };
    })
    // a dataset must match the topic (tag) or be domain+paradigm-specific; generic registry rows only fill in last
    .filter((e) => e.tag > 0 || (e.dom > 0 && e.par > 0))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  let picked = scored.slice(0, 3).map((e) => e.r);
  // nothing public matches this task: say so, and offer general benchmark archives rather than a dataset for another problem
  if (!picked.length) picked = reg.filter((r) => r.tags.includes('benchmark')).slice(0, 2);
  return picked.map((r) => ({ name: r.name, url: r.url, license: r.license, gives: r.gives, caveat: `${r.caveat}. Matched by domain and task type, not made for this exact use case: check the fit before committing.` }));
}

/**
 * Vocabulary of one kind of problem must not leak into a playbook about another. A shared domain pool is full of fraud terms; a
 * credit-survival playbook should not teach chargebacks and mule accounts unless its own specification mentions them.
 */
const FRAUD_VOCABULARY = /\b(fraud\w*|chargebacks?|mule\w*|card[- ]testing|account takeover|cash[- ]out|scam\w*)\b/i;
/** Problem types for which fraud and abuse vocabulary is native: detection, linking and investigation of bad actors. */
const FRAUD_NATIVE = new Set<string>(['binary-event-classification', 'tabular-anomaly-detection', 'time-series-anomaly-detection', 'graph-analytics', 'entity-resolution', 'text-classification', 'vision-classification', 'agentic-read-only', 'agentic-write-actions', 'off-policy-decisioning']);
/** Terms from a different problem's vocabulary that `text` uses and the use case's own specification (`own`) never does. */
export function foreignTerms(text: string, own: string, problemType: string): string[] {
  if (FRAUD_NATIVE.has(problemType) || FRAUD_VOCABULARY.test(own)) return [];
  const m = FRAUD_VOCABULARY.exec(text);
  return m ? [m[0]] : [];
}

function knowledgeFor(raw: RawUseCase, domain: Domain, paradigms: Paradigm[], data: Data, compat: Compatibility) {
  const bag = bagOf(raw);
  const clean = (pool: Pool): Pool => ({
    ...pool,
    concepts: pool.concepts.filter((c) => foreignTerms(`${c.name} ${c.explanation} ${c.whyItMatters} ${c.tags.join(' ')}`, bag.all, compat.problemType).length === 0),
    glossary: pool.glossary.filter((g) => foreignTerms(`${g.term} ${g.definition} ${g.tags.join(' ')}`, bag.all, compat.problemType).length === 0),
  });
  const dom = clean(data.pools.get(`domain:${domain}`)!);
  const gen = clean(data.pools.get('paradigm:general')!);
  const par = paradigms.map((p) => data.pools.get(`paradigm:${p}`)).filter((x): x is Pool => Boolean(x)).map(clean);

  // prefer concepts that match on two or more tags (or the title); fall back to single-tag matches, then to the first concepts
  const domConcepts = top(dom.concepts, bag, 3, 2);
  for (const c of top(dom.concepts, bag, 3, 1)) if (domConcepts.length < 2 && !domConcepts.includes(c)) domConcepts.push(c);
  while (domConcepts.length < 2) domConcepts.push(dom.concepts[domConcepts.length]!);
  const parConcepts = unq(par.flatMap((p) => top(p.concepts, bag, 1)).concat(par.flatMap((p) => p.concepts.slice(0, 1))), (c) => c.name).slice(0, 2);
  const h = hash(raw.key);
  const genConcept = gen.concepts[h % gen.concepts.length]!;
  const sig0 = raw.sig[0]!, sn0 = raw.sn[0]!;
  const own = [
    { name: `This use case's strongest signal: ${sig0[0]}`, explanation: `${sentence(`${cap(sig0[1]!)}`)} ${sentence(sig0[2]!)}`, whyItMatters: `Leakage risk to design against: ${sentence(sig0[3]!)}` },
    { name: `A signal-versus-noise trap in this use case: ${sn0[0]}`, explanation: `The true signal is ${sn0[1]!.charAt(0).toLowerCase()}${sn0[1]!.slice(1)}; the common noise is ${sn0[2]!.charAt(0).toLowerCase()}${sn0[2]!.slice(1)}.`, whyItMatters: sentence(sn0[3]!) },
  ];
  const concepts = unq([...domConcepts, ...parConcepts, genConcept, ...own].map(({ name, explanation, whyItMatters }) => ({ name, explanation, whyItMatters })), (c) => c.name);

  const metricBag = { all: norm([...raw.off, ...raw.on].join(' ')), head: '' };
  const strong = <T extends { tags: string[] }>(pool: T[], n: number) => {
    const hi = top(pool, bag, n, 2);
    return hi.length >= Math.min(5, n) ? hi : top(pool, bag, n, 1);
  };
  const picked = [
    ...strong(dom.glossary, 10),
    ...par.flatMap((p) => strong(p.glossary, 4)),
    ...top(gen.glossary, bag, 3),
    ...par.flatMap((p) => top(p.glossary, metricBag, 3)),
  ];
  // only when too few terms matched, pad with the generic ML-practice terms that apply to every system
  const pad = [...gen.glossary, ...par.flatMap((p) => p.glossary.slice(0, 4))];
  const terms = unq([...picked, ...pad].map(({ term, definition }) => ({ term, definition })), (t) => t.term).slice(0, Math.max(16, Math.min(22, unq(picked.map((x) => ({ k: x.term })), (x) => x.k).length)));

  const q: string[] = [];
  q.push(`What exactly does "${raw.con[0]}" mean in practice for ${raw.title.toLowerCase()}: who owns the requirement, how is it measured and what happens when it is missed?`);
  q.push(`Which systems feed "${sig0[0]}"${raw.sig[1] ? ` and "${raw.sig[1][0]}"` : ''}, how fresh is each at decision time and who owns them?`);
  q.push(`How is the outcome behind "${raw.on[0]}" measured, how long after the decision is it known, and which cases never receive a label?`);
  q.push(`Which of our data or evaluation habits could cause this: ${raw.gap[0]!.charAt(0).toLowerCase()}${raw.gap[0]!.slice(1)}, and who can confirm the cut-off times and splits?`);
  q.push(`How often does "${raw.edge[0]![0]}" happen here, and who handles it today?`);

  return {
    overview: `${(dom.overview ?? '').split(/(?<=[.!?])\s+/).filter((x) => foreignTerms(x, bag.all, compat.problemType).length === 0).join(' ')} For this use case, "${raw.title}": ${sentence(raw.obj)} The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.`.trim(),
    concepts,
    glossary: terms,
    askTheExperts: q,
  };
}

function milestonesFor(raw: RawUseCase, kit: Kit | undefined, compat: Compatibility, latency: LatencySLA, scale: ScaleResult, stages: Stage[], difficulty: string) {
  const days = DAYS[difficulty] ?? DAYS['production-grade']!;
  const total = TOTAL_BUDGET_MS[latency];
  const sig = raw.sig;
  const north = raw.on[0] ?? 'the north-star metric';
  const guard = raw.on[1] ?? 'the guardrail metric';
  const off = raw.off[0] ?? 'the primary offline metric';
  const sync = stages.filter((s) => !s.async);
  const asyncS = stages.filter((s) => s.async);
  const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));
  const slotMap = kit ? sig.slice(0, 3).map((s, i) => `"${s[0]}" ↔ ${kit.slots[i]?.feature ?? 'a feature of the same kind'}`).join('; ') : '';
  const adaptable = compat.verdict === 'adaptable';
  const gateNone = {
    data: { metric: 'Label and split checks', threshold: 'The label definition is signed off by its owner and 0 entities or time periods overlap between train and test, enforced by a test that fails on overlap', how: 'A unit test on the split code and a review of the label definition with its owner' },
    features: { metric: 'Leakage test', threshold: '0 features use information that was not available at decision time, enforced by a test that fails if one does; every feature has an owner and an as-of definition', how: 'Recompute each feature as of the decision time and compare with the stored value' },
    baseline: { metric: `Baseline on "${off}"`, threshold: `"${off}" recorded for the baseline on held-out data with a 95% interval, next to the same number for the simplest reasonable alternative`, how: 'Hold-out evaluation with a bootstrap interval, written to the experiment log' },
    challenger: { metric: `Production design against the baseline on "${off}"`, threshold: `The production design beats the baseline by more than the 95% interval on "${off}" in at least 4 of 5 seeds, and the 50 largest errors have been read by hand`, how: 'Five seeded runs compared with the baseline, then an error review with a domain expert' },
  };
  const m = [
    {
      id: 'M0', title: 'Frame the decision and the success contract', days: days[0]!,
      tasks: [
        `Write down the decision this system supports and who acts on it: ${sentence(raw.obj)}`,
        `Turn each constraint into a number with an owner: ${raw.con.join('; ')}`,
        `Fix the launch metric "${north}", the guardrail "${guard}" and the kill criteria that revert the launch`,
      ],
      deliverable: 'One-page decision spec: owner, cost of each kind of error, constraints as numbers, launch and kill criteria',
      gate: { metric: 'Decision spec', threshold: `Signed spec with a number for every constraint and for "${north}" and "${guard}" before modelling starts`, how: 'Review with the owner of the decision' },
    },
    {
      id: 'M1', title: 'Data, labels and a split that cannot leak', days: days[1]!,
      tasks: [
        `Inventory the sources behind ${sig.slice(0, 3).map((s) => `"${s[0]}"`).join(', ')}; give each an owner, a schema contract and a freshness target`,
        `Define the label exactly and measure its delay. The trap to design around first: ${sentence(raw.gap[0]!)}`,
        kit
          ? adaptable
            ? `Split the way the data will be used (by time and by entity). The reference kit's generator makes a neighbouring problem (${compat.dimensions.find((d) => d.dimension === 'data')?.provides ?? 'synthetic data'}): run it to see the mechanics, then change it as listed under "Fit with the starter kit"`
            : `Split the way the data will be used (by time and by entity), and run the reference kit's generator to see the same problem on synthetic data`
          : `Split the way the data will be used (by time and by entity). No reference kit generates this problem, so build the smallest dataset that has the real label structure (an anonymised extract, a public dataset or a hand-made synthetic set) and make every gate run on it in minutes`,
      ],
      deliverable: 'Reproducible dataset snapshot, a written label definition and a split manifest',
      gate: kit ? { ...kit.gates.data, threshold: `${adaptable ? 'After the modifications: ' : ''}${kit.gates.data.threshold}. On your data: the label definition is signed off and no entity or time overlap exists between train and test` } : gateNone.data,
    },
    {
      id: 'M2', title: 'Signals in, noise out', days: days[2]!,
      tasks: [
        `Implement the high-signal features: ${sig.slice(0, 4).map((s) => `${s[0]} (${s[1]})`).join('; ')}${sig.length > 4 ? `; plus ${sig.length - 4} more` : ''}`,
        `Leakage review for each: ${sig.slice(0, 3).map((s) => `${s[0]} - ${s[3]}`).join('; ')}`,
        `Delete the noise on purpose: ${raw.noise.map((n) => `${n[0]} (${n[1]})`).join('; ')}.${kit ? ` Map your features onto the reference kit's slots: ${slotMap}` : ''}`,
      ],
      deliverable: 'Feature spec with owners and as-of semantics, plus a test that fails if any feature sees the future',
      gate: kit ? kit.gates.features : gateNone.features,
    },
    {
      id: 'M3', title: 'Baseline first', days: days[3]!,
      tasks: [
        `Build the baseline: ${sentence(raw.base)}`,
        `Report ${raw.off.join('; ')} on held-out data, and the same numbers for the dumbest reasonable alternative`,
        'Write the baseline numbers down; every later claim is a delta against them',
      ],
      deliverable: 'Baseline model, metric report and the number to beat',
      gate: kit ? { ...kit.gates.baseline, threshold: `${kit.gates.baseline.threshold}. On your data: record "${off}" for the baseline with an interval` } : gateNone.baseline,
    },
    {
      id: 'M4', title: 'The production model, judged against the baseline', days: days[4]!,
      tasks: [
        `Build the production design: ${sentence(raw.prod)}`,
        `Compare with the baseline on ${raw.off.join('; ')}, using intervals and several seeds`,
        'Read the largest errors by hand with a domain expert and write down what they have in common',
      ],
      deliverable: 'Challenger artifact, comparison report with intervals and an error-analysis note',
      gate: kit ? kit.gates.challenger : gateNone.challenger,
    },
    latency === 'batch'
      ? {
          id: 'M5', title: 'Pipeline, schedule and recovery', days: days[5]!,
          tasks: [
            `Orchestrate the stages: ${sync.map((s) => s.label).join(' → ')}${asyncS.length ? `, with ${asyncS.map((s) => s.label).join(' and ')} outside the critical path` : ''}`,
            `Size for ${fmt(scale.eventsPerDay)} rows a day and make every run idempotent, resumable and observable`,
            'Define what happens when an upstream feed is late, partial or wrong, and rehearse it',
          ],
          deliverable: 'Scheduled pipeline, backfill procedure, runbook and a capacity test',
          gate: { metric: 'Run time and recovery', threshold: `Run finishes inside the ${scale.batchWindowHours ?? 2} hour window at 1.5 times the daily volume (${fmt(scale.eventsPerDay * 1.5)} rows), and a killed run resumes without duplicates`, how: 'Full-scale dry run with a forced failure' },
        }
      : {
          id: 'M5', title: 'Serving path and degradation ladder', days: days[5]!,
          tasks: [
            `Build the serving path: ${sync.map((s) => `${s.label} (${s.budgetMs ?? '-'} ms)`).join(' → ')}${asyncS.length ? `; off the critical path: ${asyncS.map((s) => s.label).join(', ')}` : ''}`,
            `Propagate one deadline of ${total} ms through every hop and give each dependency its own timeout and breaker`,
            'Implement the degradation ladder: staler features, a smaller model, rules, then a safe default, and log which rung served each request',
          ],
          deliverable: 'Serving service, load-test report and a runbook per ladder rung',
          gate: { metric: 'Latency and failure behaviour', threshold: `p99 at most ${total} ms at ${fmt(scale.provisionedQps)} req/s (1.5 times peak) and every injected dependency failure lands on the next ladder rung with no unhandled error`, how: 'Load test plus fault injection per dependency' },
        },
    {
      id: 'M6', title: 'Shadow, canary and the first month', days: days[6]!,
      tasks: [
        'Run in shadow for at least a week: score live traffic, take no action and compare with the baseline and with eventual outcomes',
        `Ramp 1% → 5% → 25% → 100% with automatic rollback on "${guard}", reading "${north}" against a permanent control group`,
        `Plan for the documented edge cases, starting with "${raw.edge[0]![0]}": ${raw.edge[0]![2]}`,
      ],
      deliverable: 'Launch review with measured lift, guardrail status and sign-off from product, risk and operations',
      gate: { metric: 'Guardrail and lift', threshold: `"${guard}" no worse than the baseline's at every ramp step, and "${north}" better than the control group by the target agreed in M0`, how: 'Dashboards on the decision log, read against the held-out control' },
    },
  ];
  return m.map((x) => ({ ...x, delivery: milestoneDelivery(compat, x.id), state: milestoneState(x.id) }));
}

function decisionsFor(raw: RawUseCase) {
  const off = raw.off[0] ?? 'the primary offline metric';
  return [
    {
      question: `Ship "${raw.base.replace(/\.$/, '')}" first, or go straight to the production design?`,
      options: [
        { option: raw.base.replace(/\.$/, ''), chooseWhen: 'You need a working, explainable system quickly or have few labelled examples; it also stays in the system as the fallback rung' },
        { option: raw.prod.replace(/\.$/, ''), chooseWhen: `The baseline plateaus on ${off} on held-out data and error analysis shows the remaining error is model-limited, not data- or label-limited` },
      ],
      default: 'Ship the baseline to shadow first and promote the production design only when it beats the baseline on the launch metric after variance',
    },
    {
      question: 'Which constraint should the design bind to first?',
      options: raw.con.slice(0, 3).map((c) => ({ option: c, chooseWhen: 'This is the requirement that is hardest to retrofit; design the architecture and the launch gate around it first and give the others a budget once it is met' })),
      default: `Start with "${raw.con[0]}" and prove it in the load test and the launch review before optimising anything else`,
    },
    {
      question: 'How do you find out whether it works before the full launch?',
      options: [
        { option: 'Offline evaluation on a time-based, entity-safe split', chooseWhen: 'Always as the first gate; it is cheap but biased towards the incumbent system' },
        { option: 'Shadow mode on live traffic', chooseWhen: 'The decision is consequential or the offline set cannot capture delayed or selected labels' },
        { option: 'A controlled online experiment', chooseWhen: 'You can randomise, the effect is measurable on the launch metric in the time you have, and the guardrails are automatic' },
      ],
      default: 'Offline gate, then shadow, then a canary with a permanent control group',
    },
  ];
}

function pitfallsFor(raw: RawUseCase, kit: Kit | undefined) {
  const out: { at: string; mistake: string; symptom: string; fix: string }[] = [];
  raw.gap.slice(0, 2).forEach((g, i) => {
    const lesson = kit?.lessons[i % kit.lessons.length];
    out.push({
      at: i === 0 ? 'M1' : 'M3',
      mistake: sentence(g),
      symptom: lesson ? `Offline results look better than live ones. The same mechanism on the reference kit: ${sentence(lesson.evidence)}` : 'Offline results look better than live ones, and nothing in the test suite explains why.',
      fix: kit ? `Add a test that fails when it happens, as the kit does (${kit.tests[i % kit.tests.length]!.test.toLowerCase()}), and evaluate on a split that mirrors production` : 'Add a test that fails when it happens and evaluate on a split that mirrors production',
    });
  });
  raw.noise.slice(0, 2).forEach((n) =>
    out.push({ at: 'M2', mistake: `Using "${n[0]}" as a feature`, symptom: `It is noise: ${sentence(n[1]!)}`, fix: 'Keep it out of the feature list and assert the list in a test, so it cannot return silently' }),
  );
  raw.sn.slice(0, 2).forEach((s) =>
    out.push({ at: 'M3', mistake: `${cap(s[2]!)} instead of ${s[1]!.charAt(0).toLowerCase()}${s[1]!.slice(1)}`, symptom: sentence(s[3]!), fix: `Build the evaluation and the features around: ${s[1]}` }),
  );
  raw.edge.slice(0, 2).forEach((e) =>
    out.push({ at: 'M6', mistake: `Not planning for "${e[0]}"`, symptom: sentence(e[1]!), fix: sentence(e[2]!) }),
  );
  return out.slice(0, 8);
}

/* ------------------------------------------------------------------ entry point */

export function generatePlaybook(root: string, raw: RawUseCase, domain: Domain, paradigms: Paradigm[], latency: LatencySLA, difficulty: string, scale: ScaleResult, stages: Stage[], compat: Compatibility): Playbook {
  const data = load(root);
  // a kit is shipped only when the compatibility check allows it; the generator never picks one on its own
  const kitId = compat.verdict === 'none' ? undefined : (compat.kitId as KitId | undefined);
  if (compat.verdict !== 'none' && !kitId) throw new Error(`${raw.file}:${raw.line} (${raw.key}): compatibility verdict "${compat.verdict}" names no kit`);
  const kit = kitId ? data.kits.get(kitId) : undefined;
  if (kitId && !kit) throw new Error(`${raw.file}:${raw.line} (${raw.key}): compatibility chose unknown kit "${kitId}"`);
  const adaptable = compat.verdict === 'adaptable';
  const bag = bagOf(raw);
  const milestones = milestonesFor(raw, kit, compat, latency, scale, stages, difficulty);
  const [lo, hi] = milestones.reduce<[number, number]>((a, m) => { const [l, h] = range(m.days); return [a[0] + l, a[1] + h]; }, [0, 0]);
  const off = raw.off[0] ?? 'the primary offline metric';

  const pipeTechs = unq(raw.pipe.map((p) => ({ t: p.tech })), (x) => x.t).slice(0, 3).map((x) => x.t);
  const knowledge = `shared ${DOMAIN_META[domain].short} and ${paradigms.map((p) => PARADIGM_LABEL[p]).join(' / ')} knowledge`;
  const own = `this blueprint's own signals, constraints and traps`;
  const summary = !kit
    ? `${NO_KIT_STATEMENT} A build plan for "${raw.title}", assembled from ${own} and ${knowledge}. It has milestones, exit gates, a test plan, decisions and pitfalls, but no runnable code and no synthetic data: every milestone up to M4 is guidance, and M5 and M6 need your platform. The 8 pilot playbooks are written by hand; this one is generated, so read each section against your own data and decision.`
    : adaptable
      ? `A build plan for "${raw.title}", assembled from ${own}, ${knowledge}, and the "${kit.label}" reference kit. That kit implements a neighbouring problem, not this one: it supplies reusable parts, and it becomes this system's starter only after the modifications listed under "Fit with the starter kit". ${kit.summary} The 8 pilot playbooks are written by hand; this one is generated, so read each section against your own data and decision.`
      : `A build plan for "${raw.title}", assembled from ${own}, ${knowledge}, and the "${kit.label}" reference kit, which implements the same problem, runs on synthetic data and is tested in CI. ${kit.summary} The 8 pilot playbooks are written by hand; this one is generated, so read each section against your own data and decision.`;

  const labelText = !kit
    ? `For "${raw.title}": ${sentence(raw.obj)} No reference kit models this label, so define it exactly as in M1. Design around this trap first: ${sentence(raw.gap[0]!)}`
    : adaptable
      ? `For "${raw.title}": ${sentence(raw.obj)} The reference kit's label belongs to a neighbouring problem and does not describe yours: ${sentence(kit.target)} Define your own label exactly as in M1. Design around this trap first: ${sentence(raw.gap[0]!)}`
      : `For "${raw.title}": ${sentence(raw.obj)} The reference kit's label: ${sentence(kit.target)} Design around this trap first: ${sentence(raw.gap[0]!)}`;

  const strategy = !kit
    ? `No reference kit generates this problem's data, so there is no synthetic starter set. Build the smallest dataset that has the real label structure (an anonymised extract, a public dataset from the list below or one you simulate yourself) and make every gate in M1 to M4 run on it in minutes before you scale up. The datasets below are the closest public matches by domain and task type; none was made for "${raw.title}", so check the fit and the licence first.`
    : `Start on the reference kit's synthetic data${adaptable ? ' (it is a neighbouring problem: use it to see the mechanics, then change it as listed under "Fit with the starter kit")' : ', where every trap is present and every milestone has a pass or fail answer in minutes'}. Then repeat the pipeline on a public dataset of the same kind to test your code on real sparsity, and finally on your own data. The datasets below are the closest public matches by domain and task type; none was made for "${raw.title}", so check the fit and the licence first.`;

  const tests = [
    ...(kit ? kit.tests : [
      { test: 'Split integrity: no entity or time overlap between train and test', tool: 'A unit test on the split code that fails on any shared entity or any test row earlier than a train row', pass: 'The test passes on your data and fails on a deliberately leaky split' },
      { test: 'Point-in-time features: no feature sees the future', tool: 'Recompute every feature as of its decision time and compare with the stored value', pass: 'Every feature matches; one deliberately leaked feature makes the test fail' },
      { test: 'Reproducibility: the same seed gives the same metrics', tool: 'Run the baseline twice with a fixed seed', pass: `"${off}" is identical across both runs to the printed precision` },
      { test: 'Baseline sanity: the baseline beats a constant predictor', tool: 'Compare against the simplest reasonable alternative', pass: `The baseline's "${off}" is better than the constant or naive prediction by more than its interval` },
    ]),
    { test: 'Offline metric agrees with an independent implementation', tool: 'Recompute the headline metric in a second code path (a notebook or SQL)', pass: `"${off}" matches to rounding on the held-out set` },
    { test: `Edge-case replay: ${raw.edge[0]![0]}`, tool: 'Replay a recorded or synthetic case through the full path', pass: `The system behaves as planned: ${raw.edge[0]![2]}` },
    ...deriveTests(raw, latency, scale),
  ];

  const pb = {
    provenance: 'generated' as const,
    summary,
    prerequisites: {
      skills: unq([...paradigms.map((p) => ({ s: SKILLS[p] })), { s: `The vocabulary of ${DOMAIN_META[domain].name}: section 1 lists what to learn first` }, ...(kit ? [{ s: `Reading and ${adaptable ? 'adapting' : 'extending'} the "${kit.label}" reference kit` }] : [{ s: 'Writing small, tested data and evaluation code yourself, because no starter kit does it for you' }])], (x) => x.s).map((x) => x.s),
      tools: [kit ? kit.runtime : "Python 3.11+ or your team's usual modelling stack, with a test runner", `The production stack named in the blueprint, or your platform's equivalent: ${pipeTechs.join('; ')}`],
      effort: `${lo}–${hi} engineer-days from empty repo to a shadow-ready system${kit ? '' : ' (more than with a starter kit, because the first four milestones are written from scratch)'}; platform, security review and approvals are extra lead time.`,
    },
    domainKnowledge: knowledgeFor(raw, domain, paradigms, data, compat),
    data: {
      strategy,
      datasets: datasetsFor(raw, domain, paradigms, data.registry, bag, compat.problemType),
      ...(kit ? { synthetic: kit.synthetic, sample: kit.sample } : {}),
      label: labelText,
    },
    milestones,
    ...(kit
      ? {
          starter: {
            kitId: kit.id,
            runtime: kit.runtime,
            run: kit.run,
            expected: adaptable
              ? `${kit.expected} These are the reference kit's synthetic numbers for a neighbouring problem: they show the shape of the comparison for that problem, not what you will measure on "${raw.title}".`
              : `${kit.expected} These are the reference kit's synthetic numbers: they show the shape of the comparison for this kind of problem, not what you will measure on "${raw.title}".`,
            files: kit.code.map((f) => ({ ...f, kind: 'executable-reference' as const })),
          },
        }
      : {}),
    workedExample: !kit
      ? {
          basis: 'blueprint-only' as const,
          scenario: `A walk-through of "${raw.title}" built only from the blueprint. No code was run and no numbers are shown, because no executable starter kit is compatible with this use case.`,
          steps: [
            { stage: '1. Frame the case', detail: `The objective: ${sentence(raw.obj)} The constraints that shape the design: ${raw.con.slice(0, 3).join('; ')}.` },
            { stage: '2. Choose the signals', detail: `Your strongest signal is "${raw.sig[0]![0]}" (${raw.sig[0]![1]}). ${sentence(raw.sig[0]![2]!)} Write down its as-of time before you compute it.` },
            { stage: '3. Meet the first trap', detail: `Blueprint: ${sentence(raw.gap[0]!)} Write the test that would catch it before you model anything.` },
            { stage: '4. Baseline against production', detail: `${sentence(raw.base)} against ${sentence(raw.prod)} No reference number exists for this use case: measure the gap on "${off}" yourself, with an interval.` },
            { stage: '5. An edge case from the blueprint', detail: `"${raw.edge[0]![0]}": ${sentence(raw.edge[0]![1]!)} Mitigation: ${sentence(raw.edge[0]![2]!)}` },
          ],
          outcome: `You finish with a decision spec, a split that cannot leak, a baseline and a challenger with intervals, each gated by a test you wrote. The blueprint says what to build and what to avoid for "${raw.title}"; nothing runnable stands in for the first four milestones.`,
        }
      : {
          basis: 'reference-kit' as const,
          scenario: `The "${kit.label}" reference kit run on synthetic data and read against the blueprint for "${raw.title}".${adaptable ? ' The kit implements a neighbouring problem, so read it for the mechanics and not as a model of this system.' : ''} The numbers come from the kit, not from this use case's data.`,
          steps: [
            { stage: '1. Frame the case', detail: `The objective: ${sentence(raw.obj)} The constraints that shape the design: ${raw.con.slice(0, 3).join('; ')}.` },
            { stage: '2. Choose the signals', detail: `Your strongest signal is "${raw.sig[0]![0]}" (${raw.sig[0]![1]}). On the kit it corresponds to ${kit.slots[0]!.feature}: ${kit.slots[0]!.meaning}. ${sentence(raw.sig[0]![2]!)}` },
            { stage: '3. Meet the first trap', detail: `Blueprint: ${sentence(raw.gap[0]!)} The same kind of trap on the kit: ${sentence(kit.lessons[0]!.evidence)}` },
            { stage: '4. Baseline against production', detail: `${sentence(raw.base)} against ${sentence(raw.prod)} On the kit the baseline gives ${kit.headline.baseline} and the stronger design ${kit.headline.challenger}. Expect a different gap on real data, and measure it with an interval on "${off}".` },
            { stage: '5. An edge case from the blueprint', detail: `"${raw.edge[0]![0]}": ${sentence(raw.edge[0]![1]!)} Mitigation: ${sentence(raw.edge[0]![2]!)}` },
          ],
          outcome: `The kit shows the mechanics and the traps for ${adaptable ? 'a neighbouring kind of problem' : 'this kind of problem'}; the blueprint says what to build and what to avoid for "${raw.title}". Your own data will produce lower numbers and a different first failure, which is why the gates are written as tests.`,
        },
    tests,
    decisions: decisionsFor(raw),
    pitfalls: pitfallsFor(raw, kit),
    first30Days: deriveFirst30Days(raw),
    compatibility: compat,
    completion: buildCompletion(compat, milestones),
  };
  const checked = PlaybookSchema.safeParse(pb);
  if (!checked.success) {
    const issues = checked.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${raw.file}:${raw.line} (${raw.key}): generated playbook invalid\n${issues}`);
  }
  return checked.data;
}
