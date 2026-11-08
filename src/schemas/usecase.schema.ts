import { z } from 'zod';

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

export const SystemDesignSchema = z.object({
  mode: z.enum(['online', 'interactive', 'batch']),
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
    apiContract: z.object({
      method: z.enum(['GET', 'POST']),
      path: nonEmpty,
      request: nonEmpty,
      response: nonEmpty,
    }),
    dataModelDDL: nonEmpty,
    classDiagram: MermaidSchema,
    algorithm: z.object({ language: z.enum(['python', 'typescript']), code: nonEmpty }),
    config: nonEmpty,
    degradationLadder: z.array(DegradationSchema).min(3),
  }),
  e2e: z.array(E2EPhaseSchema).min(8),
  scale: z.object({
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
export const AgenticSchema = z.object({
  fit: z.enum(['core', 'strong', 'supporting']),
  role: nonEmpty,
  rationale: nonEmpty,
  pattern: nonEmpty,
  agents: z
    .array(
      z.object({
        name: nonEmpty,
        responsibility: nonEmpty,
        trigger: nonEmpty,
        tools: z.array(nonEmpty).min(2),
        autonomy: z.enum(['L0', 'L1', 'L2', 'L3']),
        handoff: nonEmpty,
      }),
    )
    .min(3),
  tools: z
    .array(
      z.object({
        name: nonEmpty,
        access: z.enum(['read', 'write']),
        backedBy: nonEmpty,
        permission: nonEmpty,
      }),
    )
    .min(4),
  autonomy: z
    .array(
      z.object({
        level: z.enum(['L0', 'L1', 'L2', 'L3']),
        name: nonEmpty,
        behaviour: nonEmpty,
        gate: nonEmpty,
      }),
    )
    .length(4),
  architecture: MermaidSchema,
  sequence: MermaidSchema,
  context: z.array(z.object({ kind: nonEmpty, detail: nonEmpty })).min(3),
  guardrails: z.array(z.object({ risk: nonEmpty, control: nonEmpty })).min(5),
  evaluation: z.array(z.object({ what: nonEmpty, metric: nonEmpty, target: nonEmpty, how: nonEmpty })).min(5),
  failureModes: z.array(z.object({ scenario: nonEmpty, response: nonEmpty })).min(4),
  budget: z.array(z.object({ item: nonEmpty, value: nonEmpty })).min(4),
  buildSteps: z.array(z.object({ step: nonEmpty, deliverable: nonEmpty })).min(6),
  whenNotToUse: z.array(nonEmpty).min(3),
});
export type Agentic = z.infer<typeof AgenticSchema>;

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
    agentic: AgenticSchema,
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
