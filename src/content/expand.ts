import { createHash } from 'node:crypto';
import {
  LATENCY_LABEL,
  UseCaseSchema,
  type Paradigm,
  type UseCase,
  type Domain,
  type LatencySLA,
  type Difficulty,
} from '../schemas/usecase.schema';
import type { RawUseCase } from './parse';
import { bottlenecksFor, buildLLD, buildStages, hldDiagram, pipelineDiagram, resilienceFor, sequenceDiagram, snake, TOTAL_BUDGET_MS } from './design';
import { computeScale, usd } from './scale';
import { loadPlaybook } from './playbook';
import { generatePlaybook } from './playbook-gen';
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

  const e2e = buildE2E(raw, stages, scale, loss, features, latency, paradigms);
  const playbook = root ? (loadPlaybook(root, domain, raw, latency, scale) ?? generatePlaybook(root, raw, domain, paradigms, latency, difficulty, scale, stages)) : undefined;

  const candidate = {
    id: uuidFor(slug),
    slug,
    title: raw.title,
    domain,
    mlParadigms: paradigms,
    latencySLA: latency,
    difficulty,
    lastVerifiedAt: verifiedAt,
    summary: sentence(raw.obj),
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

function buildE2E(raw: RawUseCase, stages: ReturnType<typeof buildStages>, scale: ReturnType<typeof computeScale>, loss: string, features: string[], latency: LatencySLA, paradigms: Paradigm[]) {
  const sync = stages.filter((s) => !s.async);
  const top3 = raw.sig.slice(0, 3);
  const budget = TOTAL_BUDGET_MS[latency];
  const monthly = usd(scale.monthlyTotalUSD);
  const per1k = usd(scale.costPer1kUSD);
  const reco = paradigms.includes('recommender');
  const llm = paradigms.includes('llm-agents');
  const fmtN = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));
  const rampMetric = raw.on[0] ?? 'north-star metric';
  const guard = raw.on[1] ?? 'guardrail metric';

  return [
    {
      phase: 1,
      title: 'Frame the decision and the success contract',
      steps: [
        `Business objective: ${raw.obj}`,
        `Name the actor and the action space — who or what consumes the output, what each wrong answer costs, and the envelope: ${LATENCY_LABEL[latency]}; ${raw.con.slice(0, 2).join('; ')}.`,
        `Write the launch contract before modelling: north-star "${rampMetric}", guardrail "${guard}", and the kill criteria that auto-revert the launch.`,
      ],
      deliverable: 'One-page decision spec: owner, cost matrix, SLA, launch and kill criteria.',
    },
    {
      phase: 2,
      title: 'Data contracts, labels and point-in-time truth',
      steps: [
        `Inventory the sources that feed ${top3.map((s) => `“${s[0]}”`).join(', ')}; each gets an owner, schema contract and freshness SLO.`,
        `Define the label exactly and measure its delay. The first trap to design around: ${raw.gap[0] ?? 'delayed and biased labels'}.`,
        'Build training sets with as-of joins only (features strictly before decision time); store the feature snapshot used at decision time for later audit.',
        'Minimise PII at the edge (tokenise or hash identifiers), set retention (400 days), and document lawful basis for each field.',
      ],
      deliverable: 'Versioned, reproducible dataset snapshot with automated data-quality tests.',
    },
    {
      phase: 3,
      title: 'Engineer signal, delete noise',
      steps: [
        ...top3.map((s) => `${s[0]} — ${s[1]} (${s[2]})`),
        `Leakage review for each feature before it ships; highest-risk here: ${top3[0]?.[3] ?? 'target leakage via post-event fields'}.`,
        `Delete on purpose: ${raw.noise.map((n) => n[0]).join(', ')}. Fewer, stronger features also shrink the feature-store bill.`,
        `Register the ${features.length} feature definitions once; the same transform code runs in training and serving to eliminate skew.`,
      ],
      deliverable: 'Feature spec with owners, as-of semantics, backfill job and a skew test in CI.',
    },
    {
      phase: 4,
      title: 'Baseline first, then the production model',
      steps: [
        `Baseline: ${raw.base}`,
        `Production: ${raw.prod}`,
        'Optimise the objective written in Problem formulation — pick the loss that matches the decision cost, then calibrate so scores are usable as probabilities or costs.',
        'Ship the baseline to shadow first; a complex model must beat it on the launch metric after variance, not on a leaderboard.',
      ],
      deliverable: 'Champion and challenger artifacts in the registry with model cards and reproducible training runs.',
    },
    {
      phase: 5,
      title: 'Offline evaluation that predicts online reality',
      steps: [
        `Primary offline metrics: ${raw.off.join('; ')}.`,
        `Split by time (train → validate → test in chronological order), never random, so the model is judged on the future it will face.`,
        `Known offline/online gaps to neutralise: ${raw.gap.join('; ')}.`,
        'Slice results by cohort, geography, device, tenant and cold-start status; a model that wins on average and loses a protected or high-value slice does not ship.',
      ],
      deliverable: 'Evaluation report with confidence intervals, slice analysis and calibration plots.',
    },
    {
      phase: 6,
      title: 'Serving architecture and latency budget',
      steps: [
        ...sync.slice(0, 5).map((s) => `${s.id} ${s.label} on ${s.tech} — ${budget === null ? 'inside the run window' : `${s.budgetMs} ms of ${budget} ms`}.`),
        ...(stages.some((s) => s.async) ? [`Off the critical path: ${stages.filter((s) => s.async).map((s) => `${s.label} (${s.tech})`).join('; ')}.`] : []),
        'Define the degradation ladder and per-dependency breakers up front (see LLD); prove each rung in a game-day, not in an incident.',
      ],
      deliverable: 'Service design doc, load-test results at 1.5× provisioned peak, and runbooks per rung.',
    },
    {
      phase: 7,
      title: 'Shadow, canary, ramp',
      steps: [
        'Shadow for 7 days: score live traffic with the challenger, log side by side, compare distributions and disagreement cases.',
        `Canary 1% → 5% → 25% → 100% with automatic rollback on guardrail "${guard}"; north-star "${rampMetric}" is read against a persistent holdout.`,
        reco ? 'Use interleaving for fast ranking comparisons, then confirm with a full A/B on long-term retention.' : llm ? 'Gate every prompt/model/tool change on a frozen golden evaluation set plus an online A/B with cost guardrails.' : 'Hold back a small control cohort permanently so true incremental lift stays measurable after launch.',
        'Keep a one-command kill switch that returns to the previous champion or to rules.',
      ],
      deliverable: 'Launch review with measured lift, guardrail status and sign-off from product, risk and SRE.',
    },
    {
      phase: 8,
      title: 'Monitoring, drift and the failure catalogue',
      steps: [
        ...raw.edge.slice(0, 3).map((e) => `${e[0]} → watch for ${e[1].toLowerCase()}; response: ${e[2]}`),
        'Track input drift (PSI/KS per feature), prediction drift, and performance on matured labels — with label-delay-aware estimates so alerts are not an artefact of lag.',
        'Page on SLO burn rate and cost per 1,000 decisions, not on raw error counts.',
      ],
      deliverable: 'Dashboards, alerts, on-call runbook and a quarterly game-day plan.',
    },
    {
      phase: 9,
      title: 'Scale to 10 million users',
      steps: [
        `Load: ${fmtN(scale.eventsPerDay)} model-touching events/day → ${fmtN(scale.avgQps)} req/s average, ${fmtN(scale.peakQps)} req/s peak, ${fmtN(scale.provisionedQps)} req/s provisioned.`,
        `Compute: ${scale.nodes.toLocaleString('en-US')} ${scale.nodeUnit} (${scale.nodeCapacity}).`,
        `Data plane: ${scale.kafkaPartitions} Kafka partitions at ${scale.peakMBps.toFixed(1)} MB/s peak, ${scale.redisShards} feature-store shards, ${scale.rawGBPerDay.toFixed(1)} GB/day raw growth.`,
        `First bottleneck to attack: ${bottlenecksFor(scale.computeClass, scale.mode)[0]}`,
      ],
      deliverable: 'Capacity plan with load-test evidence, autoscaling policy and regional failover drill.',
    },
    {
      phase: 10,
      title: 'Run it: cost, ROI and the iteration loop',
      steps: [
        `Estimated run cost ${monthly}/month → ${per1k} per 1,000 decisions. The system pays for itself while (value per correct decision × lift) exceeds that unit cost.`,
        `Retrain on a ${scale.mode === 'batch' ? 'per-window' : scale.mode === 'interactive' ? 'eval-gated release' : 'weekly champion/challenger'} cadence; automate promotion only when every guardrail is green.`,
        'Own the whole loop: a named team owns data, model, serving and the business metric; postmortems feed new edge cases into the evaluation set.',
        'Next upgrade trigger: invest in a bigger model only when error analysis shows the residual is model-limited rather than data- or label-limited.',
      ],
      deliverable: 'Quarterly business review: lift, cost per decision, incidents, and the next experiment backlog.',
    },
  ];
}

export { snake };
