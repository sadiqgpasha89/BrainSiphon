import { z } from 'zod';
import { ROLE_IDS } from '../lib/roles';

export const DOMAINS = [
  'fintech',
  'retail',
  'healthcare',
  'supply-chain',
  'adtech',
  'cybersecurity',
  'edtech',
  'saas',
  'bfsi',
  'real-estate',
] as const;
export const ML_PARADIGMS = [
  'tabular',
  'time-series',
  'nlp',
  'llm-agents',
  'recommender',
  'graph',
  'computer-vision',
  'reinforcement-learning',
] as const;
export const LATENCY_SLAS = ['sub-10ms', 'sub-100ms', 'seconds', 'batch'] as const;
export const DIFFICULTIES = ['foundational', 'production-grade', 'staff-principal'] as const;

export const PATTERN_IDS = [
  'tabular',
  'forecast',
  'anomaly',
  'recommender',
  'graph',
  'nlp',
  'cv',
  'bandit',
  'optimize',
  'llm-rag',
  'llm-agent',
] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const DomainEnum = z.enum(DOMAINS);
export const ParadigmEnum = z.enum(ML_PARADIGMS);
export const LatencyEnum = z.enum(LATENCY_SLAS);
export const DifficultyEnum = z.enum(DIFFICULTIES);

export type Domain = z.infer<typeof DomainEnum>;
export type Paradigm = z.infer<typeof ParadigmEnum>;
export type LatencySLA = z.infer<typeof LatencyEnum>;
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const DOMAIN_META: Record<Domain, { name: string; short: string; blurb: string }> = {
  fintech: {
    name: 'FinTech & Payments',
    short: 'FinTech',
    blurb:
      'Fraud, credit, AML, trading, payments and insurance — where milliseconds and basis points are money.',
  },
  retail: {
    name: 'Retail & E-Commerce',
    short: 'Retail',
    blurb: 'Search, recommendations, pricing, demand and trust & safety for marketplaces at scale.',
  },
  healthcare: {
    name: 'Healthcare & Life Sciences',
    short: 'Healthcare',
    blurb: 'Clinical risk, imaging, operations, genomics and drug discovery under regulatory constraints.',
  },
  'supply-chain': {
    name: 'Supply Chain & Logistics',
    short: 'Supply Chain',
    blurb: 'Forecasting, routing, warehouse automation, ETA and fleet intelligence across physical networks.',
  },
  adtech: {
    name: 'AdTech & Marketing',
    short: 'AdTech',
    blurb: 'Auction bidding, CTR/CVR, attribution, creative and audience modelling in sub-100ms loops.',
  },
  cybersecurity: {
    name: 'Cybersecurity',
    short: 'Cybersecurity',
    blurb:
      'Detection, triage, identity and abuse prevention — adversarial settings with brutal class imbalance.',
  },
  edtech: {
    name: 'EdTech',
    short: 'EdTech',
    blurb: 'Adaptive learning, assessment, tutoring and engagement for learners at national scale.',
  },
  saas: {
    name: 'SaaS & Developer Platforms',
    short: 'SaaS',
    blurb: 'Churn, copilots, support automation, AIOps and product intelligence for B2B/B2C platforms.',
  },
  bfsi: {
    name: 'BFSI: Banking, Financial Services & Insurance',
    short: 'BFSI',
    blurb:
      'How incumbent banks, insurers, asset managers and custodians run: lending, treasury, settlement, wealth, claims and compliance, where a regulator reads the model.',
  },
  'real-estate': {
    name: 'Real Estate & PropTech',
    short: 'Real Estate',
    blurb:
      'Valuation, listings, leasing, property operations, construction and smart buildings: slow, local, high-value assets with sparse data.',
  },
};

export const PARADIGM_LABEL: Record<Paradigm, string> = {
  tabular: 'Tabular',
  'time-series': 'Time-Series',
  nlp: 'NLP',
  'llm-agents': 'LLM / Agents',
  recommender: 'Recommender',
  graph: 'Graph',
  'computer-vision': 'Computer Vision',
  'reinforcement-learning': 'Reinforcement Learning',
};

export const LATENCY_LABEL: Record<LatencySLA, string> = {
  'sub-10ms': 'Sub-10ms Real-Time',
  'sub-100ms': 'Sub-100ms Near-Real-Time',
  seconds: 'Seconds (Interactive)',
  batch: 'Batch',
};

const nonEmpty = z.string().trim().min(2);

export const SignalNoiseRowSchema = z.object({
  concept: nonEmpty,
  trueSignal: nonEmpty,
  commonNoise: nonEmpty,
  whyEngineersFail: nonEmpty,
});

