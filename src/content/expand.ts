import { createHash } from 'node:crypto';
import {
  UseCaseSchema,
  type Paradigm,
  type UseCase,
  type Domain,
  type LatencySLA,
  type Difficulty,
} from '../schemas/usecase.schema';
import type { RawUseCase } from './parse';
import { bottlenecksFor, buildLLD, buildStages, hldDiagram, pipelineDiagram, resilienceFor, sequenceDiagram, snake } from './design';
import { computeScale } from './scale';
import { loadPlaybook } from './playbook';
import { generateAgentic } from './agentic-gen';
import { buildE2E, buildNarrative } from './narrative';
import { generatePlaybook, pickKit } from './playbook-gen';
import { explainLoss } from './lossvars';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VERIFIED_AT = '2026-11-07';

const DEFAULT_LOSS: Record<Paradigm, string> = {
  tabular: '\\mathcal{L}=-\\sum_i w_i\\,[\\,y_i\\log p_i+(1-y_i)\\log(1-p_i)\\,]',
  'time-series': '\\mathcal{L}=\\sum_{t}\\sum_{q}\\rho_q\\!\\left(y_t-\\hat y_t^{(q)}\\right),\\;\\rho_q(u)=\\max(qu,(q-1)u)',
  nlp: '\\mathcal{L}=-\\sum_i\\log p_\\theta(y_i\\mid x_i)',
  'llm-agents': '\\mathcal{L}_{\\text{SFT}}=-\\sum_t\\log p_\\theta(y_t\\mid y_{<t},x)',
  recommender: '\\mathcal{L}=-\\sum_{(u,i)}\\log\\frac{e^{s(u,i)/\\tau}}{\\sum_{j\\in\\mathcal N(u)}e^{s(u,j)/\\tau}}',
  graph: '\\mathcal{L}=-\\sum_{(u,v)}\\log\\sigma(z_u^\\top z_v)-\\sum_{(u,w)\\sim P_n}\\log\\sigma(-z_u^\\top z_w)',
  'computer-vision': '\\mathcal{L}=\\mathcal{L}_{\\text{focal}}+\\lambda\\,\\mathcal{L}_{\\text{IoU}}',
  'reinforcement-learning': 'J(\\pi)=\\mathbb{E}_{\\pi}\\!\\left[\\sum_{t}\\gamma^{t}r_t\\right]',
};

const REQUIRED_ENUMS = {
  latency: ['sub-10ms', 'sub-100ms', 'seconds', 'batch'],
  difficulty: ['foundational', 'production-grade', 'staff-principal'],
};

