/** The seven reader personas. Client-safe (plain data): used by the reader shell, the section wrapper and the generator. */
export const ROLE_IDS = [
  'ai-architect',
  'solution-architect',
  'data-engineer',
  'data-scientist',
  'ai-engineer',
  'inference-engineer',
  'mlops-engineer',
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const ROLE_META: Record<RoleId, { label: string; key: string; focus: string }> = {
  'ai-architect': {
    label: 'AI Architect',
    key: '1',
    focus: 'Model topology, cascades, rollout governance and the feedback loop.',
  },
  'solution-architect': {
    label: 'Solution Architect',
    key: '2',
    focus: 'Integration boundaries, regions and state, auditability, cost.',
  },
  'data-engineer': {
    label: 'Data Engineer',
    key: '3',
    focus: 'Pipelines, point-in-time correctness, backfills, schemas.',
  },
  'data-scientist': {
    label: 'Data Scientist',
    key: '4',
    focus: 'Signal, leakage, loss, calibration, counterfactuals and slices.',
  },
  'ai-engineer': {
    label: 'AI Engineer',
    key: '5',
    focus: 'Hot-path code, contracts, tools, retrieval and eval harnesses.',
  },
  'inference-engineer': {
    label: 'Inference Engineer',
    key: '6',
    focus: 'Runtimes, batching, memory bandwidth, deadlines and load shedding.',
  },
  'mlops-engineer': {
    label: 'MLOps Engineer',
    key: '7',
    focus: 'Registry, CI/CD/CT, release gates, drift monitoring, retraining, rollback and release evidence.',
  },
};

/** What each role owns, in one line: shown on the home page and in the markdown export. */
export const ROLE_OWNS: Record<RoleId, string> = {
  'ai-architect': 'Decides the AI/ML solution topology and model strategy',
  'solution-architect': 'Integrates the solution into the enterprise',
  'data-engineer': 'Builds and maintains data pipelines and data products',
  'data-scientist': 'Develops and validates analytical and ML models',
  'ai-engineer': 'Builds AI applications, RAG, tools and agent workflows',
  'inference-engineer': 'Optimises model execution, runtimes and serving performance',
  'mlops-engineer': 'Industrialises model development, deployment and ongoing operations',
};

/** Every section id the reader renders, in page order (the playbook is only present when the use case has one). Kept beside the role map so a test can check the two agree. */
export const SECTION_IDS = [
  'enterprise',
  'signal-noise',
  'problem',
  'features',
  'blueprint',
  'hld',
  'sequence',
  'lld',
  'e2e',
  'scale',
  'evaluation',
  'edge-cases',
  'role-lenses',
  'governance',
  'experimentation',
  'mlops',
  'operations',
  'agentic',
  'playbook',
  'validation',
] as const;

/** Which blueprint sections each role should read first. Every section outside the list is hidden while that lens is on. */
export const ROLE_SECTIONS: Record<RoleId, string[]> = {
  'ai-architect': [
    'problem',
    'enterprise',
    'blueprint',
    'hld',
    'sequence',
    'e2e',
    'evaluation',
    'edge-cases',
    'agentic',
    'governance',
    'experimentation',
    'role-lenses',
    'validation',
  ],
  'solution-architect': [
    'problem',
    'enterprise',
    'hld',
    'sequence',
    'lld',
    'scale',
    'edge-cases',
    'governance',
    'operations',
    'role-lenses',
    'validation',
  ],
  'data-engineer': [
    'enterprise',
    'features',
    'blueprint',
    'lld',
    'scale',
    'edge-cases',
    'role-lenses',
    'playbook',
  ],
  'data-scientist': [
    'signal-noise',
    'problem',
    'features',
    'blueprint',
    'evaluation',
    'edge-cases',
    'experimentation',
    'governance',
    'role-lenses',
  ],
  'ai-engineer': [
    'sequence',
    'lld',
    'evaluation',
    'edge-cases',
    'agentic',
    'mlops',
    'role-lenses',
    'playbook',
  ],
  'inference-engineer': ['hld', 'sequence', 'lld', 'scale', 'role-lenses'],
  'mlops-engineer': [
    'hld',
    'lld',
    'scale',
    'evaluation',
    'edge-cases',
    'experimentation',
    'mlops',
    'operations',
    'governance',
    'role-lenses',
    'playbook',
    'validation',
  ],
};

export const rolesForSection = (id: string): RoleId[] =>
  ROLE_IDS.filter((r) => ROLE_SECTIONS[r].includes(id));
export const isRoleId = (v: unknown): v is RoleId =>
  typeof v === 'string' && (ROLE_IDS as readonly string[]).includes(v);