export const MermaidSchema = z
  .string()
  .trim()
  .min(20)
  .regex(
    /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram-v2)\b/,
    'Mermaid block must begin with a supported diagram keyword',
  );

export const EdgeCaseSchema = z.object({
  scenario: nonEmpty,
  failureMode: nonEmpty,
  mitigationStrategy: nonEmpty,
});

export const ComponentSchema = z.object({
  name: nonEmpty,
  tech: z.string().trim().min(2),
  responsibility: nonEmpty,
  latencyBudgetMs: z.number().nonnegative().nullable(),
});

export const DegradationSchema = z.object({
  level: z.number().int().min(0).max(5),
  trigger: nonEmpty,
  behaviour: nonEmpty,
});

export const E2EPhaseSchema = z.object({
  phase: z.number().int().min(1),
  title: nonEmpty,
  steps: z.array(nonEmpty).min(2),
  deliverable: nonEmpty,
});

export const ScaleRowSchema = z.object({
  metric: nonEmpty,
  value: z.string().trim().min(1),
  how: nonEmpty,
});

export const TopologySchema = z.object({
  /** which part of the system is active-active and which state is pinned: not every blueprint is "three active-active regions" */
  stance: z.enum(['stateless-active-active', 'residency-pinned', 'tenant-isolated']),
  summary: nonEmpty,
  inferencePlane: nonEmpty,
  statePlane: nonEmpty,
  notes: z.array(nonEmpty).min(2),
});

export const RoleLensSchema = z.object({
  role: z.enum(ROLE_IDS),
  focus: nonEmpty,
  items: z
    .array(
      z.object({
        title: nonEmpty,
        detail: nonEmpty,
        /** id of a canonical primitive at /patterns/primitives/<id> */ primitive: z.string().optional(),
      }),
    )
    .min(3),
});

/**
 * Solution archetypes: the shape of the system, which decides what its low-level design contains. A fraud decision API, a
 * nightly forecast job and a retrieval-augmented assistant do not share an endpoint, a schema or a failure model.
 */
export const ARCHETYPES = [
  'realtime-decisioning',
  'forecasting',
  'recommendation',
  'rag',
  'agentic-workflow',
  'computer-vision',
  'document-extraction',
  'batch-analytics',
  'optimisation',
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  'realtime-decisioning': 'Real-time decisioning',
  forecasting: 'Forecasting',
  recommendation: 'Recommendation and ranking',
  rag: 'Retrieval-augmented generation',
  'agentic-workflow': 'Agentic workflow',
  'computer-vision': 'Computer vision',
  'document-extraction': 'Document and language extraction',
  'batch-analytics': 'Batch analytics',
  optimisation: 'Optimisation and planning',
};

/** How far a low-level design has been reviewed. Generated LLDs are scaffolds: they show the right shape, not production code. */
export const LLD_STATUSES = ['illustrative-scaffold', 'expert-reviewed'] as const;

export const SystemDesignSchema = z.object({
  mode: z.enum(['online', 'interactive', 'batch']),
  topology: TopologySchema,
  hld: z.object({
    summary: nonEmpty,
    components: z.array(ComponentSchema).min(4),
    mermaid: MermaidSchema,
  }),
  sequence: z.object({
    mermaid: MermaidSchema,
    notes: z.array(nonEmpty).min(3),
  }),
  lld: z.object({
    archetype: z.enum(ARCHETYPES),
    status: z.enum(LLD_STATUSES),
    apiContract: z.object({
      method: z.enum(['GET', 'POST']),
      path: nonEmpty,
      request: nonEmpty,
      response: nonEmpty,
    }),
    dataModelDDL: nonEmpty,
    /** the message contract for events this component emits or consumes (JSON schema or Avro-style) */
    eventSchema: nonEmpty,
    classDiagram: MermaidSchema,
    algorithm: z.object({ language: z.enum(['python', 'typescript']), code: nonEmpty }),
    config: nonEmpty,
    degradationLadder: z.array(DegradationSchema).min(3),
    /** what fails, how it is retried and what the caller sees: specific to the archetype */
    failureAndRetry: z.array(z.object({ failure: nonEmpty, behaviour: nonEmpty })).min(4),
    securityModel: z.array(z.object({ surface: nonEmpty, control: nonEmpty })).min(4),
    testScenarios: z
      .array(
        z.object({
          scenario: nonEmpty,
          kind: z.enum(['unit', 'integration', 'contract', 'load', 'replay', 'safety']),
          assertion: nonEmpty,
        }),
      )
      .min(5),
  }),
  e2e: z.array(E2EPhaseSchema).min(8),
  scale: z.object({
    /** the traffic profile behind the table, so the page can re-run the model with what-if sliders */
    inputs: z.object({
      a: z.number().positive(),
      k: z.number().positive(),
      steps: z.number().positive().optional(),
      tokensPerStep: z.number().positive().optional(),
      /** what one model-touching event is in business terms (names the cost-per-outcome row) */
      outcomeUnit: nonEmpty.optional(),
      /** model-touching events per day when the use case states its own volume (e.g. "5M series nightly"), instead of users x DAU x a */
      eventsPerDay: z.number().positive().optional(),
      driver: nonEmpty.optional(),
      /** share of events a person reviews or annotates, when the blueprint has a human stage */
      reviewRate: z.number().min(0).max(1).optional(),
    }),
    assumptions: z.array(nonEmpty).min(3),
    table: z.array(ScaleRowSchema).min(8),
    bottlenecks: z.array(nonEmpty).min(3),
    resilience: z.array(nonEmpty).min(4),
  }),
});

const Cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Build Playbook: what an intermediate engineer needs to go from this blueprint to a shipped system —
 * where the data comes from, the ordered milestones with numeric exit gates, a starter kit that runs
 * on synthetic data, a worked example, an executable test plan, decisions and pitfalls.
 */
export const PlaybookSchema = z.object({
  /** `authored`: written by hand with its own starter kit. `generated`: assembled from the blueprint's own fields, shared domain and paradigm knowledge, and a reference starter kit. */
  provenance: z.enum(['authored', 'generated']),
  summary: nonEmpty,
  prerequisites: z.object({
    skills: z.array(nonEmpty).min(3),
    tools: z.array(nonEmpty).min(2),
    effort: nonEmpty,
  }),
  domainKnowledge: z.object({
    overview: nonEmpty,
    concepts: z.array(z.object({ name: nonEmpty, explanation: nonEmpty, whyItMatters: nonEmpty })).min(4),
    glossary: z.array(z.object({ term: nonEmpty, definition: nonEmpty })).min(12),
    askTheExperts: z.array(nonEmpty).min(3),
  }),
  data: z.object({
    strategy: nonEmpty,
    datasets: z
      .array(
        z.object({
          name: nonEmpty,
          url: z.string().url(),
          license: nonEmpty,
          gives: nonEmpty,
          caveat: nonEmpty,
        }),
      )
      .min(1),
    synthetic: z.object({ file: nonEmpty, description: nonEmpty, knobs: z.array(nonEmpty).min(2) }),
    sample: z.object({
      columns: z.array(nonEmpty).min(3),
      rows: z.array(z.array(Cell)).min(3),
    }),
    label: nonEmpty,
  }),
  milestones: z
    .array(
      z.object({
        id: z.string().regex(/^M\d$/),
        title: nonEmpty,
        days: nonEmpty,
        tasks: z.array(nonEmpty).min(2),
        deliverable: nonEmpty,
        gate: z.object({ metric: nonEmpty, threshold: nonEmpty, how: nonEmpty }),
      }),
    )
    .min(6),
  starter: z.object({
    /** reference kit id (content/kits/<id>) when the starter is shared across use cases */
    kitId: z.string().optional(),
    runtime: nonEmpty,
    run: z.array(nonEmpty).min(2),
    expected: nonEmpty,
    files: z
      .array(
        z.object({
          path: nonEmpty,
          purpose: nonEmpty,
          language: z.enum(['python', 'yaml', 'text']),
          code: nonEmpty,
        }),
      )
      .min(3),
  }),
  workedExample: z.object({
    scenario: nonEmpty,
    steps: z.array(z.object({ stage: nonEmpty, detail: nonEmpty })).min(4),
    outcome: nonEmpty,
  }),
  tests: z.array(z.object({ test: nonEmpty, tool: nonEmpty, pass: nonEmpty })).min(6),
  decisions: z
    .array(
      z.object({
        question: nonEmpty,
        options: z.array(z.object({ option: nonEmpty, chooseWhen: nonEmpty })).min(2),
        default: nonEmpty,
      }),
    )
    .min(2),
  pitfalls: z
    .array(z.object({ at: z.string().regex(/^M\d$/), mistake: nonEmpty, symptom: nonEmpty, fix: nonEmpty }))
    .min(4),
  first30Days: z.array(nonEmpty).min(4),
});
export type Playbook = z.infer<typeof PlaybookSchema>;

/**
 * Agentic solutioning: where agents belong in this use case, which agents, with which typed tools and permissions, how autonomy is
 * earned, what stops them going wrong and how they are evaluated. Generated from the blueprint's own stages, constraints, edge cases
 * and metrics plus a role pattern per kind of system.
 */
