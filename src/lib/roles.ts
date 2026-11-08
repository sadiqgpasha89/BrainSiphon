/** The six reader personas. Client-safe (plain data): used by the reader shell, the section wrapper and the generator. */
export const ROLE_IDS = [
  'ai-architect',
  'solution-architect',
  'data-engineer',
  'data-scientist',
  'ai-engineer',
  'inference-engineer',
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
};

/** Which blueprint sections each role should read first. Every section outside the list is hidden while that lens is on. */
export const ROLE_SECTIONS: Record<RoleId, string[]> = {
  'ai-architect': [
    'problem',
    'blueprint',
    'hld',
    'sequence',
    'e2e',
    'evaluation',
    'edge-cases',
    'agentic',
    'role-lenses',
  ],
  'solution-architect': ['problem', 'hld', 'sequence', 'lld', 'scale', 'edge-cases', 'role-lenses'],
  'data-engineer': ['features', 'blueprint', 'lld', 'scale', 'edge-cases', 'role-lenses', 'playbook'],
  'data-scientist': [
    'signal-noise',
    'problem',
    'features',
    'blueprint',
    'evaluation',
    'edge-cases',
    'role-lenses',
  ],
  'ai-engineer': ['sequence', 'lld', 'evaluation', 'edge-cases', 'agentic', 'role-lenses', 'playbook'],
  'inference-engineer': ['hld', 'sequence', 'lld', 'scale', 'role-lenses'],
};

export const rolesForSection = (id: string): RoleId[] =>
  ROLE_IDS.filter((r) => ROLE_SECTIONS[r].includes(id));
export const isRoleId = (v: unknown): v is RoleId =>
  typeof v === 'string' && (ROLE_IDS as readonly string[]).includes(v);
