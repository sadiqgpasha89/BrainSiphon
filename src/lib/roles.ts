/**
 * The fifteen reader personas, in the order the work reaches them: business first, forward deployment, operations and assurance.
 * Client-safe (plain data): used by the reader shell, the section wrapper and the generator.
 */
export const ROLE_IDS = [
  'business-analyst',
  'solution-architect',
  'ai-architect',
  'data-analyst',
  'data-engineer',
  'data-scientist',
  'ml-engineer',
  'ai-engineer',
  'mlops-engineer',
  'inference-engineer',
  'platform-engineer',
  'forward-deployed-engineer',
  'sre-devops-engineer',
  'security-engineer',
  'qa-test-engineer',
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** Keyboard key per role: 1 to 9, then a to f. */
export const ROLE_META: Record<RoleId, { label: string; key: string; focus: string }> = {
  'business-analyst': {
    label: 'Business Analyst',
    key: '1',
    focus:
      'Requirements, AS-IS/TO-BE process, user journeys, acceptance criteria, stakeholders, RACI and the business case.',
  },
  'solution-architect': {
    label: 'Solution Architect',
    key: '2',
    focus:
      'C4 views, integration, technology selection, APIs, application boundaries, NFRs and decision records.',
  },
  'ai-architect': {
    label: 'AI Architect',
    key: '3',
    focus:
      'AI feasibility, model selection, RAG/agent decisions, model topology, human oversight and AI risk.',
  },
  'data-analyst': {
    label: 'Data Analyst',
    key: '4',
    focus:
      'Data profiling, business definitions, source-to-target mapping, KPI definitions, quality analysis and dashboards.',
  },
  'data-engineer': {
    label: 'Data Engineer',
    key: '5',
    focus:
      'Ingestion, CDC, streaming and batch, data contracts, lakehouse, transformations, feature pipelines and lineage.',
  },
  'data-scientist': {
    label: 'Data Scientist',
    key: '6',
    focus:
      'EDA, hypothesis tests, statistical validation, features, model selection, bias, calibration and experiments.',
  },
  'ml-engineer': {
    label: 'ML Engineer',
    key: '7',
    focus:
      'Training pipelines, model packaging, reusable transforms, registry integration, batch scoring and inference interfaces.',
  },
  'ai-engineer': {
    label: 'AI Engineer',
    key: '8',
    focus:
      'LLM integration, prompts, tools, retrieval, agents, structured output, orchestration, evaluation and app integration.',
  },
  'mlops-engineer': {
    label: 'MLOps Engineer',
    key: '9',
    focus:
      'Experiment tracking, registry, CI/CD/CT, deployment, drift monitoring, retraining, rollback and governance automation.',
  },
  'inference-engineer': {
    label: 'Inference Engineer',
    key: 'a',
    focus: 'Runtime optimisation, GPU/CPU allocation, quantisation, batching, memory management and latency.',
  },
  'platform-engineer': {
    label: 'Platform Engineer',
    key: 'b',
    focus:
      'Cloud infrastructure, Kubernetes, networking, IAM, secrets, Terraform, CI/CD infrastructure and platform services.',
  },
  'forward-deployed-engineer': {
    label: 'Forward Deployed Engineer',
    key: 'f',
    focus:
      'Customer discovery, enterprise integration, environment configuration, deployment, user adoption, and production feedback.',
  },
  'sre-devops-engineer': {
    label: 'SRE / DevOps Engineer',
    key: 'c',
    focus:
      'SLOs, observability, incident response, reliability, disaster recovery, capacity planning and runbooks.',
  },
  'security-engineer': {
    label: 'Security Engineer',
    key: 'd',
    focus:
      'Threat modelling, IAM, vulnerability management, encryption, privacy, data access and security sign-off.',
  },
  'qa-test-engineer': {
    label: 'QA / Test Engineer',
    key: 'e',
    focus:
      'Functional, integration, contract, regression, performance, fault-injection and acceptance testing.',
  },
};

/** What each role owns, in one line: shown on the home page and in the markdown export. */
export const ROLE_OWNS: Record<RoleId, string> = {
  'business-analyst': 'Establishes who the system is for, what it must do and how its value is measured',
  'solution-architect': 'Integrates the solution into the enterprise',
  'ai-architect': 'Decides the AI/ML solution topology and model strategy',
  'data-analyst': 'Defines, profiles and explains the data and the KPIs the business will judge it by',
  'data-engineer': 'Builds and maintains data pipelines and data products',
  'data-scientist': 'Develops and validates analytical and ML models',
  'ml-engineer': 'Turns validated models into packaged, reproducible, callable software',
  'ai-engineer': 'Builds AI applications, RAG, tools and agent workflows',
  'mlops-engineer': 'Industrialises model development, deployment and ongoing operations',
  'inference-engineer': 'Optimises model execution, runtimes and serving performance',
  'platform-engineer': 'Provides the cloud, cluster, network, identity and pipeline foundations',
  'forward-deployed-engineer':
    'Bridges customer enterprise reality and the reference blueprint: integrations, VPC/auth enablement, deployment, and day-2 customer troubleshooting',
  'sre-devops-engineer': 'Keeps the service reliable and recoverable, and owns on-call and runbooks',
  'security-engineer': 'Threat-models the system and signs off its security and privacy controls',
  'qa-test-engineer': 'Proves the system meets its requirements before and after every release',
};

/** Every section id the reader renders, in page order (the playbook is only present when the use case has one). Kept beside the role map so a test can check the two agree. */
export const SECTION_IDS = [
  'discovery',
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
  'metrics',
  'mlops',
  'operations',
  'agentic',
  'playbook',
  'validation',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * The sections in four groups, in page order, so twenty-two entries read as four. Used by the "On this page" navigation and the
 * home page; a test checks the groups cover every section exactly once and keep the page order.
 */
export const SECTION_GROUPS: { id: string; label: string; blurb: string; sections: SectionId[] }[] = [
  {
    id: 'understand',
    label: 'Understand',
    blurb: 'The problem, the business around it, and what actually moves the metric.',
    sections: ['discovery', 'enterprise', 'signal-noise', 'problem'],
  },
  {
    id: 'design',
    label: 'Design',
    blurb: 'Features, model pipeline and the system, sized for real load.',
    sections: ['features', 'blueprint', 'hld', 'sequence', 'lld', 'e2e', 'scale'],
  },
  {
    id: 'prove',
    label: 'Prove',
    blurb: 'Evidence that it works, fails safely and is allowed to run.',
    sections: ['evaluation', 'edge-cases', 'role-lenses', 'governance', 'experimentation', 'metrics'],
  },
  {
    id: 'run',
    label: 'Ship and run',
    blurb: 'Release, operations, agents where they fit, and a build playbook.',
    sections: ['mlops', 'operations', 'agentic', 'playbook', 'validation'],
  },
];

/**
 * Which blueprint sections each role should read first. Every section outside the list is hidden while that lens is on.
 * Phase 0 (`discovery`) is in every list: no role starts from the architecture, and the combined lens of several roles is
 * the union of these lists.
 */
export const ROLE_SECTIONS: Record<RoleId, string[]> = {
  'business-analyst': [
    'discovery',
    'problem',
    'enterprise',
    'signal-noise',
    'evaluation',
    'metrics',
    'governance',
    'experimentation',
    'operations',
    'role-lenses',
    'validation',
  ],
  'solution-architect': [
    'discovery',
    'problem',
    'enterprise',
    'hld',
    'sequence',
    'lld',
    'scale',
    'edge-cases',
    'governance',
    'operations',
    'metrics',
    'role-lenses',
    'validation',
  ],
  'ai-architect': [
    'discovery',
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
    'metrics',
    'role-lenses',
    'validation',
  ],
  'data-analyst': [
    'discovery',
    'signal-noise',
    'problem',
    'features',
    'enterprise',
    'evaluation',
    'experimentation',
    'metrics',
    'role-lenses',
  ],
  'data-engineer': [
    'discovery',
    'enterprise',
    'features',
    'blueprint',
    'lld',
    'scale',
    'metrics',
    'edge-cases',
    'role-lenses',
    'playbook',
  ],
  'data-scientist': [
    'discovery',
    'signal-noise',
    'problem',
    'features',
    'blueprint',
    'evaluation',
    'edge-cases',
    'experimentation',
    'metrics',
    'governance',
    'role-lenses',
  ],
  'ml-engineer': [
    'discovery',
    'features',
    'blueprint',
    'lld',
    'e2e',
    'evaluation',
    'scale',
    'mlops',
    'metrics',
    'role-lenses',
    'playbook',
  ],
  'ai-engineer': [
    'discovery',
    'sequence',
    'lld',
    'evaluation',
    'edge-cases',
    'agentic',
    'metrics',
    'mlops',
    'role-lenses',
    'playbook',
  ],
  'mlops-engineer': [
    'discovery',
    'hld',
    'lld',
    'scale',
    'evaluation',
    'edge-cases',
    'experimentation',
    'metrics',
    'mlops',
    'operations',
    'governance',
    'role-lenses',
    'playbook',
    'validation',
  ],
  'inference-engineer': ['discovery', 'hld', 'sequence', 'lld', 'scale', 'metrics', 'role-lenses'],
  'platform-engineer': [
    'discovery',
    'enterprise',
    'hld',
    'lld',
    'scale',
    'mlops',
    'operations',
    'governance',
    'role-lenses',
  ],
  'forward-deployed-engineer': [
    'discovery',
    'enterprise',
    'problem',
    'hld',
    'sequence',
    'lld',
    'e2e',
    'scale',
    'evaluation',
    'edge-cases',
    'operations',
    'governance',
    'role-lenses',
    'playbook',
    'validation',
  ],
  'sre-devops-engineer': [
    'discovery',
    'hld',
    'scale',
    'edge-cases',
    'metrics',
    'mlops',
    'operations',
    'governance',
    'role-lenses',
    'validation',
  ],
  'security-engineer': [
    'discovery',
    'enterprise',
    'hld',
    'lld',
    'edge-cases',
    'agentic',
    'governance',
    'operations',
    'role-lenses',
    'validation',
  ],
  'qa-test-engineer': [
    'discovery',
    'problem',
    'sequence',
    'lld',
    'e2e',
    'evaluation',
    'edge-cases',
    'scale',
    'metrics',
    'operations',
    'role-lenses',
    'playbook',
    'validation',
  ],
};

export const rolesForSection = (id: string): RoleId[] =>
  ROLE_IDS.filter((r) => ROLE_SECTIONS[r].includes(id));
export const isRoleId = (v: unknown): v is RoleId =>
  typeof v === 'string' && (ROLE_IDS as readonly string[]).includes(v);
/** Sections shown for a set of roles: the union of each role's list, in page order. */
export const sectionsForRoles = (roles: readonly RoleId[]): string[] =>
  SECTION_IDS.filter((id) => roles.some((r) => ROLE_SECTIONS[r].includes(id)));

/* ---------------------------------------------------------------- common engineering lifecycle */

/** The one lifecycle every role works inside. Phase 0 is compulsory: nothing in phase 1 or later starts without it. */
export const LIFECYCLE_PHASES = [
  { id: 'p0', label: 'Phase 0 · Discovery and business requirements', mandatory: true },
  { id: 'p1', label: 'Phase 1 · Architecture and design', mandatory: false },
  { id: 'p2', label: 'Phase 2 · Data', mandatory: false },
  { id: 'p3', label: 'Phase 3 · Model and application build', mandatory: false },
  { id: 'p4', label: 'Phase 4 · Platform, security and verification', mandatory: false },
  { id: 'p5', label: 'Phase 5 · Release and deployment', mandatory: false },
  { id: 'p6', label: 'Phase 6 · Operate and improve', mandatory: false },
] as const;
export type PhaseId = (typeof LIFECYCLE_PHASES)[number]['id'];

type Lifecycle = Partial<Record<PhaseId, string>>;

/** What each role does in each phase. A role that has nothing to do in a phase has no entry. */
export const ROLE_LIFECYCLE: Record<RoleId, Lifecycle> = {
  'business-analyst': {
    p0: 'Leads discovery: users, decision owner, AS-IS and TO-BE process, journeys, requirements, acceptance criteria, RACI, baseline and the business case.',
    p1: 'Keeps requirements traceable to design decisions and settles scope trade-offs with the decision owner.',
    p4: 'Co-owns acceptance criteria with QA and arranges business user acceptance testing.',
    p5: 'Prepares the business change: training, policy changes, communications and the go-live approval.',
    p6: 'Tracks realised benefit against the baseline and the ROI measure.',
  },
  'solution-architect': {
    p0: 'Confirms the existing landscape, systems of record and constraints that bound the solution.',
    p1: 'Owns C4 views, integration contracts, technology selection, NFRs and architecture decision records.',
    p4: 'Reviews that what is built matches the integration boundaries and NFRs.',
    p5: 'Approves the cut-over and coexistence plan with the legacy path.',
  },
  'ai-architect': {
    p0: 'Judges whether AI is warranted at all, and what risk and oversight the use case needs.',
    p1: 'Chooses the model topology, retrieval or agent design, human-oversight points and AI risk controls.',
    p3: 'Arbitrates model-strategy changes found during build.',
    p5: 'Signs off promotion evidence against the decision matrix.',
    p6: 'Reviews drift and incident findings against the original design assumptions.',
  },
  'data-analyst': {
    p0: 'Profiles candidate sources and writes the business definitions and KPI definitions the requirements rely on.',
    p2: 'Produces the source-to-target mapping, data-quality analysis and the baseline numbers.',
    p6: 'Maintains the analytical dashboards that show the KPIs and their movement.',
  },
  'data-engineer': {
    p0: 'Confirms data ownership, access and refresh cadence of each source.',
    p2: 'Builds ingestion (CDC, streaming, batch), data contracts, transformations, feature pipelines and lineage.',
    p3: 'Delivers point-in-time training datasets and the online/offline feature parity checks.',
    p6: 'Runs the pipelines, handles schema change and backfills without touching live keys.',
  },
  'data-scientist': {
    p0: 'Tests whether the signal plausibly exists and sets the success metric with the business.',
    p2: 'Runs exploratory analysis, leakage checks and feature engineering on matured labels.',
    p3: 'Selects and validates the model: statistics, slices, bias, calibration and experiment design.',
    p6: 'Investigates drift and decides whether a challenger is justified.',
  },
  'ml-engineer': {
    p2: 'Reuses the feature transforms so training and serving share one definition.',
    p3: 'Builds the training pipeline, packages the model, integrates the registry and exposes batch and online inference interfaces.',
    p5: 'Hands a signed, reproducible model artifact to MLOps.',
    p6: 'Fixes reproducibility and packaging defects found in production.',
  },
  'ai-engineer': {
    p1: 'Specifies prompts, tools, retrieval and output contracts with the architects.',
    p3: 'Builds the application layer: LLM integration, retrieval, agents, structured output, orchestration and the evaluation harness.',
    p4: 'Fixes the failures the evaluation, red-team and test suites find.',
    p6: 'Maintains prompts, indexes and tool contracts as release artifacts.',
  },
  'mlops-engineer': {
    p1: 'Defines the release path, environments and promotion gates.',
    p3: 'Automates training CI/CT, experiment tracking and the model registry.',
    p5: 'Runs shadow, canary, promotion and rollback, and collects the release evidence.',
    p6: 'Operates drift monitoring, retraining triggers and model governance automation.',
  },
  'inference-engineer': {
    p1: 'Sizes the serving plane: hardware class, batching strategy and the latency budget per stage.',
    p3: 'Optimises the runtime: compilation, quantisation, memory and batching.',
    p4: 'Load-tests against the latency and throughput targets with QA.',
    p6: 'Tunes cost per decision and capacity as traffic changes.',
  },
  'platform-engineer': {
    p0: 'Confirms hosting, region, network and identity constraints.',
    p1: 'Designs the cloud landing zone, cluster, network and identity model.',
    p4: 'Builds the infrastructure as code, secrets handling and CI/CD infrastructure.',
    p5: 'Provides the environments and the deployment mechanics.',
    p6: 'Runs the platform services and keeps them patched.',
  },
  'forward-deployed-engineer': {
    p0: 'Conducts customer discovery, identifies target infrastructure/network/auth constraints, and secures data-access enablement.',
    p1: 'Maps customer enterprise security controls, private endpoints, API gateways, and custom identity federation to solution architecture.',
    p2: 'Configures customer data sources, enterprise CDC/event pipelines, and validates compliance with customer data governance.',
    p3: 'Customises business logic, model hooks, and customer application integration points to fit enterprise workflows.',
    p4: 'Executes customer-environment pre-flight checklists, IAM policies, and integration contract validation.',
    p5: 'Leads customer-side staging and production rollout, smoke tests, failover rehearsal, and initial user onboarding.',
    p6: 'Drives day-2 customer troubleshooting, user adoption telemetry, and feeds real-world edge cases back to core engineering.',
  },
  'sre-devops-engineer': {
    p1: 'Sets SLOs, error budgets, recovery objectives and the observability design.',
    p4: 'Builds telemetry, alerting, runbooks and the failure drills.',
    p5: 'Gates go-live on readiness: on-call, runbooks, capacity and rollback rehearsal.',
    p6: 'Owns on-call, incident response, disaster recovery drills and capacity planning.',
  },
  'security-engineer': {
    p0: 'Classifies the data and establishes the compliance obligations that apply.',
    p1: 'Threat-models the design and specifies identity, encryption, privacy and data-access controls.',
    p4: 'Runs vulnerability management and penetration or red-team tests, then gives security sign-off.',
    p5: 'Confirms controls are in place in production before go-live.',
    p6: 'Handles vulnerabilities, access reviews and security incidents.',
  },
  'qa-test-engineer': {
    p0: 'Turns the acceptance criteria into testable statements.',
    p1: 'Writes the test strategy across functional, integration, contract, performance and fault-injection levels.',
    p4: 'Executes and automates the suites, reports defects and runs regression.',
    p5: 'Gives the test-evidence verdict for go-live.',
    p6: 'Maintains the regression suite from production incidents.',
  },
};

/** The work that passes from one role to the next, and what is handed over. */
export const ROLE_HANDOFFS: { from: RoleId; to: RoleId; artefact: string }[] = [
  {
    from: 'business-analyst',
    to: 'solution-architect',
    artefact: 'Approved requirements, NFR drivers and the stakeholder map',
  },
  {
    from: 'business-analyst',
    to: 'ai-architect',
    artefact: 'The decision to be automated, the cost of a wrong output and the baseline to beat',
  },
  {
    from: 'business-analyst',
    to: 'qa-test-engineer',
    artefact: 'Acceptance criteria written as testable statements',
  },
  {
    from: 'business-analyst',
    to: 'data-analyst',
    artefact: 'KPI list and the business questions behind each one',
  },
  {
    from: 'data-analyst',
    to: 'data-engineer',
    artefact: 'Source-to-target mapping and business definitions',
  },
  {
    from: 'data-analyst',
    to: 'data-scientist',
    artefact: 'Profiled data, baseline figures and quality findings',
  },
  {
    from: 'solution-architect',
    to: 'platform-engineer',
    artefact: 'Architecture views, integration contracts and NFRs',
  },
  {
    from: 'solution-architect',
    to: 'data-engineer',
    artefact: 'System-of-record boundaries and integration contracts',
  },
  {
    from: 'ai-architect',
    to: 'data-scientist',
    artefact: 'Model strategy, success metric and oversight points',
  },
  {
    from: 'ai-architect',
    to: 'ai-engineer',
    artefact: 'Retrieval, agent and tool design with the risk controls',
  },
  { from: 'data-engineer', to: 'data-scientist', artefact: 'Point-in-time training datasets with lineage' },
  {
    from: 'data-engineer',
    to: 'ml-engineer',
    artefact: 'Feature pipelines and the shared transform definitions',
  },
  {
    from: 'data-engineer',
    to: 'mlops-engineer',
    artefact: 'Pipeline schedules, data contracts and quality gates that feed training and monitoring',
  },
  {
    from: 'data-scientist',
    to: 'ml-engineer',
    artefact: 'The validated model, its evaluation report and calibration',
  },
  {
    from: 'ml-engineer',
    to: 'mlops-engineer',
    artefact: 'A reproducible, packaged model artifact for the registry',
  },
  {
    from: 'ml-engineer',
    to: 'inference-engineer',
    artefact: 'The model and its inference interface to optimise',
  },
  {
    from: 'ai-engineer',
    to: 'mlops-engineer',
    artefact: 'Prompts, indexes and tool contracts as versioned release artifacts',
  },
  {
    from: 'inference-engineer',
    to: 'mlops-engineer',
    artefact: 'The optimised serving artifact and its measured latency and cost',
  },
  {
    from: 'mlops-engineer',
    to: 'platform-engineer',
    artefact: 'Deployment dependencies: runtime images, resources, secrets and pipeline needs',
  },
  {
    from: 'mlops-engineer',
    to: 'sre-devops-engineer',
    artefact: 'Operational handoff: monitors, drift thresholds, rollback procedure and release evidence',
  },
  {
    from: 'platform-engineer',
    to: 'sre-devops-engineer',
    artefact: 'Environments, cluster and network ready to operate',
  },
  {
    from: 'security-engineer',
    to: 'mlops-engineer',
    artefact: 'Security sign-off and the controls a release must carry',
  },
  { from: 'qa-test-engineer', to: 'mlops-engineer', artefact: 'Test-evidence verdict that gates promotion' },
  {
    from: 'solution-architect',
    to: 'forward-deployed-engineer',
    artefact: 'Customer integration boundaries, private endpoint topology, and auth federation architecture',
  },
  {
    from: 'forward-deployed-engineer',
    to: 'platform-engineer',
    artefact: 'Customer environment pre-flight findings, network constraints, and identity provider configs',
  },
  {
    from: 'forward-deployed-engineer',
    to: 'sre-devops-engineer',
    artefact:
      'Customer site runbook adjustments, localized telemetry mappings, and day-2 support escalation paths',
  },
  {
    from: 'sre-devops-engineer',
    to: 'business-analyst',
    artefact: 'Service and incident reports that feed benefit tracking',
  },
];

export interface CombinedRoleView {
  roles: RoleId[];
  sections: string[];
  phases: { id: PhaseId; label: string; mandatory: boolean; items: { role: RoleId; text: string }[] }[];
  /** handoffs between the selected roles: work the combined role passes to itself, so no coordination is needed */
  internalHandoffs: typeof ROLE_HANDOFFS;
  /** work the combined role must receive from outside it */
  inbound: typeof ROLE_HANDOFFS;
  /** work the combined role must hand over to others */
  outbound: typeof ROLE_HANDOFFS;
}

/** Combine the responsibilities of one or more roles: every phase, what each role does in it, and the handoffs at the edge. */
export function combineRoles(selected: readonly RoleId[]): CombinedRoleView {
  const roles = ROLE_IDS.filter((r) => selected.includes(r));
  const inSet = (r: RoleId) => roles.includes(r);
  return {
    roles,
    sections: sectionsForRoles(roles),
    phases: LIFECYCLE_PHASES.map((p) => ({
      id: p.id,
      label: p.label,
      mandatory: p.mandatory,
      items: roles.flatMap((role) =>
        ROLE_LIFECYCLE[role][p.id] ? [{ role, text: ROLE_LIFECYCLE[role][p.id]! }] : [],
      ),
    })).filter((p) => p.items.length > 0),
    internalHandoffs: ROLE_HANDOFFS.filter((h) => inSet(h.from) && inSet(h.to)),
    inbound: ROLE_HANDOFFS.filter((h) => !inSet(h.from) && inSet(h.to)),
    outbound: ROLE_HANDOFFS.filter((h) => inSet(h.from) && !inSet(h.to)),
  };
}