export const AGENT_FITS = ['core', 'strong', 'supporting', 'not-recommended', 'not-applicable'] as const;
export const AGENT_ALTERNATIVES = [
  'rules-engine',
  'conventional-ml',
  'optimiser',
  'llm-rag',
  'deterministic-workflow',
  'human-in-the-loop',
  'agentic-workflow',
] as const;
export type AgentAlternative = (typeof AGENT_ALTERNATIVES)[number];

/**
 * The question every blueprint must answer before it designs an agent: why is an agent better than a rules engine, a
 * conventional model, an optimiser or a deterministic workflow for this problem? The verdict on each option is explicit, and the
 * agent is allowed to lose.
 */
export const AgentDecisionSchema = z.object({
  question: nonEmpty,
  options: z
    .array(
      z.object({
        approach: z.enum(AGENT_ALTERNATIVES),
        startWhen: nonEmpty,
        verdict: z.enum(['chosen', 'complement', 'fallback', 'rejected']),
        reason: nonEmpty,
      }),
    )
    .min(6),
  /** what would have to be measured to justify adding agents, and what it costs and risks */
  measurableValue: nonEmpty,
  incrementalCost: nonEmpty,
  operationalRisk: nonEmpty,
  fallbackArchitecture: nonEmpty,
  revisitWhen: z.array(nonEmpty).min(3),
});
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export const isAgentic = (fit: (typeof AGENT_FITS)[number]) =>
  fit !== 'not-recommended' && fit !== 'not-applicable';

export const AgenticSchema = z
  .object({
    fit: z.enum(AGENT_FITS),
    role: nonEmpty,
    rationale: nonEmpty,
    pattern: nonEmpty,
    decision: AgentDecisionSchema,
    /** empty when agents are not recommended or not applicable */
    agents: z.array(
      z.object({
        name: nonEmpty,
        responsibility: nonEmpty,
        trigger: nonEmpty,
        tools: z.array(nonEmpty).min(2),
        autonomy: z.enum(['L0', 'L1', 'L2', 'L3']),
        handoff: nonEmpty,
      }),
    ),
    tools: z.array(
      z.object({
        name: nonEmpty,
        access: z.enum(['read', 'write']),
        backedBy: nonEmpty,
        permission: nonEmpty,
      }),
    ),
    autonomy: z.array(
      z.object({
        level: z.enum(['L0', 'L1', 'L2', 'L3']),
        name: nonEmpty,
        behaviour: nonEmpty,
        gate: nonEmpty,
      }),
    ),
    /** the agent architecture, or the recommended non-agentic architecture when agents are not recommended */
    architecture: MermaidSchema,
    sequence: MermaidSchema,
    context: z.array(z.object({ kind: nonEmpty, detail: nonEmpty })),
    guardrails: z.array(z.object({ risk: nonEmpty, control: nonEmpty })),
    evaluation: z.array(z.object({ what: nonEmpty, metric: nonEmpty, target: nonEmpty, how: nonEmpty })),
    failureModes: z.array(z.object({ scenario: nonEmpty, response: nonEmpty })),
    budget: z.array(z.object({ item: nonEmpty, value: nonEmpty })),
    buildSteps: z.array(z.object({ step: nonEmpty, deliverable: nonEmpty })),
    whenNotToUse: z.array(nonEmpty).min(3),
  })
  .superRefine((a, ctx) => {
    const need = (ok: boolean, path: string, msg: string) =>
      ok || ctx.addIssue({ code: 'custom', path: [path], message: msg });
    if (isAgentic(a.fit)) {
      need(a.agents.length >= 3, 'agents', 'an agentic fit needs at least three agents');
      need(a.tools.length >= 4, 'tools', 'an agentic fit needs at least four typed tools');
      need(a.autonomy.length === 4, 'autonomy', 'an agentic fit needs the four-level autonomy ladder');
      need(a.context.length >= 3, 'context', 'an agentic fit needs at least three context entries');
      need(a.guardrails.length >= 5, 'guardrails', 'an agentic fit needs at least five guardrails');
      need(a.evaluation.length >= 5, 'evaluation', 'an agentic fit needs at least five evaluation rows');
      need(a.failureModes.length >= 4, 'failureModes', 'an agentic fit needs at least four failure modes');
      need(a.budget.length >= 4, 'budget', 'an agentic fit needs at least four budget rows');
      need(a.buildSteps.length >= 6, 'buildSteps', 'an agentic fit needs at least six build steps');
      need(
        a.decision.options.some((o) => o.approach === 'agentic-workflow' && o.verdict !== 'rejected'),
        'decision',
        'an agentic fit must not reject the agentic option',
      );
    } else {
      need(
        a.agents.length === 0 && a.tools.length === 0,
        'agents',
        'a non-agentic verdict must not define agents or tools',
      );
      need(
        a.decision.options.some((o) => o.approach === 'agentic-workflow' && o.verdict === 'rejected'),
        'decision',
        'a non-agentic verdict must reject the agentic option explicitly',
      );
      need(
        a.decision.options.some((o) => o.verdict === 'chosen'),
        'decision',
        'a non-agentic verdict must name the chosen architecture',
      );
    }
  });