export function uuidFor(slug: string): string {
  const h = createHash('sha1').update(`brainsiphon:${slug}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

const sentence = (s: string, max = 190) => {
  const first = s.split(/(?<=[.!?])\s/)[0] ?? s;
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
};

const lossFiles = new Map<string, { lexicon: Record<string, string>; overrides: Record<string, Record<string, string>> }>();
function lossData(root: string) {
  let d = lossFiles.get(root);
  if (!d) {
    const read = (f: string) => (existsSync(join(root, 'content', f)) ? JSON.parse(readFileSync(join(root, 'content', f), 'utf8')) : {});
    d = { lexicon: read('loss-lexicon.json'), overrides: read('loss-variables.json') };
    lossFiles.set(root, d);
  }
  return d;
}

export function expand(raw: RawUseCase, domain: Domain, verifiedAt = VERIFIED_AT, root?: string): UseCase {
  const where = `${raw.file}:${raw.line} (${raw.key})`;
  if (!REQUIRED_ENUMS.latency.includes(raw.latency)) throw new Error(`${where}: bad latency "${raw.latency}"`);
  if (!REQUIRED_ENUMS.difficulty.includes(raw.difficulty)) throw new Error(`${where}: bad difficulty "${raw.difficulty}"`);
  if (!(raw.opts.a > 0) || !(raw.opts.k > 0)) throw new Error(`${where}: a= (events per active user per day) and k= (KB per event) must be > 0, otherwise every capacity and cost figure is zero or infinite`);
  if (raw.pipe.length < 4) throw new Error(`${where}: pipe needs at least 4 stages`);

  const paradigms = raw.paradigms as Paradigm[];
  const latency = raw.latency as LatencySLA;
  const difficulty = raw.difficulty as Difficulty;
  const slug = `${domain}/${raw.key}`;
  const stages = buildStages(raw.pipe, latency);
  if (stages.filter((s) => !s.async).length < 2) throw new Error(`${where}: needs at least 2 synchronous stages`);
  const scale = computeScale({ paradigms, latency, a: raw.opts.a, k: raw.opts.k, steps: raw.opts.s, tokensPerStep: raw.opts.t });
  const steps = raw.opts.s ?? 3;
  const loss = raw.loss ?? DEFAULT_LOSS[paradigms[0]!];
  const lossData_ = lossData(root ?? process.cwd());
  const explained = explainLoss(raw.key, loss, lossData_.lexicon, lossData_.overrides);
  if (explained.unresolved.length)
    throw new Error(`${where}: the loss formula uses symbols with no explanation: ${explained.unresolved.join(', ')}. Add them to content/loss-lexicon.json (shared) or content/loss-variables.json["${raw.key}"] (this use case).`);

  const features = raw.sig.map(([name]) => name as string);
  const lld = buildLLD({
    slugTail: raw.key,
    title: raw.title,
    stages,
    mode: scale.mode,
    latency,
    paradigms,
    features,
    loss,
    prod: raw.prod,
    onMetrics: raw.on,
    steps,
  });
  const seq = sequenceDiagram(stages, scale.mode, latency, paradigms, steps);

  const sync = stages.filter((s) => !s.async);
  const hld = {
    summary: `${scale.mode === 'batch' ? 'Orchestrated batch pipeline' : scale.mode === 'interactive' ? 'Streaming, budget-capped serving plane' : 'Stateless, deadline-propagating serving plane'} for ${raw.title}: ${sync.map((s) => s.label).join(' → ')}${stages.some((s) => s.async) ? `, with ${stages.filter((s) => s.async).map((s) => s.label).join(' and ')} off the critical path` : ''}. Three active-active regions, shared data/ML plane, signed model artifacts.`,
    components: [
      { name: 'Edge and API gateway', tech: 'CDN/WAF + Envoy', responsibility: 'TLS, authN, per-key rate limits, idempotency, deadline propagation, load shedding.', latencyBudgetMs: scale.mode === 'batch' ? null : 0.5 },
      ...stages.map((s) => ({ name: s.label, tech: s.tech, responsibility: stageResponsibility(s.kind, s.label), latencyBudgetMs: s.budgetMs })),
      { name: 'Event bus', tech: 'Kafka (partitioned by entity)', responsibility: 'Durable decision/outcome log; replay for backfills and training sets.', latencyBudgetMs: null },
      { name: 'Training and registry', tech: 'Spark/Ray + MLflow-style registry', responsibility: 'Point-in-time datasets, challenger training, signed artifacts, shadow/canary promotion.', latencyBudgetMs: null },
    ],
    mermaid: hldDiagram(stages, scale.mode, paradigms),
  };

  const pattern = pickKit(raw, paradigms);
  const e2e = buildE2E(raw, domain, pattern, stages, scale, features, latency, explained);
  const narrative = buildNarrative(raw, domain, paradigms, latency, stages, scale, explained);
  const playbook = root ? (loadPlaybook(root, domain, raw, latency, scale) ?? generatePlaybook(root, raw, domain, paradigms, latency, difficulty, scale, stages)) : undefined;

  const candidate = {
    id: uuidFor(slug),
    slug,
    title: raw.title,
    domain,
    mlParadigms: paradigms,
    latencySLA: latency,
    difficulty,
    pattern,
    lastVerifiedAt: verifiedAt,
    summary: sentence(raw.obj),
    ...narrative,
    signalVsNoiseMatrix: raw.sn.map(([concept, trueSignal, commonNoise, whyEngineersFail]) => ({ concept, trueSignal, commonNoise, whyEngineersFail })),
    problemFormulation: { businessObjective: raw.obj, mlObjectiveAndLoss: loss, lossVariables: explained.variables, constraints: raw.con },
    dataAndFeatures: {
      highSignalFeatures: raw.sig.map(([name, formulaOrLogic, intuition, leakageRisk]) => ({ name, formulaOrLogic, intuition, leakageRisk })),
      noisyFeaturesToDrop: raw.noise.map(([name, whyItIsNoise]) => ({ name, whyItIsNoise })),
    },
    architectureBlueprint: { baselineModel: raw.base, productionModel: raw.prod, mermaidDiagram: pipelineDiagram(stages, scale.mode) },
    evaluationAndMetrics: { offlineMetrics: raw.off, onlineBusinessMetrics: raw.on, offlineOnlineGapTraps: raw.gap },
    productionEdgeCases: raw.edge.map(([scenario, failureMode, mitigationStrategy]) => ({ scenario, failureMode, mitigationStrategy })),
    systemDesign: {
      mode: scale.mode,
      hld,
      sequence: seq,
      lld,
      e2e,
      scale: {
        assumptions: scale.assumptions,
        table: scale.rows,
        bottlenecks: bottlenecksFor(scale.computeClass, scale.mode),
        resilience: resilienceFor(scale.mode),
      },
    },
    agentic: generateAgentic(raw, domain, paradigms, latency, difficulty, stages),
    ...(playbook ? { playbook } : {}),
  };

  const parsed = UseCaseSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`${where}: schema validation failed\n${issues}`);
  }
  return parsed.data;
}

function stageResponsibility(kind: string, label = ''): string {
  if (kind === 'model' && /embed/i.test(label))
    return 'Compute or fetch versioned embeddings for the entity; precompute off the request path where possible and stamp the version into the decision.';
  switch (kind) {
    case 'ingest':
      return 'Validate, normalise and timestamp the incoming event; reject malformed input early and cheaply.';
    case 'feature':
      return 'Resolve point-in-time-correct features and context with strict sub-budget and stale-read fallback.';
    case 'retrieve':
      return 'Fetch candidates / evidence from the index with bounded fan-out and hedged requests.';
    case 'model':
      return 'Run the versioned model with dynamic batching; emit score, version and top reason codes.';
    case 'rules':
      return 'Apply business policy, constraints and thresholds from config; the only place actions are decided.';
    case 'human':
      return 'Asynchronous review queue with SLA, sampling and decisions fed back as labels.';
    case 'sink':
      return 'Durable, append-only record of inputs, decisions and outcomes for audit and retraining.';
    default:
      return 'Domain-specific processing step with its own timeout, breaker and metrics.';
  }
}


export { snake };