export type Agentic = z.infer<typeof AgenticSchema>;

export const ProblemStatementSchema = z.object({
  situation: nonEmpty,
  whyHard: nonEmpty,
  scaleAndStakes: nonEmpty,
  successLooksLike: nonEmpty,
  risks: z.array(nonEmpty).min(2),
});
export const SolutionApproachSchema = z.object({
  thesis: nonEmpty,
  moves: z.array(z.object({ move: nonEmpty, detail: nonEmpty })).min(4),
  deliberatelyNot: z.array(nonEmpty).min(2),
  proof: nonEmpty,
});
export const ArchitectureRationaleSchema = z
  .array(
    z.object({
      stage: nonEmpty,
      tech: nonEmpty,
      role: nonEmpty,
      /** the constraint, signal, edge case or trap of this use case that lands on this stage */
      carries: nonEmpty,
      budget: nonEmpty,
      onFailure: nonEmpty,
    }),
  )
  .min(4);

/* ------------------------------------------------------------------ enterprise layer (Blueprint 2.0) */

export const RISK_TIERS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

const list = (min = 2) => z.array(nonEmpty).min(min);

export const EXPERIMENT_DESIGNS = [
  'randomised-ab-test',
  'interleaving-then-ab',
  'switchback',
  'geo-holdout',
  'shadow-then-holdout',
  'rolling-origin-backtest',
  'offline-replay-then-canary',
] as const;

/**
 * Statistical validation and business experimentation: how to show, with the right design and enough power, that the system
 * improves a business outcome, not just a model metric.
 */
export const ExperimentationSchema = z.object({
  question: nonEmpty,
  estimand: nonEmpty,
  design: z.object({
    type: z.enum(EXPERIMENT_DESIGNS),
    unit: nonEmpty,
    why: nonEmpty,
    interference: nonEmpty,
  }),
  metrics: z.object({ primary: nonEmpty, guardrails: list(3), offlineOnlineGap: nonEmpty }),
  power: z.object({
    alpha: z.number().gt(0).lt(0.5),
    power: z.number().gt(0.5).lt(1),
    mde: nonEmpty,
    sampleSizeRule: nonEmpty,
    duration: nonEmpty,
  }),
  labels: z.object({ maturity: nonEmpty, quality: nonEmpty, selectionBias: nonEmpty }),
  sampling: nonEmpty,
  dataQuality: list(3),
  uncertainty: nonEmpty,
  slices: list(3),
  causal: z.object({ method: nonEmpty, when: nonEmpty }),
  counterfactual: nonEmpty,
  calibration: nonEmpty,
  stopping: list(4),
  businessValue: z.array(z.object({ metric: nonEmpty, how: nonEmpty })).min(3),
  pitfalls: list(4),
});
export type Experimentation = z.infer<typeof ExperimentationSchema>;

/**
 * Metrics catalogue: what to measure for this system, by layer. The first ten layers apply to every system; RAG, LLM, agent and
 * human-review layers appear only when the system has that component, otherwise `notApplicable` says why.
 */
export const METRIC_LAYER_IDS = [
  'business',
  'adoption',
  'model',
  'data',
  'system',
  'cost',
  'responsible',
  'security',
  'mlops',
  'experiment',
  'rag',
  'llm',
  'agent',
  'hitl',
] as const;
export type MetricLayerId = (typeof METRIC_LAYER_IDS)[number];
export const OPTIONAL_METRIC_LAYERS = ['rag', 'llm', 'agent', 'hitl'] as const;

export const MetricRowSchema = z.object({
  metric: nonEmpty,
  /** outcome = the result itself; leading = predicts it; guardrail = must not get worse; diagnostic = explains a move */
  kind: z.enum(['outcome', 'leading', 'guardrail', 'diagnostic']),
  definition: nonEmpty,
  target: nonEmpty,
  cadence: nonEmpty,
  owner: nonEmpty,
  onBreach: nonEmpty,
});
export type MetricRow = z.infer<typeof MetricRowSchema>;

export const MetricLayerSchema = z.object({
  id: z.enum(METRIC_LAYER_IDS),
  title: nonEmpty,
  why: nonEmpty,
  rows: z.array(MetricRowSchema).min(3),
});
export type MetricLayer = z.infer<typeof MetricLayerSchema>;

export const MetricsSchema = z.object({
  basis: nonEmpty,
  tree: MermaidSchema,
  layers: z.array(MetricLayerSchema).min(10),
  notApplicable: z.array(z.object({ layer: z.enum(OPTIONAL_METRIC_LAYERS), reason: nonEmpty })),
  failureMonitors: z
    .array(z.object({ scenario: nonEmpty, signal: nonEmpty, threshold: nonEmpty, response: nonEmpty }))
    .min(2),
  gaming: z.array(z.object({ metric: nonEmpty, risk: nonEmpty, counter: nonEmpty })).min(3),
});
export type Metrics = z.infer<typeof MetricsSchema>;

/**
 * Enterprise solution context: where this AI system sits in the business, the application landscape, the data estate, the
 * technology stack, the security architecture and the operating model. Written before the AI/ML blueprint, because an
 * architect needs the decision owner, the systems of record and the failure scenarios before choosing a model.
 */
export const EnterpriseContextSchema = z.object({
  business: z.object({
    capability: nonEmpty,
    processes: list(),
    stakeholders: z.array(z.object({ who: nonEmpty, needs: nonEmpty })).min(3),
    currentState: nonEmpty,
    futureState: nonEmpty,
    decisionOwner: nonEmpty,
    kpis: list(),
  }),
  application: z.object({
    systemsOfRecord: list(),
    upstream: list(),
    downstream: list(),
    integration: z
      .array(z.object({ boundary: nonEmpty, style: nonEmpty, contract: nonEmpty, onFailure: nonEmpty }))
      .min(4),
    coexistence: nonEmpty,
  }),
  data: z.object({
    sources: z
      .array(
        z.object({
          source: nonEmpty,
          owner: nonEmpty,
          systemOfRecord: nonEmpty,
          ingestion: nonEmpty,
          quality: nonEmpty,
        }),
      )
      .min(3),
    contractExample: nonEmpty,
    qualitySla: z.array(z.object({ dimension: nonEmpty, target: nonEmpty, check: nonEmpty })).min(5),
    lineage: nonEmpty,
    onSchemaChange: nonEmpty,
    corrections: nonEmpty,
    privacyDeletion: nonEmpty,
  }),
  technology: z.object({
    hosting: nonEmpty,
    compute: nonEmpty,
    dataPlatform: nonEmpty,
    aiPlatform: nonEmpty,
    deployment: nonEmpty,
    dr: z.object({ rto: nonEmpty, rpo: nonEmpty, strategy: nonEmpty }),
  }),
  security: z.object({
    identity: nonEmpty,
    classification: nonEmpty,
    encryption: nonEmpty,
    trustBoundaries: list(3),
    privacy: nonEmpty,
  }),
  operating: z.object({
    serviceOwner: nonEmpty,
    supportModel: nonEmpty,
    lifecycleOwners: z.array(z.object({ asset: nonEmpty, owner: nonEmpty })).min(4),
  }),
  c4Context: MermaidSchema,
  c4Container: MermaidSchema,
  nfr: z.array(z.object({ attribute: nonEmpty, requirement: nonEmpty, measuredBy: nonEmpty })).min(7),
  adrs: z
    .array(
      z.object({
        id: z.string().regex(/^ADR-\d{3}$/),
        title: nonEmpty,
        status: z.enum(['accepted', 'proposed']),
        context: nonEmpty,
        decision: nonEmpty,
        alternatives: list(),
        consequences: nonEmpty,
      }),
    )
    .min(3),
  buildBuy: z.object({
    question: nonEmpty,
    options: z.array(z.object({ option: nonEmpty, chooseWhen: nonEmpty, risk: nonEmpty })).min(3),
    recommendation: nonEmpty,
  }),
});
export type EnterpriseContext = z.infer<typeof EnterpriseContextSchema>;

/** The AI Architect's decision record: why AI, why this paradigm, what else was considered and what would change the answer. */
export const DecisionMatrixSchema = z.object({
  whyAI: nonEmpty,
  whyNotRules: nonEmpty,
  whyThisParadigm: nonEmpty,
  alternatives: z
    .array(
      z.object({
        option: nonEmpty,
        verdict: z.enum(['chosen', 'rejected', 'fallback', 'later']),
        reason: nonEmpty,
      }),
    )
    .min(4),
  whyChosen: nonEmpty,
  changeTriggers: list(3),
  topology: nonEmpty,
  sourcing: nonEmpty,
  humanOversight: z.object({
    mode: z.enum(['human-in-the-loop', 'human-on-the-loop', 'autonomous-with-audit']),
    detail: nonEmpty,
  }),
  economics: nonEmpty,
});
export type DecisionMatrix = z.infer<typeof DecisionMatrixSchema>;

const Control = z.object({ area: nonEmpty, control: nonEmpty, evidence: nonEmpty });
export const GovernanceSchema = z.object({
  riskTier: z.enum(RISK_TIERS),
  rationale: nonEmpty,
  treatment: nonEmpty,
  approvalPath: list(2),
  data: z.array(Control).min(3),
  model: z.array(Control).min(4),
  responsibleAI: z.array(Control).min(4),
  aiSecurity: z.array(z.object({ threat: nonEmpty, control: nonEmpty })).min(5),
  regulatory: z
    .array(
      z.object({
        obligation: nonEmpty,
        architecturalControl: nonEmpty,
        evidence: nonEmpty,
        owner: nonEmpty,
        cadence: nonEmpty,
      }),
    )
    .min(3),
});
export type Governance = z.infer<typeof GovernanceSchema>;

export const OperationsSchema = z.object({
  slos: z.array(z.object({ sli: nonEmpty, slo: nonEmpty, window: nonEmpty, errorBudget: nonEmpty })).min(5),
  telemetry: z.array(z.object({ layer: nonEmpty, signals: nonEmpty })).min(4),
  severities: z.array(z.object({ sev: nonEmpty, definition: nonEmpty, response: nonEmpty })).min(3),
  support: z.array(z.object({ level: nonEmpty, owns: nonEmpty })).length(3),
  release: z.object({ deploy: nonEmpty, rollback: nonEmpty }),
  capacity: nonEmpty,
  scenarios: z
    .array(
      z.object({
        failure: nonEmpty,
        detection: nonEmpty,
        alert: nonEmpty,
        owner: nonEmpty,
        mitigation: nonEmpty,
        recovery: nonEmpty,
        learning: nonEmpty,
      }),
    )
    .min(8),
  unitCost: z.array(z.object({ unit: nonEmpty, value: nonEmpty, how: nonEmpty })).min(3),
});
export type Operations = z.infer<typeof OperationsSchema>;

export const MlopsSchema = z.object({
  lifecycle: z
    .array(
      z.object({
        area: nonEmpty,
        practice: nonEmpty,
        artifact: nonEmpty,
        gate: nonEmpty,
      }),
    )
    .length(9),
  retraining: z.object({
    triggers: list(3),
    dataMaturity: nonEmpty,
    championChallenger: nonEmpty,
  }),
  rollback: list(3),
  toolchain: z.array(z.object({ concern: nonEmpty, options: nonEmpty })).min(5),
  /** LLMOps additions: only for systems whose behaviour depends on prompts, retrieval indexes or provider models */
  llmops: z.array(z.object({ area: nonEmpty, practice: nonEmpty })).optional(),
});
export type Mlops = z.infer<typeof MlopsSchema>;

export const VALIDATION_LEVELS = [
  'schema-validated',
  'technically-validated',
  'synthetic-data-tested',
  'domain-expert-reviewed',
  'production-evidence',
] as const;
export type ValidationLevel = (typeof VALIDATION_LEVELS)[number];

export const SECTION_ORIGINS = ['hand-authored', 'generated-from-spec', 'generated-from-template'] as const;
export const NUMBER_NATURES = [
  'illustrative',
  'modelled',
  'synthetic',
  'proposed-target',
  'pilot-measured',
  'production-measured',
] as const;

/**
 * Where a blueprint's content came from and what kind of evidence stands behind each number, recorded in the data rather than
 * implied by a badge. A generated page and a reviewed one must look different, and a modelled figure must never read as a measurement.
 */
export const ProvenanceSchema = z.object({
  /** the highest validation level reached; a generated blueprint is never above `technically-validated` on its own */
  status: z.enum(VALIDATION_LEVELS),
  owner: nonEmpty,
  reviewer: nonEmpty.nullable(),
  reviewedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  /** the date the content was last generated from the specification; not a review date */
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sections: z.array(z.object({ section: nonEmpty, origin: z.enum(SECTION_ORIGINS), basis: nonEmpty })).min(8),
  numbers: z.array(z.object({ item: nonEmpty, nature: z.enum(NUMBER_NATURES), note: nonEmpty })).min(6),
  sources: z
    .array(
      z.object({
        kind: z.enum(['specification', 'reference-kit', 'public-standard', 'review']),
        ref: nonEmpty,
      }),
    )
    .min(2),
  assumptions: z.array(nonEmpty).min(3),
  limitations: z.array(nonEmpty).min(3),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ValidationSchema = z.object({
  provenance: ProvenanceSchema,
  levels: z
    .array(
      z.object({
        level: z.enum(VALIDATION_LEVELS),
        state: z.enum(['passed', 'not-yet']),
        evidence: nonEmpty,
      }),
    )
    .length(VALIDATION_LEVELS.length),
  feasibility: z
    .array(
      z.object({
        check: nonEmpty,
        status: z.enum(['pass', 'warn', 'fail', 'n/a']),
        detail: nonEmpty,
      }),
    )
    .min(6),
});
export type Validation = z.infer<typeof ValidationSchema>;

export const WORKLOAD_PROFILES = ['transaction', 'session', 'asset', 'media', 'llm', 'batch'] as const;
export type WorkloadProfile = (typeof WORKLOAD_PROFILES)[number];

export const UseCaseSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().regex(new RegExp(`^(${DOMAINS.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`)),
    title: nonEmpty,
    domain: DomainEnum,
    mlParadigms: z.array(ParadigmEnum).min(1),
    latencySLA: LatencyEnum,
    difficulty: DifficultyEnum,
    /** which of the 11 reference patterns this system is an instance of (the same list as the starter kits) */
    pattern: z.enum(PATTERN_IDS),
    lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: nonEmpty,
    /** whether the problem statement, solution approach, architecture rationale and end-to-end breakdown were written by hand or assembled from this entry's fields */
    narrativeProvenance: z.enum(['authored', 'generated']),
    problemStatement: ProblemStatementSchema,
    solutionApproach: SolutionApproachSchema,
    architectureRationale: ArchitectureRationaleSchema,
    signalVsNoiseMatrix: z.array(SignalNoiseRowSchema).min(2),
    problemFormulation: z.object({
      businessObjective: nonEmpty,
      mlObjectiveAndLoss: nonEmpty,
      /** every symbol in the formula, in order of first appearance, with what it stands for in this use case */
      lossVariables: z.array(z.object({ symbol: z.string().trim().min(1), meaning: nonEmpty })).min(2),
      constraints: z.array(nonEmpty).min(2),
    }),
    dataAndFeatures: z.object({
      highSignalFeatures: z
        .array(
          z.object({
            name: nonEmpty,
            formulaOrLogic: nonEmpty,
            intuition: nonEmpty,
            leakageRisk: nonEmpty,
          }),
        )
        .min(3),
      noisyFeaturesToDrop: z.array(z.object({ name: nonEmpty, whyItIsNoise: nonEmpty })).min(2),
    }),
    architectureBlueprint: z.object({
      baselineModel: nonEmpty,
      productionModel: nonEmpty,
      mermaidDiagram: MermaidSchema,
    }),
    evaluationAndMetrics: z.object({
      offlineMetrics: z.array(nonEmpty).min(2),
      onlineBusinessMetrics: z.array(nonEmpty).min(2),
      offlineOnlineGapTraps: z.array(nonEmpty).min(1),
    }),
    productionEdgeCases: z.array(EdgeCaseSchema).min(2),
    systemDesign: SystemDesignSchema,
    /** what each of the seven personas must additionally check, specialised to this use case */
    roleLenses: z.array(RoleLensSchema).length(ROLE_IDS.length),
    /** canonical mechanisms this system leans on, explained once at /patterns/primitives/<id> */
    primitives: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1),
    agentic: AgenticSchema,
    enterpriseContext: EnterpriseContextSchema,
    decisionMatrix: DecisionMatrixSchema,
    governance: GovernanceSchema,
    experimentation: ExperimentationSchema,
    metrics: MetricsSchema,
    mlops: MlopsSchema,
    operations: OperationsSchema,
    validation: ValidationSchema,
    playbook: PlaybookSchema.optional(),
  })
  .strict();

export type UseCase = z.infer<typeof UseCaseSchema>;
export type SystemDesign = z.infer<typeof SystemDesignSchema>;

/** Slim projection used for catalog grids, search indexes and sitemaps. */
export interface UseCaseIndexEntry {
  id: string;
  slug: string;
  title: string;
  domain: Domain;
  mlParadigms: Paradigm[];
  latencySLA: LatencySLA;
  difficulty: Difficulty;
  summary: string;
  signalCount: number;
  noiseCount: number;
  lastVerifiedAt: string;
  keywords: string;
  pattern: PatternId;
  /** canonical primitives this blueprint leans on (ids under /patterns/primitives/) */
  primitives?: string[];
  /** the sub-area of the domain this use case belongs to, and its position in the domain's authored order */
  trackId?: string;
  trackName?: string;
  /** how the Build Playbook was made: written by hand with its own kit, or generated from the blueprint and a reference kit */
  playbook?: 'authored' | 'generated';
}

/** URL query validation shared by /api/search and the catalog. */
export const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .regex(/^[\p{L}\p{N}\s\-_.,:/&+#'()%$]*$/u, 'Unsupported characters in query')
    .optional()
    .default(''),
  domain: DomainEnum.optional(),
  paradigm: ParadigmEnum.optional(),
  latency: LatencyEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  cursor: z.coerce.number().int().min(0).max(100000).optional().default(0),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
