/**
 * The delivery guide: one path from project scoping to deployment and monitoring that works for any of the blueprints.
 *
 * This file is the single source. The /delivery page renders it, `deliveryMarkdown()` (delivery-markdown.ts) turns it into
 * docs/DELIVERY_GUIDE.md and /delivery.md, and the RACI matrix is derived from the steps below rather than written twice.
 * The seven phases are the site's common lifecycle (LIFECYCLE_PHASES in lib/roles.ts); a test checks that every role
 * responsibility listed there is covered by at least one step here.
 *
 * Plain data, safe to import from client components.
 */
import { ROLE_IDS, ROLE_META, type PhaseId, type RoleId } from '../lib/roles';

/* ------------------------------------------------------------------------------------------------ people */

/** People outside the fourteen delivery roles without whom a delivery does not finish. */
export const PARTNER_IDS = [
  'sponsor',
  'product-owner',
  'delivery-lead',
  'domain-expert',
  'end-users',
  'data-owner',
  'risk-compliance',
  'finance',
  'support',
] as const;
export type PartnerId = (typeof PARTNER_IDS)[number];
export type PartyId = RoleId | PartnerId;

export interface Partner {
  label: string;
  /** what they are there for, in one line */
  does: string;
  /** how the delivery team works with them */
  how: string;
  /** the moments they are needed */
  when: string;
  /** the decisions that are theirs and nobody else's */
  decides: string;
}

export const PARTNERS: Record<PartnerId, Partner> = {
  sponsor: {
    label: 'Executive sponsor',
    does: 'Owns the business problem and the budget, and removes blockers the team cannot remove itself.',
    how: 'Approves the business case, chairs the monthly steering meeting and hears escalations within a day.',
    when: 'Phase 0 gate, monthly steering, the go/no-go review and every quarterly service review.',
    decides: 'Fund, pause or stop the work.',
  },
  'product-owner': {
    label: 'Product owner (decision owner)',
    does: 'Owns the business decision the system supports: its priorities, its thresholds and whether the result is accepted.',
    how: 'Available to the team every week, attends demos, settles scope trade-offs and signs acceptance.',
    when: 'Every phase. Signs gates 0, 1, 3, 4 and 5, and owns the service in Phase 6.',
    decides:
      'Scope, the operating point (the cost of a false positive against a false negative), acceptance and go-live.',
  },
  'delivery-lead': {
    label: 'Delivery lead (project manager)',
    does: 'Runs the plan: who does what by when, the risks, the gate reviews and the meeting rhythm.',
    how: 'Keeps the plan, RACI and risk register current, and calls each gate review with the evidence attached.',
    when: 'From day one until operations accepts the service in Phase 5.',
    decides: 'Sequencing and day-to-day priorities inside the agreed scope.',
  },
  'domain-expert': {
    label: 'Domain expert (subject-matter expert)',
    does: 'Explains how the work is really done today and what a correct answer looks like.',
    how: 'Interviews and working sessions; reviews label definitions and reads the model’s worst mistakes with the data scientist.',
    when: 'Phase 0 interviews, Phase 2 label definition, Phase 3 error analysis, Phase 4 acceptance.',
    decides: 'Whether a label, a rule or an output is correct in the real domain.',
  },
  'end-users': {
    label: 'End users and process owners',
    does: 'The people who act on the system’s output every day, and the manager who owns their process.',
    how: 'Are observed doing the work, review the TO-BE process, run user acceptance tests and give feedback after launch.',
    when: 'Phase 0 process mapping, Phase 3 application design, Phase 4 acceptance testing, Phase 5 training, Phase 6 feedback.',
    decides: 'Whether the new process is workable in practice.',
  },
  'data-owner': {
    label: 'Data owner (data steward)',
    does: 'Accountable for a source dataset: its meaning, its quality and who may use it for what.',
    how: 'Grants access against a stated purpose, signs the data contract and is told about every quality issue found.',
    when: 'Phase 0 classification, Phase 1 contracts, Phase 2 access and quality, Phase 6 change notifications.',
    decides: 'Whether the data may be used for this purpose, and under which conditions.',
  },
  'risk-compliance': {
    label: 'Risk, compliance, legal and privacy',
    does: 'Interprets the laws, regulations and internal policies that apply, and reviews the model where the risk tier requires it.',
    how: 'Confirms the risk tier and the approval path, reviews the privacy assessment and the model documentation, and holds the evidence.',
    when: 'Phase 0 risk tier, Phase 2 privacy assessment, Phase 3 model review, Phase 4 compliance evidence, Phase 5 go/no-go, Phase 6 periodic review.',
    decides: 'Whether the obligations are met, and which findings may be accepted rather than fixed.',
  },
  finance: {
    label: 'Finance (FinOps)',
    does: 'Validates the business case and tracks what the system costs and returns.',
    how: 'Reviews the value and cost assumptions, sets the budget and receives the monthly cost and benefit numbers.',
    when: 'Phase 0 business case, Phase 1 cost model, Phase 5 experiment readout, Phase 6 monthly and quarterly reviews.',
    decides: 'Whether the numbers in the business case are credible.',
  },
  support: {
    label: 'Support and service desk',
    does: 'First line for users once the system is live.',
    how: 'Is trained before go-live, works from the runbooks and escalates along the agreed path.',
    when: 'Phase 4 runbooks and training, Phase 5 hypercare and handover, Phase 6 every day.',
    decides: 'When an issue is escalated to on-call engineering.',
  },
};

export const isPartnerId = (v: string): v is PartnerId => (PARTNER_IDS as readonly string[]).includes(v);
export const PARTY_IDS: readonly PartyId[] = [...PARTNER_IDS, ...ROLE_IDS];
export const partyLabel = (id: PartyId): string => (isPartnerId(id) ? PARTNERS[id].label : ROLE_META[id].label);

/* ------------------------------------------------------------------------------- where to read in a blueprint */

/**
 * Anchors that exist on every blueprint page, so a step can say exactly where to read. Only ids that are rendered for all
 * use cases are listed (an e2e test opens blueprints of different kinds and checks each one).
 */
export const BLUEPRINT_ANCHORS = {
  discovery: 'Phase 0 · Discovery',
  'disc-questions': 'Phase 0 · The eight questions to settle first',
  'disc-process': 'Phase 0 · AS-IS and TO-BE process',
  'disc-stakeholders': 'Phase 0 · Stakeholders and user journeys',
  'disc-requirements': 'Phase 0 · Requirements and acceptance criteria',
  'disc-raci': 'Phase 0 · RACI',
  'disc-case': 'Phase 0 · Business case and ROI measurement',
  'disc-exit': 'Phase 0 · Exit gate',
  'ent-business': 'Enterprise context · Business architecture',
  'ent-application': 'Enterprise context · Application and integration',
  'ent-data': 'Enterprise context · Data architecture and data contract',
  'ent-technology': 'Enterprise context · Technology and security',
  'ent-operating': 'Enterprise context · Operating architecture',
  'ent-nfr': 'Enterprise context · Non-functional requirements',
  'ent-decision': 'Enterprise context · AI decision matrix',
  'ent-adr': 'Enterprise context · Architecture decision records',
  'ent-buildbuy': 'Enterprise context · Build, buy or integrate',
  'signal-noise': 'Signal vs. Noise',
  problem: 'Problem & loss',
  features: 'Features & leakage',
  blueprint: 'Pipeline blueprint',
  hld: 'High-level design',
  sequence: 'Sequence diagram',
  lld: 'Low-level design',
  e2e: 'End-to-end breakdown',
  scale: 'Scale & capacity (with the sizing calculator)',
  evaluation: 'Evaluation',
  'ev-offline': 'Evaluation · Offline protocol',
  'ev-thresholds': 'Evaluation · Release thresholds',
  'ev-online': 'Evaluation · Online evaluation',
  'ev-continuous': 'Evaluation · After launch',
  'edge-cases': 'Production edge cases',
  'role-lenses': 'Role lenses',
  governance: 'Security & governance · Risk tier',
  'gov-guardrails': 'Security & governance · Guardrails',
  'gov-approvals': 'Security & governance · Approval path',
  'gov-data': 'Security & governance · Data governance',
  'gov-model': 'Security & governance · Model governance',
  'gov-rai': 'Security & governance · Responsible AI',
  'gov-security': 'Security & governance · AI security threats',
  'gov-regulatory': 'Security & governance · Obligation to control to evidence',
  experimentation: 'Statistical validation',
  'xp-design': 'Statistical validation · Experimental design',
  'xp-metrics': 'Statistical validation · Metrics, power and stopping',
  'xp-data': 'Statistical validation · Labels, sampling and data quality',
  'xp-model': 'Statistical validation · Calibration, uncertainty and slices',
  'xp-value': 'Statistical validation · Measuring business value',
  metrics: 'Metrics catalogue',
  'mt-failure-monitors': 'Metrics catalogue · Monitors for this system’s edge cases',
  'mt-gaming': 'Metrics catalogue · How these metrics get gamed',
  mlops: 'MLOps & LLMOps',
  'mlops-retraining': 'MLOps · Retraining, champion/challenger and rollback',
  'mlops-toolchain': 'MLOps · Toolchain options',
  operations: 'Production operations',
  agentic: 'Agentic solution (or a reasoned “no agent”)',
  playbook: 'Build playbook',
  'pb-prereqs': 'Build playbook · Before you start',
  'pb-domain': 'Build playbook · Domain knowledge',
  'pb-data': 'Build playbook · Data',
  'pb-milestones': 'Build playbook · Milestones with exit gates',
  'pb-tests': 'Build playbook · Test and acceptance plan',
  'pb-decisions': 'Build playbook · Decisions you will have to make',
  'pb-pitfalls': 'Build playbook · Pitfalls',
  'pb-30': 'Build playbook · The first 30 days after launch',
  validation: 'Validation',
} as const;
export type BlueprintAnchor = keyof typeof BLUEPRINT_ANCHORS;

/* ----------------------------------------------------------------------------------------------- the phases */

export interface DeliveryStep {
  /** phase number dot step number, for example "2.4" */
  id: string;
  title: string;
  /** the one party who does the work and answers for it */
  owner: PartyId;
  /** the parties who must take part */
  with: PartyId[];
  /** where the step falls in the reference plan, or how often it recurs */
  when: string;
  /** what to actually do, in order */
  how: string[];
  /** the thing that exists when the step is finished */
  output: string;
  /** where to read in the blueprint of the use case being delivered */
  read: BlueprintAnchor[];
  /** how the step changes for a particular kind of use case */
  note?: string;
}

export interface DeliveryGate {
  name: string;
  /** who calls the review and brings the evidence */
  convenedBy: PartyId;
  signedBy: PartyId[];
  /** each line is evidence that must exist, not an intention */
  checks: string[];
}

export interface DeliveryPhase {
  id: PhaseId;
  n: number;
  name: string;
  /** one or two words for rails and tables */
  short: string;
  goal: string;
  /** position in the 16-week reference plan */
  weeks: string;
  /** the role that leads the day-to-day work */
  lead: RoleId;
  /** the single party accountable for the phase result */
  accountable: PartyId;
  /** kept informed without taking part */
  informed: PartyId[];
  /** what must be true before the phase starts */
  entry: string;
  steps: DeliveryStep[];
  gate: DeliveryGate;
  /** the mistakes beginners most often make here */
  traps: string[];
}

export const REFERENCE_PLAN_NOTE =
  'Week numbers follow a 16-week reference plan for a first production release by a small team. They are planning defaults to replace with your own estimate, not measurements. Phases overlap on purpose: data work starts before the design is closed, and verification starts before the build ends.';

export const DELIVERY_PHASES: DeliveryPhase[] = [
  /* ============================================================================================ Phase 0 */
  {
    id: 'p0',
    n: 0,
    name: 'Discovery and business requirements',
    short: 'Scope',
    goal: 'Agree which decision the system will support, for whom, how success is measured and whether AI is warranted at all, before anyone designs or builds anything.',
    weeks: 'Weeks 1–2',
    lead: 'business-analyst',
    accountable: 'sponsor',
    informed: ['mlops-engineer', 'ml-engineer', 'ai-engineer', 'inference-engineer', 'sre-devops-engineer', 'support'],
    entry:
      'A sponsor has named a problem and can give you access to the people who do the work today.',
    steps: [
      {
        id: '0.1',
        title: 'Pick the use case and read its blueprint once, end to end',
        owner: 'delivery-lead',
        with: ['business-analyst', 'solution-architect', 'ai-architect', 'forward-deployed-engineer'],
        when: 'Week 1, day 1',
        how: [
          'Open the domain page, follow its “Start here” path or a track, and choose the blueprint closest to your problem.',
          'Read the summary, the signal vs. noise matrix and the problem statement. Use Pure Signal mode if time is short.',
          'Read the Validation section so you know which parts are generated starting points and which are reviewed. Treat every number as a proposal to check.',
          'Write down where your organisation differs from the blueprint: different systems, volumes, regulators or users.',
        ],
        output: 'A one-page note: what we adopt from the blueprint, and what differs here.',
        read: ['signal-noise', 'problem', 'validation'],
      },
      {
        id: '0.2',
        title: 'Name the sponsor, the decision owner and every stakeholder',
        owner: 'business-analyst',
        with: ['sponsor', 'product-owner', 'delivery-lead'],
        when: 'Week 1, days 1–2',
        how: [
          'List everyone who uses the output, is affected by it, pays for it, approves it or will operate it.',
          'For each person record what they need from the system and what they are worried about.',
          'Confirm one named decision owner: the person who owns the business outcome and the thresholds.',
          'Book a 30-minute interview with each group for this week.',
        ],
        output: 'Stakeholder map with a named decision owner.',
        read: ['disc-stakeholders'],
      },
      {
        id: '0.3',
        title: 'Answer the eight discovery questions with evidence',
        owner: 'business-analyst',
        with: ['product-owner', 'domain-expert', 'end-users'],
        when: 'Week 1, days 2–5',
        how: [
          'Take each proposed answer in the blueprint to the person named under “confirm with”.',
          'Replace the proposal with their confirmed answer and attach the evidence the blueprint asks for.',
          'Anything still unanswered becomes a risk with an owner and a date, not a silent assumption.',
        ],
        output: 'Discovery log: eight questions, each with a confirmed answer, its owner and its evidence.',
        read: ['disc-questions'],
      },
      {
        id: '0.4',
        title: 'Map the AS-IS process and design the TO-BE process',
        owner: 'business-analyst',
        with: ['end-users', 'domain-expert', 'solution-architect'],
        when: 'Week 1, days 3–5',
        how: [
          'Sit with the people who do the work. Record each step, its volume, its duration and where errors happen.',
          'Mark the exact point where the system’s output changes a decision, and who acts on it.',
          'Write what happens when the system is unavailable: the manual fallback must exist on paper now.',
          'Walk the TO-BE process back with the same people and correct it.',
        ],
        output: 'AS-IS and TO-BE process maps and user journeys, agreed with the people who run them.',
        read: ['disc-process', 'disc-stakeholders'],
      },
      {
        id: '0.5',
        title: 'Measure the baseline',
        owner: 'data-analyst',
        with: ['data-owner', 'data-engineer', 'data-scientist', 'business-analyst'],
        when: 'Weeks 1–2',
        how: [
          'Ask the data owner for read access and confirm with the data engineer who owns each source and how often it refreshes.',
          'Write each KPI as a definition: numerator, denominator, time window and source table.',
          'Compute today’s value from real records over at least one full business cycle.',
          'Record the performance of the current process (rules or people). That is the number to beat.',
        ],
        output: 'Baseline report with KPI definitions. Measured, not estimated.',
        read: ['disc-case', 'metrics'],
      },
      {
        id: '0.6',
        title: 'Decide whether AI is warranted at all',
        owner: 'ai-architect',
        with: ['data-scientist', 'product-owner', 'domain-expert'],
        when: 'Week 2',
        how: [
          'Go through the AI decision matrix: why not rules, why this paradigm, what would change the answer.',
          'Check that the signal can exist: are there labels, how many, and how long after the event do they arrive?',
          'Write the cost of a wrong output in money or harm, separately for a false positive and a false negative.',
          'If rules or a simple baseline would meet the target, recommend that and say so plainly.',
        ],
        output: 'AI go/no-go recommendation with the completed decision matrix.',
        read: ['ent-decision', 'signal-noise', 'agentic'],
      },
      {
        id: '0.7',
        title: 'Classify the data and confirm the risk tier',
        owner: 'security-engineer',
        with: ['risk-compliance', 'data-owner', 'ai-architect'],
        when: 'Week 2',
        how: [
          'Classify every source: personal, financial, health, confidential or public.',
          'List the laws, regulations and internal policies that apply, including where data must reside.',
          'Confirm the risk tier with risk and compliance, and the approval path that tier requires.',
        ],
        output: 'Data classification, confirmed risk tier and the approval path.',
        read: ['governance', 'gov-approvals', 'gov-regulatory'],
      },
      {
        id: '0.8',
        title: 'Write the requirements and acceptance criteria',
        owner: 'business-analyst',
        with: ['product-owner', 'qa-test-engineer', 'solution-architect', 'platform-engineer'],
        when: 'Week 2',
        how: [
          'Write functional requirements as “the system shall…”, each with an acceptance criterion.',
          'Have QA rewrite every criterion as a testable given/when/then statement.',
          'Capture what drives the non-functional requirements: latency, availability, peak volume, retention, and the hosting, region and network constraints.',
          'Write an explicit out-of-scope list.',
        ],
        output: 'Approved requirements, testable acceptance criteria and a scope boundary.',
        read: ['disc-requirements', 'ent-nfr'],
      },
      {
        id: '0.9',
        title: 'Agree the RACI, the team and the plan',
        owner: 'delivery-lead',
        with: ['sponsor', 'product-owner', 'business-analyst'],
        when: 'Week 2',
        how: [
          'Give every decision exactly one accountable person.',
          'Map the fourteen roles to named people. One person may hold several roles: write that down.',
          'Plan the seven phases with dates and a gate review at the end of each.',
          'Start a risk register with the ten biggest risks, each with an owner.',
        ],
        output: 'RACI, staffing plan, dated delivery plan and risk register.',
        read: ['disc-raci', 'role-lenses'],
      },
      {
        id: '0.10',
        title: 'Build the business case',
        owner: 'business-analyst',
        with: ['finance', 'sponsor', 'data-analyst'],
        when: 'Week 2',
        how: [
          'Value: the move from baseline to target, multiplied by the unit value finance agrees.',
          'Cost: build, run (start from the capacity model), people and business change.',
          'State how the benefit will be measured after launch: the method and the data source, not only the number.',
          'Add a sensitivity line: what if only half the expected uplift arrives?',
        ],
        output: 'Business case with an ROI measurement plan.',
        read: ['disc-case', 'scale', 'xp-value'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 0 · Scope approved',
      signedBy: ['sponsor', 'product-owner'],
      checks: [
        'Every discovery question has a confirmed answer with a named owner.',
        'The baseline is measured from real records.',
        'The decision that AI is (or is not) warranted is recorded with its reasons.',
        'Requirements and acceptance criteria are approved, and the out-of-scope list exists.',
        'The risk tier and its approval path are confirmed by risk and compliance.',
        'The RACI is agreed and every role has a named person.',
        'The business case is approved and the next phase is funded.',
      ],
    },
    traps: [
      'Starting with the model. Nothing in Phase 1 or later starts before this gate.',
      'Accepting an estimated baseline. Without a measured one you can never show the system helped.',
      'Treating the sponsor as the user. The person who pays is rarely the person who does the work.',
      'A scope with no out-of-scope list.',
      'No single named decision owner.',
    ],
  },

  /* ============================================================================================ Phase 1 */
  {
    id: 'p1',
    n: 1,
    name: 'Architecture and design',
    short: 'Design',
    goal: 'Turn the approved requirements into a design that fits your enterprise, meets its non-functional targets and can be built, tested, released and rolled back.',
    weeks: 'Weeks 2–4',
    lead: 'solution-architect',
    accountable: 'solution-architect',
    informed: ['sponsor', 'end-users', 'support', 'data-analyst', 'domain-expert'],
    entry: 'Gate 0 is signed.',
    steps: [
      {
        id: '1.1',
        title: 'Place the system in your enterprise landscape',
        owner: 'solution-architect',
        with: ['platform-engineer', 'data-engineer', 'business-analyst', 'forward-deployed-engineer'],
        when: 'Week 2',
        how: [
          'Start from the blueprint’s context and container diagrams and replace every generic system with your real system of record.',
          'For each integration record direction, protocol, owning team and service level.',
          'Note what already exists and can be reused: a feature store, an API gateway, a model registry.',
        ],
        output: 'C4 context and container views and an integration matrix.',
        read: ['ent-application', 'ent-business', 'ent-technology'],
      },
      {
        id: '1.2',
        title: 'Fix the non-functional requirements and the latency budget',
        owner: 'solution-architect',
        with: ['sre-devops-engineer', 'inference-engineer', 'product-owner'],
        when: 'Week 2',
        how: [
          'Take the NFR matrix and replace each target with what your business needs: p99 latency, availability, recovery objectives and peak throughput.',
          'Split the latency budget across the hops of the request path so the stages add up to the p99.',
          'Mark which targets are hard (contractual or regulatory) and which are negotiable.',
        ],
        output: 'NFR matrix with a per-stage latency budget.',
        read: ['ent-nfr', 'hld', 'sequence'],
      },
      {
        id: '1.3',
        title: 'Choose the model strategy and the human-oversight points',
        owner: 'ai-architect',
        with: ['data-scientist', 'ai-engineer', 'product-owner'],
        when: 'Weeks 2–3',
        how: [
          'Decide the baseline first, then the production model family, from the pipeline blueprint.',
          'Decide where a person reviews or overrides the output, and what they see when they do.',
          'Record what evidence would make you change the choice later.',
        ],
        output: 'Model strategy and oversight design, recorded as a decision record.',
        read: ['blueprint', 'ent-decision', 'agentic'],
        note: 'LLM, RAG and agent use cases: decide retrieval, fine-tuning or agent from the blueprint’s agent verdict, and specify prompts, tools and output contracts with the AI engineer.',
      },
      {
        id: '1.4',
        title: 'Design the high-level architecture and the fallback ladder',
        owner: 'solution-architect',
        with: ['ai-architect', 'platform-engineer', 'sre-devops-engineer'],
        when: 'Week 3',
        how: [
          'Adapt the high-level design: which parts are stateless, where state lives, which regions, and what residency rules pin.',
          'Define the fallback ladder: what the system returns when each dependency fails, down to a safe default.',
          'Walk the sequence diagram with the engineers and confirm the deadline is passed along every hop.',
        ],
        output: 'High-level design, sequence diagram and fallback ladder.',
        read: ['hld', 'sequence', 'gov-guardrails', 'edge-cases'],
      },
      {
        id: '1.5',
        title: 'Write the low-level design',
        owner: 'ml-engineer',
        with: ['ai-engineer', 'data-engineer', 'qa-test-engineer'],
        when: 'Weeks 3–4',
        how: [
          'Specify the API contract (request, response, errors, idempotency), the data model, the event schema and the configuration.',
          'Treat the blueprint’s low-level design as a scaffold: mark each element adopt, change or drop.',
          'Have the consuming team review the contract before any code is written.',
        ],
        output: 'Low-level design: API contract, data model and event schema, reviewed by its consumers.',
        read: ['lld'],
      },
      {
        id: '1.6',
        title: 'Design the data architecture and draft the data contracts',
        owner: 'data-engineer',
        with: ['data-analyst', 'data-owner', 'solution-architect'],
        when: 'Weeks 3–4',
        how: [
          'For each source record owner, refresh cadence, access path, retention and quality service level.',
          'Draft a data contract for the primary input with the team that produces it.',
          'Choose batch or streaming per feature from how fresh that feature must be, not from preference.',
          'Plan how training data will be correct as of the prediction time.',
        ],
        output: 'Data architecture and draft data contracts.',
        read: ['ent-data', 'features'],
      },
      {
        id: '1.7',
        title: 'Threat-model the design',
        owner: 'security-engineer',
        with: ['solution-architect', 'ai-architect', 'platform-engineer', 'risk-compliance'],
        when: 'Week 3',
        how: [
          'Walk the data flow and list the threats at every trust boundary, including the AI-specific ones the blueprint names.',
          'Give each threat a control and the evidence that will prove the control works, and check the list against the obligations risk and compliance named in Phase 0.',
          'Specify identity, secrets handling, encryption and the data-access model.',
        ],
        output: 'Threat model and security requirements.',
        read: ['gov-security', 'ent-technology', 'gov-data'],
      },
      {
        id: '1.8',
        title: 'Size capacity and cost',
        owner: 'inference-engineer',
        with: ['platform-engineer', 'finance', 'sre-devops-engineer'],
        when: 'Week 3',
        how: [
          'Open the sizing calculator, choose the unit your workload is really sized in and enter your own volumes, at peak rather than average.',
          'Record nodes, storage and monthly cost as low, expected and high.',
          'Compare the cost per decision with the value per decision in the business case.',
        ],
        output: 'Capacity and cost model inside the business case.',
        read: ['scale'],
      },
      {
        id: '1.9',
        title: 'Define environments, the release path and the SLOs',
        owner: 'mlops-engineer',
        with: ['sre-devops-engineer', 'platform-engineer', 'qa-test-engineer'],
        when: 'Weeks 3–4',
        how: [
          'Define the environments (development, staging, production) and what is promoted between them.',
          'Write the promotion gates: tests, evaluation thresholds and approvals at each stage.',
          'Set service-level indicators, objectives and the error budget, and design what is logged, traced and measured.',
          'Decide the rollback mechanism now, while nothing is on fire.',
        ],
        output: 'Release and environment design, and an SLO document.',
        read: ['mlops', 'operations'],
      },
      {
        id: '1.10',
        title: 'Write the test strategy',
        owner: 'qa-test-engineer',
        with: ['business-analyst', 'ml-engineer', 'data-scientist'],
        when: 'Week 4',
        how: [
          'Define the test levels: unit, data, contract, integration, model evaluation, performance, fault injection and user acceptance.',
          'Trace every acceptance criterion to at least one test.',
          'Plan the test data: synthetic, or production data that has been masked.',
        ],
        output: 'Test strategy with a traceability matrix.',
        read: ['evaluation', 'edge-cases', 'pb-tests'],
      },
      {
        id: '1.11',
        title: 'Record the decisions and hold the architecture review',
        owner: 'solution-architect',
        with: ['ai-architect', 'security-engineer', 'product-owner', 'business-analyst'],
        when: 'Week 4',
        how: [
          'Write one decision record per significant decision: context, options, decision, consequences.',
          'Decide build, buy or integrate for each component.',
          'Hold the review: walk the views, the targets, the threats and the cost. Check with the business analyst that every design decision traces to a requirement.',
        ],
        output: 'Decision records and architecture review minutes with actions.',
        read: ['ent-adr', 'ent-buildbuy'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 1 · Design approved',
      signedBy: ['solution-architect', 'ai-architect', 'security-engineer', 'product-owner'],
      checks: [
        'Context, container, high-level, sequence and low-level designs are reviewed.',
        'The stage budgets add up to the p99 latency target.',
        'Every non-functional requirement has a target and a test that will prove it.',
        'Every threat has a control and named evidence.',
        'Capacity and cost fit inside the business case.',
        'The release path, the SLOs and the rollback mechanism are defined.',
        'Every acceptance criterion traces to a test.',
        'Significant decisions are recorded.',
      ],
    },
    traps: [
      'Copying the blueprint’s diagram without replacing its generic systems with your own.',
      'Sizing for average load instead of peak.',
      'No answer to “what does the user get when the model is down?”',
      'Leaving the rollback decision to the day of the incident.',
      'Choosing an agent because it is fashionable. Read the blueprint’s verdict first.',
    ],
  },

  /* ============================================================================================ Phase 2 */
  {
    id: 'p2',
    n: 2,
    name: 'Data',
    short: 'Data',
    goal: 'Get lawful access to the data, prove it is fit for purpose, and turn it into reproducible, leak-free datasets and feature pipelines.',
    weeks: 'Weeks 3–7',
    lead: 'data-engineer',
    accountable: 'data-owner',
    informed: ['sponsor', 'solution-architect', 'ai-architect', 'sre-devops-engineer', 'qa-test-engineer'],
    entry: 'Gate 0 is signed and the data architecture from step 1.6 is drafted.',
    steps: [
      {
        id: '2.1',
        title: 'Get access and sign the agreements',
        owner: 'data-engineer',
        with: ['data-owner', 'security-engineer', 'risk-compliance', 'forward-deployed-engineer'],
        when: 'Week 3',
        how: [
          'Request access to each source with the purpose stated.',
          'Complete a privacy impact assessment wherever personal data is involved (under GDPR, a data protection impact assessment).',
          'Sign the data contract with each producing team.',
          'Use service accounts with the least privilege that works.',
        ],
        output: 'Access approvals, signed data contracts and the privacy impact assessment.',
        read: ['gov-data', 'ent-data', 'pb-prereqs'],
      },
      {
        id: '2.2',
        title: 'Profile the data',
        owner: 'data-analyst',
        with: ['data-engineer', 'domain-expert'],
        when: 'Weeks 3–4',
        how: [
          'For each table measure row counts, null rates, value ranges, duplicates, time coverage and late-arriving records.',
          'Compare what you find against the business definitions and take every surprise to the domain expert.',
          'Log each quality finding as an issue with an owner.',
        ],
        output: 'Data profiling report and a quality issues log.',
        read: ['features', 'pb-data'],
      },
      {
        id: '2.3',
        title: 'Write the source-to-target mapping',
        owner: 'data-analyst',
        with: ['data-engineer', 'business-analyst'],
        when: 'Week 4',
        how: [
          'For each target field record its source, transformation, business definition and owner.',
          'Reconcile totals against a report the business already trusts.',
        ],
        output: 'Source-to-target mapping that reconciles to a trusted report.',
        read: ['ent-data', 'features'],
      },
      {
        id: '2.4',
        title: 'Define the label and the prediction point',
        owner: 'data-scientist',
        with: ['domain-expert', 'data-analyst', 'product-owner', 'ai-engineer'],
        when: 'Week 4',
        how: [
          'Write precisely what is predicted, at which moment, using only what is known at that moment.',
          'Define the label and how long after the event the truth becomes known.',
          'Note any selection bias, for example outcomes that exist only for cases that were approved.',
          'Have the domain expert approve the definition.',
        ],
        output: 'Label specification approved by the domain expert.',
        read: ['problem', 'xp-data', 'pb-data'],
        note: 'LLM and RAG use cases: build a golden set instead: representative inputs with expected outputs or scoring rubrics, written with the domain expert.',
      },
      {
        id: '2.5',
        title: 'Build the ingestion pipelines',
        owner: 'data-engineer',
        with: ['platform-engineer', 'mlops-engineer'],
        when: 'Weeks 4–6',
        how: [
          'Implement batch, change-data-capture or streaming ingestion as designed. Make every job idempotent and replayable.',
          'Validate the schema at the boundary and quarantine what fails.',
          'Capture lineage, keep pipeline code in version control and run it through CI.',
        ],
        output: 'Ingestion pipelines running in development, with lineage.',
        read: ['blueprint', 'lld', 'ent-data'],
        note: 'RAG use cases: this is the corpus pipeline: collect, clean, chunk, embed and index the documents, with the same replay and lineage rules.',
      },
      {
        id: '2.6',
        title: 'Add automated data-quality gates',
        owner: 'data-engineer',
        with: ['data-analyst', 'mlops-engineer'],
        when: 'Weeks 5–6',
        how: [
          'Implement the checks in the data-quality service level: freshness, completeness, validity, uniqueness and volume.',
          'A failed check blocks everything downstream and alerts the owner.',
          'Publish a data-quality dashboard.',
        ],
        output: 'Automated quality checks that block bad data, and a dashboard.',
        read: ['ent-data', 'metrics'],
      },
      {
        id: '2.7',
        title: 'Build the features, correct as of the prediction time',
        owner: 'data-engineer',
        with: ['data-scientist', 'ml-engineer'],
        when: 'Weeks 5–7',
        how: [
          'Implement the high-signal features the blueprint lists, and leave out the noisy ones it names.',
          'Compute every feature as of the prediction time. Never join in data from the future.',
          'Write each transform once and share it between training and serving.',
          'Review every feature for leakage.',
        ],
        output: 'Feature pipelines and feature definitions, with a test that proves no feature uses future data.',
        read: ['features', 'signal-noise', 'pb-milestones'],
      },
      {
        id: '2.8',
        title: 'Create the training, validation and test datasets',
        owner: 'data-scientist',
        with: ['data-engineer'],
        when: 'Weeks 6–7',
        how: [
          'Split by time (and by entity where one entity has many rows). Do not split at random when time matters.',
          'Hold out the most recent period as the final test set and touch it once.',
          'Record the dataset version, date range, row count and label rate.',
        ],
        output: 'Versioned datasets with a dataset card, reproducible from code.',
        read: ['ev-offline', 'xp-data'],
      },
      {
        id: '2.9',
        title: 'Explore the data and confirm the signal',
        owner: 'data-scientist',
        with: ['data-analyst', 'domain-expert'],
        when: 'Weeks 6–7',
        how: [
          'Check that each expected signal actually separates the outcomes.',
          'Hunt for leakage: any feature that looks too good probably is.',
          'Check coverage for every segment that matters for fairness.',
          'Say whether the target looks reachable. If it does not, stop and take that back to Gate 0.',
        ],
        output: 'Exploration report with signal and leakage findings.',
        read: ['signal-noise', 'features', 'xp-model'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 2 · Data ready',
      signedBy: ['data-owner', 'data-scientist', 'security-engineer'],
      checks: [
        'Access is approved for this purpose and the data contracts are signed.',
        'Quality checks are automated and passing.',
        'The label definition is approved by the domain expert.',
        'A test proves no feature uses information from after the prediction time.',
        'Datasets are versioned and can be rebuilt from code.',
        'The signal is confirmed against the baseline, or the work has gone back to Gate 0.',
      ],
    },
    traps: [
      'A random train/test split on time-dependent data.',
      'A feature filled in after the outcome is known.',
      'A one-off notebook extraction nobody can re-run.',
      'Defining the label without the domain expert.',
      'Different feature code for training and for serving.',
    ],
  },

  /* ============================================================================================ Phase 3 */
  {
    id: 'p3',
    n: 3,
    name: 'Model and application build',
    short: 'Build',
    goal: 'Build a baseline, beat it with a candidate, and turn the result into packaged, reproducible, callable software inside the user’s workflow.',
    weeks: 'Weeks 5–10',
    lead: 'data-scientist',
    accountable: 'ai-architect',
    informed: ['sponsor', 'solution-architect', 'sre-devops-engineer', 'support', 'data-owner', 'data-analyst'],
    entry: 'Gate 1 is signed. Model training starts when Gate 2 is signed; repository and serving work can start earlier.',
    steps: [
      {
        id: '3.1',
        title: 'Set up the repository, CI and experiment tracking',
        owner: 'mlops-engineer',
        with: ['ml-engineer', 'platform-engineer', 'forward-deployed-engineer'],
        when: 'Week 5',
        how: [
          'Create the repository with branch protection and a code-review rule.',
          'Set up the experiment tracker and the model registry.',
          'Run linting, unit tests and data tests on every pull request.',
          'Pin dependencies and seeds so a run can be repeated.',
        ],
        output: 'Repository, CI, experiment tracking and model registry.',
        read: ['mlops', 'mlops-toolchain'],
      },
      {
        id: '3.2',
        title: 'Run the starter kit and build the baseline',
        owner: 'data-scientist',
        with: ['ml-engineer'],
        when: 'Weeks 5–6',
        how: [
          'Check the blueprint’s starter verdict. If the kit is exact or adaptable, run it on its synthetic data to learn the path, then on your own.',
          'Build the simplest thing that could work: rules, a linear model, a seasonal-naive forecast, keyword search or a single prompt.',
          'Evaluate it with the full evaluation protocol.',
        ],
        output: 'Baseline with an evaluation report: the number every later model must beat.',
        read: ['playbook', 'pb-milestones', 'blueprint', 'evaluation'],
      },
      {
        id: '3.3',
        title: 'Build the candidate model',
        owner: 'data-scientist',
        with: ['ml-engineer', 'ai-engineer', 'domain-expert'],
        when: 'Weeks 6–8',
        how: [
          'Train the model family the blueprint recommends. Tune on the validation set only and track every run.',
          'Read the worst mistakes with the domain expert and fix what they reveal in the data or the features.',
          'Stop when another week would not change the decision.',
        ],
        output: 'Candidate model, experiment log and error analysis.',
        read: ['blueprint', 'problem', 'pb-milestones'],
        note: 'LLM, RAG and agent use cases: there may be no training. The loop is: change retrieval, prompt or tool, then re-score against the golden set.',
      },
      {
        id: '3.4',
        title: 'Evaluate, calibrate and set the operating point',
        owner: 'data-scientist',
        with: ['product-owner', 'domain-expert', 'ai-architect'],
        when: 'Week 8',
        how: [
          'Score the untouched test set once and report the metrics with confidence intervals.',
          'Check calibration, and check every slice that matters, including fairness.',
          'Choose the threshold from the cost of a false positive against a false negative. This is the decision owner’s call, not the data scientist’s.',
        ],
        output: 'Evaluation report and an operating point signed by the decision owner.',
        read: ['ev-thresholds', 'ev-offline', 'xp-model'],
      },
      {
        id: '3.5',
        title: 'Package the model and build the training pipeline',
        owner: 'ml-engineer',
        with: ['mlops-engineer', 'data-scientist'],
        when: 'Weeks 7–9',
        how: [
          'Turn the notebooks into one parameterised pipeline: data, features, train, evaluate, register.',
          'Prove that a run from a clean checkout reproduces the candidate’s metrics.',
          'Register the artifact with its version, data hash, code commit and metrics.',
        ],
        output: 'Reproducible training pipeline and a registered model.',
        read: ['mlops', 'lld'],
      },
      {
        id: '3.6',
        title: 'Build the serving path',
        owner: 'ml-engineer',
        with: ['inference-engineer', 'ai-engineer', 'data-engineer'],
        when: 'Weeks 7–9',
        how: [
          'Implement the API contract from the low-level design.',
          'Fetch online features through the same transforms used in training, and check online and offline values match.',
          'Add a timeout and pass the deadline along every hop.',
          'Implement the fallback ladder: cache, simpler model, rules, safe default.',
        ],
        output: 'Inference service running in development, with its fallbacks.',
        read: ['lld', 'sequence', 'hld'],
        note: 'Batch use cases such as forecasting: this is the scheduled scoring job and its output tables, not an online service.',
      },
      {
        id: '3.7',
        title: 'Optimise inference',
        owner: 'inference-engineer',
        with: ['ml-engineer', 'platform-engineer'],
        when: 'Weeks 8–9',
        how: [
          'Measure first: p50, p95, p99, throughput and memory.',
          'Apply batching, quantisation, compilation or different hardware, one change at a time.',
          'Confirm accuracy is unchanged after each optimisation, and compare the cost per decision with the capacity model.',
        ],
        output: 'Performance report: the latency budget is met at the planned cost.',
        read: ['scale', 'hld'],
      },
      {
        id: '3.8',
        title: 'Build the application and the human-in-the-loop',
        owner: 'ai-engineer',
        with: ['business-analyst', 'end-users', 'ml-engineer'],
        when: 'Weeks 8–10',
        how: [
          'Put the output where the user already works: the screen, the queue or the consuming API.',
          'Where a person acts on the output, show the reason and the evidence with it.',
          'Capture overrides and feedback as labelled data for later.',
        ],
        output: 'Application integrated into the workflow, with feedback capture.',
        read: ['agentic', 'disc-process', 'sequence'],
        note: 'Agent use cases: give the agent typed tools with explicit permissions and start at the lowest rung of the autonomy ladder.',
      },
      {
        id: '3.9',
        title: 'Build the evaluation harness and the guardrails',
        owner: 'ai-engineer',
        with: ['data-scientist', 'qa-test-engineer', 'security-engineer'],
        when: 'Weeks 9–10',
        how: [
          'Automate evaluation so it runs in CI on every model, prompt or feature change: regression set, slices and safety cases.',
          'Add input and output guardrails: validation, filters for personal data and, for LLMs, prompt-injection checks.',
          'Set thresholds that block promotion when they are missed.',
        ],
        output: 'Evaluation harness in CI and guardrails in the request path.',
        read: ['evaluation', 'gov-guardrails', 'gov-security'],
      },
      {
        id: '3.10',
        title: 'Write the model card',
        owner: 'data-scientist',
        with: ['ai-architect', 'risk-compliance'],
        when: 'Week 10',
        how: [
          'Document intended use, out-of-scope use, data, metrics by slice, limitations, the operating point and the owner.',
          'Link the dataset version and the training run.',
          'Submit it to model-risk or governance review if the risk tier requires one.',
        ],
        output: 'Model card and, where required, the governance submission.',
        read: ['gov-model', 'gov-rai', 'validation'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 3 · Build complete',
      signedBy: ['ai-architect', 'product-owner', 'data-scientist'],
      checks: [
        'The candidate beats the baseline on the untouched test set by the agreed margin, or the baseline is what ships.',
        'The operating point is approved by the decision owner.',
        'The training pipeline reproduces the metrics from a clean checkout.',
        'Serving meets the latency budget in development.',
        'The fallback ladder is implemented and tested.',
        'The evaluation harness runs in CI.',
        'The model card is complete.',
      ],
    },
    traps: [
      'Skipping the baseline, so nobody knows what the complex model added.',
      'Tuning on the test set.',
      'A model that only runs in a notebook.',
      'A threshold chosen by the data scientist alone.',
      'Reporting only the average metric and never the slices.',
      'No fallback path.',
    ],
  },

  /* ============================================================================================ Phase 4 */
  {
    id: 'p4',
    n: 4,
    name: 'Platform, security and verification',
    short: 'Verify',
    goal: 'Prove, in an environment that resembles production, that the system meets its requirements, is secure, can be observed, and can be rolled back.',
    weeks: 'Weeks 8–12',
    lead: 'qa-test-engineer',
    accountable: 'delivery-lead',
    informed: ['sponsor', 'finance', 'data-analyst', 'data-owner'],
    entry: 'Gate 1 is signed for platform work. Testing of a component starts as soon as it exists; the full run needs Gate 3.',
    steps: [
      {
        id: '4.1',
        title: 'Provision the environments as code',
        owner: 'platform-engineer',
        with: ['sre-devops-engineer', 'security-engineer', 'forward-deployed-engineer'],
        when: 'Weeks 8–9',
        how: [
          'Define network, cluster, storage and identity as infrastructure code.',
          'Make staging mirror the production topology.',
          'Keep secrets in a secrets manager, never in code or configuration files.',
          'Tag resources for cost and set budget alarms.',
        ],
        output: 'Staging and production environments created from code.',
        read: ['ent-technology', 'hld', 'scale'],
      },
      {
        id: '4.2',
        title: 'Build the deployment pipeline',
        owner: 'mlops-engineer',
        with: ['platform-engineer', 'ml-engineer'],
        when: 'Weeks 9–10',
        how: [
          'Chain build, scan, test, deploy to staging and a gated promotion to production.',
          'Version and promote the model and the code together.',
          'Support shadow, canary and a one-command rollback.',
        ],
        output: 'Deployment pipeline with promotion gates and rollback.',
        read: ['mlops', 'mlops-retraining'],
      },
      {
        id: '4.3',
        title: 'Instrument observability',
        owner: 'sre-devops-engineer',
        with: ['mlops-engineer', 'data-engineer', 'ml-engineer'],
        when: 'Weeks 9–11',
        how: [
          'Emit structured logs with a request id, metrics for latency, errors and saturation, and traces across hops.',
          'Log every prediction with its input version, model version and output. Monitoring and audit both depend on it.',
          'Build a dashboard for each layer of the metrics catalogue.',
          'Tie each alert to an SLO, an owner and a runbook.',
        ],
        output: 'Dashboards, alerts and a prediction log.',
        read: ['metrics', 'operations', 'mt-failure-monitors'],
      },
      {
        id: '4.4',
        title: 'Run functional, contract and integration tests',
        owner: 'qa-test-engineer',
        with: ['ml-engineer', 'ai-engineer', 'data-engineer', 'solution-architect'],
        when: 'Weeks 9–11',
        how: [
          'Execute the test strategy and automate the suites into the pipeline.',
          'Run contract tests with every producer and consumer.',
          'Have the solution architect confirm that what was built matches the integration boundaries and targets.',
          'Triage defects daily and keep a regression suite.',
        ],
        output: 'Test report and automated suites.',
        read: ['pb-tests', 'lld', 'disc-requirements'],
      },
      {
        id: '4.5',
        title: 'Load-test and inject faults',
        owner: 'qa-test-engineer',
        with: ['inference-engineer', 'sre-devops-engineer'],
        when: 'Weeks 10–11',
        how: [
          'Load-test at peak plus headroom, then run a soak test.',
          'Take away each dependency in turn and confirm the fallback ladder engages and the alert fires.',
          'Record whether the degraded mode stays inside the SLO.',
        ],
        output: 'Performance and resilience report.',
        read: ['scale', 'edge-cases', 'operations'],
      },
      {
        id: '4.6',
        title: 'Test security and give sign-off',
        owner: 'security-engineer',
        with: ['platform-engineer', 'ai-engineer'],
        when: 'Weeks 10–11',
        how: [
          'Scan dependencies and images.',
          'Run a penetration test or red-team exercise, including prompt injection and data exfiltration for LLM systems.',
          'Verify each control in the threat model against its evidence, and review who has access.',
          'Fix every finding or have it formally accepted by risk and compliance.',
        ],
        output: 'Security test report and sign-off.',
        read: ['gov-security', 'gov-regulatory'],
      },
      {
        id: '4.7',
        title: 'Review responsible AI and compliance',
        owner: 'risk-compliance',
        with: ['data-scientist', 'ai-architect', 'security-engineer'],
        when: 'Week 11',
        how: [
          'Check fairness metrics on the agreed slices against their thresholds.',
          'Check that explanations are adequate for the people affected.',
          'Complete the obligation, control and evidence table, and obtain the approvals the risk tier requires.',
        ],
        output: 'Compliance evidence pack and approvals.',
        read: ['gov-rai', 'gov-regulatory', 'gov-approvals'],
      },
      {
        id: '4.8',
        title: 'Run user acceptance testing',
        owner: 'business-analyst',
        with: ['end-users', 'product-owner', 'qa-test-engineer', 'domain-expert'],
        when: 'Weeks 11–12',
        how: [
          'Have real users, with the domain expert, run real scenarios in staging.',
          'Check the acceptance criteria one by one and collect usability problems.',
          'The product owner signs acceptance.',
        ],
        output: 'Acceptance test report signed by the product owner.',
        read: ['disc-requirements', 'disc-stakeholders'],
      },
      {
        id: '4.9',
        title: 'Write the runbooks and train support',
        owner: 'sre-devops-engineer',
        with: ['support', 'mlops-engineer', 'ml-engineer'],
        when: 'Weeks 11–12',
        how: [
          'Write one runbook per failure scenario: how it is detected, who is alerted, how to mitigate, how to recover.',
          'Set the on-call rota and the escalation path.',
          'Train first- and second-line support: what the system does, known issues, how to escalate.',
          'Rehearse with a game day.',
        ],
        output: 'Runbooks, on-call rota and trained support.',
        read: ['operations', 'edge-cases'],
      },
      {
        id: '4.10',
        title: 'Rehearse rollback and disaster recovery',
        owner: 'sre-devops-engineer',
        with: ['mlops-engineer', 'platform-engineer'],
        when: 'Week 12',
        how: [
          'Roll staging back to the previous version through the real rollback path and time it.',
          'Restore from backup and compare against the recovery objectives.',
          'Record both results.',
        ],
        output: 'Rollback and recovery rehearsal record, with timings.',
        read: ['mlops-retraining', 'operations', 'ent-nfr'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 4 · Ready for release',
      signedBy: ['qa-test-engineer', 'security-engineer', 'sre-devops-engineer', 'product-owner'],
      checks: [
        'Every acceptance criterion passes.',
        'No critical or high defect or vulnerability is open.',
        'The load test meets the non-functional targets at peak.',
        'Every failure scenario has an alert and a runbook, and has been exercised.',
        'Rollback has been rehearsed and timed.',
        'User acceptance is signed.',
        'The compliance approvals are in hand.',
      ],
    },
    traps: [
      'A staging environment that does not resemble production.',
      'Testing only the happy path.',
      'Alerts with no owner.',
      '“We will write the runbooks after go-live.”',
      'A rollback nobody has ever run.',
    ],
  },

  /* ============================================================================================ Phase 5 */
  {
    id: 'p5',
    n: 5,
    name: 'Release and deployment',
    short: 'Release',
    goal: 'Put the system in front of real traffic gradually, prove the business effect with a planned experiment, and hand a working service to operations.',
    weeks: 'Weeks 12–14, with hypercare to week 16',
    lead: 'mlops-engineer',
    accountable: 'product-owner',
    informed: ['data-owner', 'data-engineer', 'inference-engineer', 'ai-engineer', 'domain-expert'],
    entry: 'Gate 4 is signed.',
    steps: [
      {
        id: '5.1',
        title: 'Prepare the business change',
        owner: 'business-analyst',
        with: ['product-owner', 'end-users', 'support', 'forward-deployed-engineer'],
        when: 'Week 12',
        how: [
          'Train the users and update the procedures and policies that change.',
          'Send the communication: what changes, when, and who to call.',
          'Define the hypercare period and who is in it.',
        ],
        output: 'Users trained, communication sent, procedures updated.',
        read: ['disc-process', 'ent-operating'],
      },
      {
        id: '5.2',
        title: 'Plan the cut-over and the experiment',
        owner: 'mlops-engineer',
        with: ['data-scientist', 'solution-architect', 'product-owner'],
        when: 'Week 12',
        how: [
          'Take the rollout design for this kind of system from the blueprint’s statistical validation section.',
          'Fix the success metric, the guardrail metrics and the stopping rules before the first user is exposed.',
          'Size the sample and the duration from the power calculation.',
          'Plan how the new path coexists with the legacy one, and have the solution architect approve it.',
        ],
        output: 'Rollout and experiment plan, written before any traffic moves.',
        read: ['ev-online', 'xp-design', 'xp-metrics'],
      },
      {
        id: '5.3',
        title: 'Hold the go/no-go review',
        owner: 'product-owner',
        with: [
          'sponsor',
          'ai-architect',
          'sre-devops-engineer',
          'security-engineer',
          'qa-test-engineer',
          'mlops-engineer',
          'risk-compliance',
        ],
        when: 'Week 12',
        how: [
          'Walk the Gate 4 evidence. Each signer says go or no-go and why.',
          'Confirm who decides a rollback and on which criteria.',
          'Raise the change request through your organisation’s change process.',
        ],
        output: 'Recorded go/no-go decision and an approved change request.',
        read: ['gov-approvals', 'validation'],
      },
      {
        id: '5.4',
        title: 'Deploy to production with no user impact',
        owner: 'mlops-engineer',
        with: ['platform-engineer', 'sre-devops-engineer', 'ml-engineer'],
        when: 'Week 12',
        how: [
          'Deploy the signed artifact handed over by the ML engineer, with traffic off or behind a flag.',
          'Run smoke tests in production.',
          'Confirm dashboards, alerts and logs are receiving data.',
        ],
        output: 'Production deployment verified, with users still on the old path.',
        read: ['mlops', 'operations'],
      },
      {
        id: '5.5',
        title: 'Run in shadow',
        owner: 'mlops-engineer',
        with: ['data-scientist', 'sre-devops-engineer'],
        when: 'Weeks 12–13',
        how: [
          'Score real traffic without acting on the result.',
          'Compare with the legacy decisions and the offline expectation: score distribution, latency, errors, and online against offline feature values.',
          'Cover at least one full business cycle.',
        ],
        output: 'Shadow report: production behaves as offline evaluation predicted.',
        read: ['xp-design', 'pb-milestones', 'metrics'],
      },
      {
        id: '5.6',
        title: 'Canary, then ramp',
        owner: 'mlops-engineer',
        with: ['sre-devops-engineer', 'product-owner', 'data-scientist'],
        when: 'Weeks 13–14',
        how: [
          'Let a small share of traffic act on the model and watch the guardrails.',
          'Increase in steps (for example 1%, 5%, 25%, 50%, 100%) and only when the stopping rules allow.',
          'Roll back automatically on a guardrail breach.',
        ],
        output: 'Ramp log with the decision taken at each step.',
        read: ['xp-metrics', 'mlops-retraining', 'operations'],
        note: 'Batch use cases: the equivalent is shadow runs, then a holdout group that keeps the old plan while the rest use the new one.',
      },
      {
        id: '5.7',
        title: 'Measure the business effect',
        owner: 'data-scientist',
        with: ['data-analyst', 'product-owner', 'finance'],
        when: 'Weeks 13–16, once labels mature',
        how: [
          'Analyse the experiment exactly as planned: the effect on the north-star metric against control, with its confidence interval.',
          'Check the guardrails and the slices.',
          'Wait for the labels to mature before declaring a result, and report it honestly, including a null result.',
        ],
        output: 'Experiment readout.',
        read: ['xp-value', 'xp-metrics', 'metrics'],
      },
      {
        id: '5.8',
        title: 'Run hypercare and hand over to operations',
        owner: 'sre-devops-engineer',
        with: ['support', 'mlops-engineer', 'delivery-lead'],
        when: 'Weeks 14–16',
        how: [
          'Review the service every day for the first two to four weeks and triage issues the same day.',
          'Hand over runbooks, dashboards, contacts and known issues.',
          'Operations formally accepts the service.',
        ],
        output: 'Handover record: the service is accepted by operations.',
        read: ['pb-30', 'operations'],
      },
      {
        id: '5.9',
        title: 'Close the release',
        owner: 'delivery-lead',
        with: ['sponsor', 'product-owner', 'mlops-engineer'],
        when: 'Week 16',
        how: [
          'Publish release notes.',
          'Archive the release evidence: versions of code, data and model, test results and approvals.',
          'Hold a retrospective and move its actions, and the open risks, into the backlog.',
        ],
        output: 'Release record and retrospective actions.',
        read: ['validation', 'mlops'],
      },
    ],
    gate: {
      convenedBy: 'delivery-lead',
      name: 'Gate 5 · Live and accepted',
      signedBy: ['product-owner', 'sre-devops-engineer', 'sponsor'],
      checks: [
        'The planned share of traffic has been served inside the SLO for the agreed period.',
        'No guardrail metric was breached.',
        'The experiment readout is delivered.',
        'Rollback stayed available throughout the ramp.',
        'Operations has accepted the handover.',
        'The release evidence is archived.',
      ],
    },
    traps: [
      'A big-bang release to everyone at once.',
      'Declaring success before the labels have matured.',
      'Changing the success metric after seeing the data.',
      'Nobody owns the rollback decision.',
      'Skipping user training.',
    ],
  },

  /* ============================================================================================ Phase 6 */
  {
    id: 'p6',
    n: 6,
    name: 'Operate, monitor and improve',
    short: 'Operate',
    goal: 'Keep the service reliable, the model accurate, the cost under control and the benefit visible, for as long as the system runs.',
    weeks: 'From week 14, continuously',
    lead: 'sre-devops-engineer',
    accountable: 'product-owner',
    informed: ['solution-architect', 'data-owner', 'delivery-lead', 'domain-expert'],
    entry: 'Gate 5 is signed. This phase does not end: it repeats until the system is retired.',
    steps: [
      {
        id: '6.1',
        title: 'Watch service health',
        owner: 'sre-devops-engineer',
        with: ['platform-engineer', 'support', 'forward-deployed-engineer'],
        when: 'Continuously, reviewed daily',
        how: [
          'Track the indicators against their SLOs and the remaining error budget.',
          'On-call responds by severity, following the runbook.',
          'Review capacity against growth, and keep the platform patched.',
        ],
        output: 'SLO report.',
        read: ['operations', 'metrics'],
      },
      {
        id: '6.2',
        title: 'Monitor data quality and drift',
        owner: 'mlops-engineer',
        with: ['data-engineer', 'data-scientist'],
        when: 'Every pipeline run, reviewed daily',
        how: [
          'Check input schema, freshness, volume and null rates on every run.',
          'Compare feature and prediction distributions with the training data.',
          'Receive upstream change notices through the data contracts and handle schema changes and backfills without touching live keys.',
        ],
        output: 'Drift and data-quality dashboard with alerts.',
        read: ['metrics', 'mt-failure-monitors', 'mlops'],
      },
      {
        id: '6.3',
        title: 'Monitor model performance',
        owner: 'data-scientist',
        with: ['mlops-engineer', 'data-analyst'],
        when: 'As labels mature, reviewed weekly',
        how: [
          'Once labels arrive, compare the live metric with the offline expectation. Use proxy metrics until then.',
          'Check slices, fairness and calibration.',
          'Watch the human override rate: a rising rate means users have stopped trusting the output.',
        ],
        output: 'Weekly model performance review.',
        read: ['ev-continuous', 'metrics', 'xp-model'],
      },
      {
        id: '6.4',
        title: 'Track business value and adoption',
        owner: 'business-analyst',
        with: ['data-analyst', 'product-owner', 'finance'],
        when: 'Monthly, with a quarterly value review',
        how: [
          'Report the north-star metric and its drivers against the Phase 0 baseline.',
          'Report adoption: is the system used, ignored or overridden?',
          'Compare the realised benefit with the business case.',
        ],
        output: 'Benefit report against the baseline.',
        read: ['disc-case', 'xp-value', 'metrics'],
      },
      {
        id: '6.5',
        title: 'Control the cost',
        owner: 'inference-engineer',
        with: ['platform-engineer', 'finance'],
        when: 'Monthly',
        how: [
          'Compare the unit cost per decision with the capacity model.',
          'Right-size as traffic changes. For LLM systems watch token spend.',
          'Keep budget alerts active.',
        ],
        output: 'Cost report and optimisation actions.',
        read: ['scale', 'operations'],
      },
      {
        id: '6.6',
        title: 'Handle incidents and learn from them',
        owner: 'sre-devops-engineer',
        with: ['support', 'product-owner', 'qa-test-engineer', 'ml-engineer'],
        when: 'Whenever an alert fires',
        how: [
          'Classify the severity, follow the runbook and tell the people affected.',
          'Mitigate first (fall back or roll back), then fix.',
          'Hold a blameless review within five working days.',
          'Add a regression test for every incident and update the runbook.',
        ],
        output: 'Incident record and review actions.',
        read: ['operations', 'edge-cases'],
      },
      {
        id: '6.7',
        title: 'Retrain, challenge and roll back',
        owner: 'mlops-engineer',
        with: ['data-scientist', 'ml-engineer', 'ai-engineer', 'ai-architect'],
        when: 'On a trigger: drift, a performance drop, a schedule or a data change',
        how: [
          'The trigger starts the training pipeline.',
          'Evaluate the challenger against the champion with the same protocol as the first release.',
          'Promote through the same gates (shadow, canary) and roll back on regression.',
          'Have the AI architect check drift findings against the original design assumptions.',
        ],
        output: 'Retraining record: a new champion, or a documented rejection.',
        read: ['mlops-retraining', 'ev-continuous', 'mlops'],
        note: 'LLM systems: prompts, indexes and tool contracts are release artifacts too. A change to any of them goes through the same evaluation and promotion.',
      },
      {
        id: '6.8',
        title: 'Keep security and compliance current',
        owner: 'security-engineer',
        with: ['risk-compliance', 'platform-engineer'],
        when: 'Continuous scanning, quarterly access review, periodic model review',
        how: [
          'Patch, and manage vulnerabilities as they are found.',
          'Review access every quarter.',
          'Repeat the model validation at the interval the risk tier requires, and keep the audit evidence current.',
        ],
        output: 'Compliance evidence log.',
        read: ['governance', 'gov-regulatory'],
      },
      {
        id: '6.9',
        title: 'Collect feedback and manage the backlog',
        owner: 'product-owner',
        with: ['end-users', 'support', 'business-analyst'],
        when: 'Every sprint',
        how: [
          'Turn user feedback and support tickets into backlog items.',
          'Prioritise against value.',
          'Take each change back through the phases at a depth that matches its risk.',
        ],
        output: 'Prioritised backlog.',
        read: ['role-lenses', 'disc-requirements'],
      },
      {
        id: '6.10',
        title: 'Review the service: continue, change or retire',
        owner: 'product-owner',
        with: ['sponsor', 'ai-architect', 'finance'],
        when: 'Quarterly',
        how: [
          'Review value, cost, risk and incidents together.',
          'Check that the design assumptions still hold, using “what would change it” in the decision matrix.',
          'Decide: continue, invest, re-scope or decommission.',
          'If retiring: settle data retention, archive the model and tell the users.',
        ],
        output: 'Quarterly service review decision.',
        read: ['ent-decision', 'disc-case', 'validation'],
      },
    ],
    gate: {
      convenedBy: 'product-owner',
      name: 'Gate 6 · Quarterly service review',
      signedBy: ['product-owner', 'sponsor'],
      checks: [
        'The SLOs were met, or the error-budget policy was applied.',
        'Model performance is inside the agreed band, or a retrain has been done.',
        'The realised benefit is reported against the baseline.',
        'Incidents are reviewed and their actions closed.',
        'Cost is inside the budget.',
        'The compliance evidence is current.',
      ],
    },
    traps: [
      'Monitoring uptime only. A model can be up, fast and wrong.',
      'No way for the true outcomes to flow back, so performance is never measured.',
      'Automatic retraining with no evaluation gate.',
      'So many alerts that people stop reading them.',
      'Nobody owns the model once the project team has moved on.',
    ],
  },
];

/* ---------------------------------------------------------------------------------- derived: RACI and lists */

export type Raci = 'A' | 'R' | 'A/R' | 'C' | 'I' | '';

/**
 * R: owns at least one step in the phase. A: the phase's accountable party. C: takes part in a step, or calls or signs the gate.
 * I: on the phase's informed list. Derived, so the matrix cannot disagree with the steps.
 */
export function raciFor(phase: DeliveryPhase, party: PartyId): Raci {
  const owns = phase.steps.some((s) => s.owner === party);
  if (phase.accountable === party) return owns ? 'A/R' : 'A';
  if (owns) return 'R';
  if (
    phase.steps.some((s) => s.with.includes(party)) ||
    phase.gate.signedBy.includes(party) ||
    phase.gate.convenedBy === party
  )
    return 'C';
  if (phase.informed.includes(party)) return 'I';
  return '';
}

export const ALL_STEPS: DeliveryStep[] = DELIVERY_PHASES.flatMap((p) => p.steps);
export const stepInvolves = (s: DeliveryStep, party: PartyId) => s.owner === party || s.with.includes(party);

/* -------------------------------------------------------------------------------------- how to use the guide */

export const HOW_TO_USE: { title: string; body: string }[] = [
  {
    title: 'Pick a use case',
    body: 'Choose a domain, then follow its “Start here” path, a track or search. Take the blueprint closest to your problem, not the most impressive one.',
  },
  {
    title: 'Read its blueprint once',
    body: 'Top to bottom, in Pure Signal mode if time is short. The blueprint is the worked answer for that use case; this guide is the order to do the work in.',
  },
  {
    title: 'Work through the phases in order',
    body: 'Select your use case at the top of the guide and every step links to the exact blueprint section to read. Tick steps off as you finish them.',
  },
  {
    title: 'Replace proposals with your own facts',
    body: 'Blueprint content is a generated starting point unless its Validation section records a review. Every number, system name and threshold is a proposal to confirm.',
  },
  {
    title: 'Do not pass a gate without its evidence',
    body: 'Each phase ends in a gate with named signers. A gate lists things that must exist, not things you intend to do.',
  },
  {
    title: 'Keep running Phase 6',
    body: 'Go-live is the middle of the work. Monitoring, retraining and the quarterly review continue until the system is retired.',
  },
];

/* ------------------------------------------------------------------------------------------- meeting rhythm */

export const RHYTHM: { meeting: string; when: string; who: string; purpose: string }[] = [
  {
    meeting: 'Daily stand-up',
    when: 'Every working day, 15 minutes, Phases 1–5',
    who: 'The delivery team',
    purpose: 'What moved, what is blocked, who helps.',
  },
  {
    meeting: 'Weekly delivery and risk review',
    when: 'Weekly, all phases up to handover',
    who: 'Delivery lead, product owner and the lead of each active phase',
    purpose: 'Progress against the plan, the top risks and decisions needed this week.',
  },
  {
    meeting: 'Demo',
    when: 'Every two weeks from Phase 2',
    who: 'The team, product owner, end users and domain expert',
    purpose: 'Show working results and collect corrections early.',
  },
  {
    meeting: 'Gate review',
    when: 'At the end of every phase',
    who: 'The gate’s signers, called by the delivery lead',
    purpose: 'Check the evidence on the gate’s list and sign, or record what is missing.',
  },
  {
    meeting: 'Steering meeting',
    when: 'Monthly',
    who: 'Sponsor, product owner, delivery lead, finance',
    purpose: 'Budget, scope changes and escalations.',
  },
  {
    meeting: 'Architecture review',
    when: 'End of Phase 1, and on any significant design change',
    who: 'Solution architect, AI architect, security engineer, platform engineer',
    purpose: 'Approve the design and record the decisions.',
  },
  {
    meeting: 'Go/no-go review',
    when: 'Phase 5, before production traffic',
    who: 'Product owner, sponsor, SRE, security, QA, MLOps, risk and compliance',
    purpose: 'Decide the release on the Gate 4 evidence, and confirm who can order a rollback.',
  },
  {
    meeting: 'Hypercare review',
    when: 'Daily for the first two to four weeks live',
    who: 'SRE, MLOps, support, product owner',
    purpose: 'Catch and fix early problems quickly.',
  },
  {
    meeting: 'Model performance review',
    when: 'Weekly in Phase 6',
    who: 'Data scientist, MLOps engineer, data analyst',
    purpose: 'Live metrics, drift, slices and whether a retrain is justified.',
  },
  {
    meeting: 'Operations and cost review',
    when: 'Monthly in Phase 6',
    who: 'SRE, platform engineer, inference engineer, finance',
    purpose: 'SLOs, the error budget, capacity and spend.',
  },
  {
    meeting: 'Post-incident review',
    when: 'Within five working days of an incident',
    who: 'Everyone involved, led by SRE',
    purpose: 'Blameless account of what happened, and actions that prevent a repeat.',
  },
  {
    meeting: 'Service and value review',
    when: 'Quarterly in Phase 6',
    who: 'Product owner, sponsor, AI architect, finance',
    purpose: 'Gate 6: continue, invest, re-scope or retire.',
  },
];

/* ----------------------------------------------------------------------------------------------- monitoring */

export const MONITORING: {
  layer: string;
  watch: string;
  owner: PartyId;
  cadence: string;
  action: string;
}[] = [
  {
    layer: 'Service health',
    watch: 'Latency (p50, p95, p99), error rate, availability, saturation, fallback rate',
    owner: 'sre-devops-engineer',
    cadence: 'Continuous, with paging',
    action: 'Follow the runbook: fall back, scale or roll back.',
  },
  {
    layer: 'Data quality',
    watch: 'Freshness, volume, schema, null rates, late-arriving records',
    owner: 'data-engineer',
    cadence: 'Every pipeline run',
    action: 'Quarantine the batch, backfill, and notify the producing team through the data contract.',
  },
  {
    layer: 'Drift',
    watch: 'Feature distributions and prediction distributions against the training data',
    owner: 'mlops-engineer',
    cadence: 'Daily',
    action: 'Investigate the cause, then start a retraining evaluation if it is real.',
  },
  {
    layer: 'Model quality',
    watch: 'The live metric once labels mature, calibration, gaps between slices, human override rate',
    owner: 'data-scientist',
    cadence: 'Weekly, as labels arrive',
    action: 'Recalibrate, retrain, or change the threshold with the decision owner.',
  },
  {
    layer: 'Business value',
    watch: 'The north-star metric, its drivers and adoption, against the Phase 0 baseline',
    owner: 'business-analyst',
    cadence: 'Monthly',
    action: 'Change the process or the priorities, and report the realised benefit.',
  },
  {
    layer: 'Cost',
    watch: 'Cost per decision, spend against budget, token spend for LLM systems',
    owner: 'inference-engineer',
    cadence: 'Monthly, with budget alerts',
    action: 'Right-size, cache, batch or move to a cheaper model.',
  },
  {
    layer: 'Security and compliance',
    watch: 'Access anomalies, vulnerabilities, guardrail hits, age of the audit evidence',
    owner: 'security-engineer',
    cadence: 'Continuous scanning, quarterly review',
    action: 'Patch, revoke access or open a security incident.',
  },
];

/* --------------------------------------------------------------------------------------- adapting the guide */

export const TEAM_SHAPES: { name: string; who: string; how: string }[] = [
  {
    name: 'On your own (learning or a portfolio project)',
    who: 'You hold every role.',
    how: 'Use the blueprint’s synthetic starter kit as your data. Keep Phase 0 to one page but do not skip it. Treat each gate as a self-review checklist and write the evidence down anyway: that write-up is what you show people.',
  },
  {
    name: 'A small team (three to five people)',
    who: 'Four hats: product (business analyst, product owner), data (data analyst, data engineer), model (data scientist, ML engineer, AI engineer) and platform (MLOps, platform, SRE, inference). Security and QA are named people, even if part-time.',
    how: 'Use the combined role lens on the blueprint to see everything one hat covers. Run every phase, with lighter documents. This is the team the 16-week reference plan assumes.',
  },
  {
    name: 'A full programme (ten people or more)',
    who: 'One named person per role, and every partner formally engaged.',
    how: 'Run the phases as written, with formal gate reviews and the full meeting rhythm.',
  },
];

export const TEAM_RULE =
  'Whatever the size: one person may hold several roles, but nobody signs a gate for their own work. The reviewer is always someone else.';

export const VARIANTS: { kind: string; changes: string }[] = [
  {
    kind: 'Scoring models on tabular, graph or anomaly data',
    changes: 'The guide applies as written. The effort concentrates on labels, features that are correct as of the prediction time, and the operating point.',
  },
  {
    kind: 'Forecasting and other batch systems',
    changes: 'There is no online serving path: step 3.6 builds a scheduled job. Evaluate with a rolling-origin backtest. Release with shadow runs and a holdout rather than a canary. Monitor forecast error once the actual values arrive.',
  },
  {
    kind: 'Recommenders and ranking',
    changes: 'Offline metrics only narrow the choice; the decision comes from an online experiment. Plan for feedback loops and position bias in Phase 2, and log what was shown as well as what was clicked.',
  },
  {
    kind: 'LLM, RAG and agents',
    changes: 'Phase 2 builds the corpus, the index and a golden evaluation set. Phase 3 may involve no training: you iterate on retrieval, prompts and tools against the golden set. The evaluation harness and guardrails (step 3.9) carry most of the risk. Monitor groundedness, refusals and token cost, and raise agent autonomy one rung at a time.',
  },
  {
    kind: 'Computer vision and language models that need labelling',
    changes: 'Add annotation guidelines, a labelling budget and an agreement check between annotators to Phase 2. Label quality is usually the ceiling on model quality.',
  },
  {
    kind: 'Bandits and reinforcement learning',
    changes: 'Design the exploration policy and its safety limits in Phase 1. Evaluate on logged data (replay or off-policy estimation) before any live traffic, then ramp with tight guardrails.',
  },
  {
    kind: 'Optimisation and planning with a solver',
    changes: 'The “model” is the formulation: objective and constraints. Validate that every constraint holds and compare solution quality with the current plan. There is no retraining; instead decide how often to re-solve and what triggers it.',
  },
];

/* ------------------------------------------------------------------- evaluation, guardrails, governance: an index */

/**
 * The concerns people ask about by name ("is evaluation covered? guardrails? governance?"), each with the steps that deal
 * with it and the blueprint sections that hold the detail. An index over the steps above: it adds no new obligations.
 */
export const ASSURANCE: { concern: string; question: string; steps: string[]; read: BlueprintAnchor[] }[] = [
  {
    concern: 'Evaluation',
    question: 'Does it work, and how do we know?',
    steps: ['2.8', '3.2', '3.4', '3.9', '5.5', '5.7', '6.3'],
    read: ['evaluation', 'ev-thresholds', 'ev-online', 'experimentation', 'metrics'],
  },
  {
    concern: 'Guardrails',
    question: 'What must it never do, and what stops it?',
    steps: ['1.4', '3.6', '3.8', '3.9', '4.5', '5.6'],
    read: ['gov-guardrails', 'agentic', 'edge-cases'],
  },
  {
    concern: 'Governance and approvals',
    question: 'Who allowed this, and on what evidence?',
    steps: ['0.7', '1.11', '3.10', '4.7', '5.3', '6.8', '6.10'],
    read: ['governance', 'gov-approvals', 'gov-model', 'gov-regulatory', 'validation'],
  },
  {
    concern: 'Responsible AI',
    question: 'Is it fair, explainable and overseen by people?',
    steps: ['1.3', '2.9', '3.4', '4.7', '6.3'],
    read: ['gov-rai', 'xp-model', 'ent-decision'],
  },
  {
    concern: 'Security',
    question: 'How could it be attacked or misused, and what prevents that?',
    steps: ['0.7', '1.7', '4.1', '4.6', '6.8'],
    read: ['gov-security', 'ent-technology', 'gov-guardrails'],
  },
  {
    concern: 'Privacy and data',
    question: 'May we use this data, and is it fit to use?',
    steps: ['0.7', '1.6', '2.1', '2.6'],
    read: ['gov-data', 'ent-data', 'xp-data'],
  },
  {
    concern: 'Monitoring',
    question: 'How will we know when it stops working?',
    steps: ['1.9', '4.3', '6.1', '6.2', '6.3'],
    read: ['metrics', 'mt-failure-monitors', 'operations', 'ev-continuous'],
  },
  {
    concern: 'Reliability and rollback',
    question: 'What happens when something fails?',
    steps: ['1.4', '4.5', '4.9', '4.10', '5.6', '6.6'],
    read: ['operations', 'mlops-retraining', 'edge-cases'],
  },
  {
    concern: 'Cost',
    question: 'What does a decision cost, and is it worth it?',
    steps: ['1.8', '3.7', '6.5'],
    read: ['scale', 'disc-case'],
  },
];

/* -------------------------------------------------------------------------------- frameworks and regulations */

export const FRAMEWORK_NOTE =
  'A reading map, not legal advice. Which of these apply to your system, and how, is settled with risk and compliance in step 0.7. Article numbers and item names refer to the published texts named here; check the current version before relying on them.';

export const FRAMEWORKS: {
  id: string;
  name: string;
  kind: string;
  asks: string;
  steps: string[];
  read: BlueprintAnchor[];
}[] = [
  {
    id: 'eu-ai-act',
    name: 'EU AI Act (Regulation (EU) 2024/1689)',
    kind: 'Law. Applies when a system is placed on the EU market or its output is used in the EU.',
    asks: 'Classify the system by risk. A high-risk system needs a risk management system, data governance, technical documentation, logging, information for those who deploy it, human oversight, and accuracy, robustness and cybersecurity (Articles 9 to 15). Systems that talk to people or generate content carry transparency duties (Article 50).',
    steps: ['0.7', '1.3', '1.7', '3.10', '4.7', '6.8'],
    read: ['governance', 'gov-guardrails', 'gov-rai', 'gov-model', 'gov-regulatory'],
  },
  {
    id: 'nist-ai-rmf',
    name: 'NIST AI Risk Management Framework 1.0',
    kind: 'Voluntary framework, widely used as a common language for AI risk.',
    asks: 'Four functions. Govern: policies, roles and accountability. Map: context, intended use and who is affected. Measure: test and track the risks. Manage: prioritise, respond and keep monitoring. Its Generative AI Profile adds the risks specific to LLM systems.',
    steps: ['0.6', '0.7', '0.9', '3.4', '4.7', '6.3', '6.10'],
    read: ['ent-decision', 'governance', 'evaluation', 'metrics'],
  },
  {
    id: 'iso-42001',
    name: 'ISO/IEC 42001:2023',
    kind: 'Management-system standard an organisation can be certified against.',
    asks: 'Run AI through a management system: an AI policy, defined roles, risk and impact assessment, controls across the lifecycle, internal audit, management review and continual improvement.',
    steps: ['0.9', '1.11', '3.10', '5.9', '6.8', '6.10'],
    read: ['gov-model', 'gov-approvals', 'mlops', 'validation'],
  },
  {
    id: 'gdpr-dpia',
    name: 'GDPR data protection impact assessment (Article 35)',
    kind: 'Law. Applies when personal data of people in the EU is processed.',
    asks: 'Before processing that is likely to put people at high risk, describe the processing, assess whether it is necessary and what could go wrong for the people concerned, and record the measures that reduce those risks.',
    steps: ['0.7', '2.1', '4.7'],
    read: ['gov-data', 'ent-data', 'gov-regulatory'],
  },
  {
    id: 'owasp-llm',
    name: 'OWASP Top 10 for LLM Applications (2025)',
    kind: 'Community security list. For any system with a language model or agent.',
    asks: 'Ten risks to design and test against, itemised in the next table.',
    steps: ['1.7', '3.9', '4.6'],
    read: ['gov-security', 'gov-guardrails', 'agentic'],
  },
];

/** The ten OWASP items, each with the control this guide and the blueprints use against it. */
export const OWASP_LLM: { id: string; risk: string; control: string; steps: string[] }[] = [
  {
    id: 'LLM01',
    risk: 'Prompt injection',
    control: 'Treat retrieved text and tool output as untrusted data, keep tools typed and narrow, and replay planted-instruction attacks on every release.',
    steps: ['1.7', '3.9', '4.6'],
  },
  {
    id: 'LLM02',
    risk: 'Sensitive information disclosure',
    control: 'Mask personal data in tool results, logs and traces, scope caches to the caller, and filter outputs.',
    steps: ['0.7', '3.9'],
  },
  {
    id: 'LLM03',
    risk: 'Supply chain',
    control: 'Pin and scan base models and dependencies, sign artifacts and keep a bill of materials.',
    steps: ['4.2', '4.6'],
  },
  {
    id: 'LLM04',
    risk: 'Data and model poisoning',
    control: 'Record provenance for datasets and documents, validate at ingestion, audit labels and keep a holdout the pipeline cannot write to.',
    steps: ['2.5', '2.6', '2.8'],
  },
  {
    id: 'LLM05',
    risk: 'Improper output handling',
    control: 'Validate model output against a schema before anything downstream uses it, and never execute it directly.',
    steps: ['1.5', '3.9'],
  },
  {
    id: 'LLM06',
    risk: 'Excessive agency',
    control: 'Least-privilege tools, approval for every write action, and an autonomy ladder climbed one gate at a time.',
    steps: ['1.3', '3.8'],
  },
  {
    id: 'LLM07',
    risk: 'System prompt leakage',
    control: 'Keep secrets and authorisation rules out of prompts; enforce permissions in code, where a leaked prompt changes nothing.',
    steps: ['1.7', '3.9'],
  },
  {
    id: 'LLM08',
    risk: 'Vector and embedding weaknesses',
    control: 'Filter retrieval by tenant and permission, version the index with its embedding model, and validate what is ingested.',
    steps: ['2.5', '3.6'],
  },
  {
    id: 'LLM09',
    risk: 'Misinformation',
    control: 'Check that answers are grounded in cited sources, abstain or escalate when they are not, and score against a golden set.',
    steps: ['2.4', '3.4', '3.9'],
  },
  {
    id: 'LLM10',
    risk: 'Unbounded consumption',
    control: 'Budgets for steps, tokens and cost enforced outside the model, with rate limits and spend alerts.',
    steps: ['3.8', '6.5'],
  },
];

/* ------------------------------------------------------------------------------------------------- templates */

export interface DeliveryTemplateMeta {
  code: string;
  phaseId: PhaseId;
  title: string;
  ownerRole: RoleId | PartnerId;
  file: string;
  description: string;
}

export const DELIVERY_TEMPLATES: DeliveryTemplateMeta[] = [
  {
    code: 'BS-TMPL-SCOPE-01',
    phaseId: 'p0',
    title: 'Client Discovery Questionnaire',
    ownerRole: 'business-analyst',
    file: 'delivery/templates/phase-0-scope/01-client-discovery-questionnaire.md',
    description:
      '40-point standardized client interview questionnaire covering business context, decision cadence, stakeholders, and latency expectations.',
  },
  {
    code: 'BS-TMPL-SCOPE-02',
    phaseId: 'p0',
    title: 'Business Requirements Document (BRD)',
    ownerRole: 'business-analyst',
    file: 'delivery/templates/phase-0-scope/02-business-requirements-document.md',
    description:
      'Production-grade BRD template with problem formulation, user stories, numerical targets, and acceptance criteria.',
  },
  {
    code: 'BS-TMPL-SCOPE-03',
    phaseId: 'p0',
    title: 'Stakeholder Interview Guide',
    ownerRole: 'business-analyst',
    file: 'delivery/templates/phase-0-scope/03-stakeholder-interview-guide.md',
    description:
      'Role-specific interview scripts for Sponsors, Operators, Risk Officers, and Engineers.',
  },
  {
    code: 'BS-TMPL-SCOPE-04',
    phaseId: 'p0',
    title: 'Process Mapping AS-IS vs TO-BE',
    ownerRole: 'solution-architect',
    file: 'delivery/templates/phase-0-scope/04-process-mapping-as-is-to-be.md',
    description:
      'Framework for mapping current manual workflows to AI-augmented workflows with quantitative cycle times.',
  },
  {
    code: 'BS-TMPL-SCOPE-05',
    phaseId: 'p0',
    title: 'Requirements Traceability Matrix (RTM)',
    ownerRole: 'solution-architect',
    file: 'delivery/templates/phase-0-scope/05-requirements-traceability-matrix.md',
    description:
      'Matrix linking business objectives to ML metrics, system NFRs, implementation artifacts, and test cases.',
  },
  {
    code: 'BS-TMPL-SCOPE-06',
    phaseId: 'p0',
    title: 'KPI Baseline & Financial ROI Workbook',
    ownerRole: 'finance',
    file: 'delivery/templates/phase-0-scope/06-kpi-baseline-roi-workbook.md',
    description:
      'Financial model calculating cost of false positives vs false negatives, payback period, and 3-year net ROI.',
  },
  {
    code: 'BS-TMPL-SCOPE-07',
    phaseId: 'p0',
    title: 'Data Access & Security Pre-Flight Checklist',
    ownerRole: 'risk-compliance',
    file: 'delivery/templates/phase-0-scope/07-data-access-security-checklist.md',
    description:
      'Pre-flight checklist for data governance, PII identification, IAM access, and environment boundaries.',
  },
  {
    code: 'BS-TMPL-SCOPE-08',
    phaseId: 'p0',
    title: 'AI Suitability Assessment Framework',
    ownerRole: 'data-scientist',
    file: 'delivery/templates/phase-0-scope/08-ai-suitability-assessment.md',
    description:
      'Decision tree and scoring matrix proving AI/ML necessity versus deterministic rules, heuristics, or solvers.',
  },
  {
    code: 'BS-TMPL-SCOPE-09',
    phaseId: 'p0',
    title: 'PoC vs MVP vs Production Scope Boundary Matrix',
    ownerRole: 'delivery-lead',
    file: 'delivery/templates/phase-0-scope/09-poc-mvp-prod-decision-matrix.md',
    description:
      'Strict boundaries and exit gates defining deliverables across PoC, MVP, and full production services.',
  },
  {
    code: 'BS-TMPL-SCOPE-10',
    phaseId: 'p0',
    title: 'Discovery Charter & Gate 0 Sign-Off',
    ownerRole: 'delivery-lead',
    file: 'delivery/templates/phase-0-scope/10-discovery-charter-signoff.md',
    description:
      'Formal charter document with named signers and approval gates authorizing Phase 1 architecture.',
  },
  {
    code: 'BS-TMPL-DESIGN-01',
    phaseId: 'p1',
    title: 'C4 Architecture Model Suite',
    ownerRole: 'solution-architect',
    file: 'delivery/templates/phase-1-design/01-c4-architecture-suite.md',
    description:
      'Standard C4 Context, Container, Component, and Deployment topology diagrams.',
  },
  {
    code: 'BS-TMPL-DESIGN-02',
    phaseId: 'p1',
    title: 'Nominal & Failure Sequence Diagrams',
    ownerRole: 'solution-architect',
    file: 'delivery/templates/phase-1-design/02-sequence-diagrams-failure-flows.md',
    description:
      'Explicit sequence diagrams modeling timeouts, circuit breaking, fallback degradation, and dead-letter queues.',
  },
  {
    code: 'BS-TMPL-DESIGN-03',
    phaseId: 'p1',
    title: 'OpenAPI 3.1 Specification Template',
    ownerRole: 'inference-engineer',
    file: 'delivery/templates/phase-1-design/03-openapi-3.1-specification-template.yaml',
    description:
      'Production REST contract including error schemas, latency headers, and health probes.',
  },
  {
    code: 'BS-TMPL-DESIGN-04',
    phaseId: 'p1',
    title: 'AsyncAPI 3.0 Specification Template',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-1-design/04-asyncapi-3.0-specification-template.yaml',
    description:
      'Kafka and event streaming contract with schema evolution rules and DLQ channels.',
  },
  {
    code: 'BS-TMPL-DESIGN-05',
    phaseId: 'p1',
    title: 'OpenDataContract Specification Template',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-1-design/05-open-data-contract-template.yaml',
    description:
      'Standard data contract governing table schemas, freshness SLAs, nullability, and quality assertions.',
  },
  {
    code: 'BS-TMPL-DESIGN-06',
    phaseId: 'p1',
    title: 'Architecture Decision Record (ADR) Template',
    ownerRole: 'solution-architect',
    file: 'delivery/templates/phase-1-design/06-architecture-decision-record-template.md',
    description:
      'Standard ADR structure capturing context, options, decision, trade-offs, and consequences.',
  },
  {
    code: 'BS-TMPL-DESIGN-07',
    phaseId: 'p1',
    title: 'Measurable NFR Matrix',
    ownerRole: 'platform-engineer',
    file: 'delivery/templates/phase-1-design/07-nfr-matrix-template.md',
    description:
      'Quantifiable SLOs for P50/P95/P99 latency, throughput, availability, RTO/RPO, and degradation budgets.',
  },
  {
    code: 'BS-TMPL-DESIGN-08',
    phaseId: 'p1',
    title: 'STRIDE & OWASP LLM Threat Model',
    ownerRole: 'security-engineer',
    file: 'delivery/templates/phase-1-design/08-stride-threat-model-template.md',
    description:
      'Comprehensive security threat matrix with architectural controls and verification tests.',
  },
  {
    code: 'BS-TMPL-DATA-01',
    phaseId: 'p2',
    title: 'Source-to-Target Mapping (STTM)',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-2-data/source-to-target-mapping.md',
    description:
      'Field-level transformation specification with null handling, point-in-time leakage prevention, JSON/Avro schemas, and backfill protocols.',
  },
  {
    code: 'BS-TMPL-DATA-02',
    phaseId: 'p2',
    title: 'Production Streaming Ingestion Pipeline',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-2-data/streaming-ingestion-pipeline.py',
    description:
      'Kafka/Flink streaming consumer with sliding window aggregations, watermark tracking, and DLQ routing.',
  },
  {
    code: 'BS-TMPL-DATA-03',
    phaseId: 'p2',
    title: 'Batch Ingestion & Feature Store Loader',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-2-data/batch-ingestion-pipeline.py',
    description:
      'Distributed batch ETL loader with partition validation, schema enforcement, and point-in-time snapshot joins.',
  },
  {
    code: 'BS-TMPL-DATA-04',
    phaseId: 'p2',
    title: 'Automated Data Quality & Validation Suite',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-2-data/data-quality-suite.py',
    description:
      'Data quality testing framework (Great Expectations style) asserting null bounds, distribution checks, and contract adherence.',
  },
  {
    code: 'BS-TMPL-DATA-05',
    phaseId: 'p2',
    title: 'Dead-Letter Queue (DLQ) & Poison Message Handler',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-2-data/dead-letter-queue-handler.py',
    description:
      'Resilient poison-pill quarantine, alert dispatcher, and backfill replay utility for malformed messages.',
  },
  {
    code: 'BS-TMPL-BUILD-01',
    phaseId: 'p3',
    title: 'FastAPI Low-Latency Serving Template',
    ownerRole: 'inference-engineer',
    file: 'delivery/templates/phase-3-build/fastapi-inference-service.py',
    description:
      'Microservice scaffolding with P99 < 15ms latency enforcement, health endpoints, and circuit breakers.',
  },
  {
    code: 'BS-TMPL-BUILD-02',
    phaseId: 'p3',
    title: 'MLflow Experiment Tracking & Registry Pipeline',
    ownerRole: 'ml-engineer',
    file: 'delivery/templates/phase-3-build/mlflow-tracking-registry.py',
    description:
      'Standardized model lineage, hyperparameter logging, PR-AUC tracking, artifact signing, and stage promotion.',
  },
  {
    code: 'BS-TMPL-BUILD-03',
    phaseId: 'p3',
    title: 'OAuth2 & mTLS Zero-Trust Serving Middleware',
    ownerRole: 'security-engineer',
    file: 'delivery/templates/phase-3-build/oauth2-jwt-middleware.py',
    description:
      'Inference authorization middleware with JWT validation, RBAC claims inspection, and rate limiting.',
  },
  {
    code: 'BS-TMPL-BUILD-04',
    phaseId: 'p3',
    title: 'Production Model Card Specification',
    ownerRole: 'data-scientist',
    file: 'delivery/templates/phase-3-build/model-card-template.md',
    description:
      'Comprehensive model documentation covering architecture, slice evaluation, TreeSHAP interpretability, and ethical guardrails.',
  },
  {
    code: 'BS-TMPL-BUILD-05',
    phaseId: 'p3',
    title: 'Production Dataset Card Specification',
    ownerRole: 'data-engineer',
    file: 'delivery/templates/phase-3-build/dataset-card-template.md',
    description:
      'Dataset lineage document detailing sampling method, label delay windows, censoring handling, and PII redaction.',
  },
  {
    code: 'BS-TMPL-VRFY-01',
    phaseId: 'p4',
    title: 'Master Test Strategy & Verification Pyramid',
    ownerRole: 'qa-test-engineer',
    file: 'delivery/templates/phase-4-verify/master-test-strategy.md',
    description:
      'Complete multi-tier testing framework spanning unit, contract, load/stress, adversarial perturbations, and release gates.',
  },
  {
    code: 'BS-TMPL-VRFY-02',
    phaseId: 'p4',
    title: 'User Acceptance Testing (UAT) Plan',
    ownerRole: 'business-analyst',
    file: 'delivery/templates/phase-4-verify/uat-plan-template.md',
    description:
      'Business operator test scenarios, blind evaluation rubrics, and formal gate acceptance criteria.',
  },
  {
    code: 'BS-TMPL-VRFY-03',
    phaseId: 'p4',
    title: 'Independent Model Validation Report (SR 11-7 / EU AI Act)',
    ownerRole: 'risk-compliance',
    file: 'delivery/templates/phase-4-verify/independent-model-validation-report.md',
    description:
      'Independent supervisory audit template assessing conceptual soundness, mathematical rigor, stress testing, and fairness.',
  },
  {
    code: 'BS-TMPL-REL-01',
    phaseId: 'p5',
    title: 'Production Release Checklist (Gate 5 Go-Live)',
    ownerRole: 'platform-engineer',
    file: 'delivery/templates/phase-5-release/production-release-checklist.md',
    description:
      'Comprehensive pre-deployment checklist, multi-stakeholder sign-off matrix, canary milestones, and hypercare schedule.',
  },
  {
    code: 'BS-TMPL-REL-02',
    phaseId: 'p5',
    title: 'Rehearsed Rollback Plan & Rapid Recovery Guide',
    ownerRole: 'platform-engineer',
    file: 'delivery/templates/phase-5-release/rehearsed-rollback-plan.md',
    description:
      'Step-by-step automated and manual rollback runbook with < 60s RTO execution commands and zero data loss safeguards.',
  },
  {
    code: 'BS-TMPL-REL-03',
    phaseId: 'p5',
    title: 'Phase Gate Evidence Pack Template',
    ownerRole: 'forward-deployed-engineer',
    file: 'delivery/templates/phase-5-release/phase-gate-evidence-pack.md',
    description:
      'Standardized evidence bundle structure compiling signed test logs, architecture reviews, and regulatory audit trails.',
  },
  {
    code: 'BS-TMPL-OPS-01',
    phaseId: 'p6',
    title: 'SRE Operational Runbook & Incident Response Guide',
    ownerRole: 'platform-engineer',
    file: 'delivery/templates/phase-6-operate/sre-operational-runbook-template.md',
    description:
      'Tier 1 incident response playbooks for P99 latency breach, feature staleness, score collapse, and service degradation.',
  },
  {
    code: 'BS-TMPL-OPS-02',
    phaseId: 'p6',
    title: 'Blameless Post-Incident Review (PIR) Template',
    ownerRole: 'platform-engineer',
    file: 'delivery/templates/phase-6-operate/post-incident-review-pir-template.md',
    description:
      'Structured post-mortem document with 5 Whys analysis, timeline reconstruction, and tracked CAPA corrective actions.',
  },
  {
    code: 'BS-TMPL-OPS-03',
    phaseId: 'p6',
    title: 'Quarterly Service Review & Realized ROI Tracker',
    ownerRole: 'business-analyst',
    file: 'delivery/templates/phase-6-operate/service-review-roi-tracker.md',
    description:
      'Executive performance scorecard measuring actual dollar benefit vs baseline, cost per 1k decisions, and technical debt backlog.',
  },
];

/* ------------------------------------------------------------------------------------------------- glossary */

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'ADR', meaning: 'Architecture decision record: a short note of a decision, the options considered and the consequences.' },
  { term: 'Baseline', meaning: 'The performance of the current process, or of the simplest model. The number any new model must beat.' },
  { term: 'Canary', meaning: 'Releasing to a small share of traffic first, and widening only if the guardrails hold.' },
  { term: 'Champion and challenger', meaning: 'The model in production and the candidate that must beat it under the same evaluation.' },
  { term: 'Data contract', meaning: 'An agreement with a data-producing team on schema, meaning, quality and notice of change.' },
  { term: 'Drift', meaning: 'A change in the input data or in the relationship between inputs and outcomes since the model was trained.' },
  { term: 'Error budget', meaning: 'The amount of unreliability an SLO allows. When it is spent, reliability work comes before features.' },
  { term: 'Fallback ladder', meaning: 'The ordered list of what the system returns as dependencies fail, ending in a safe default.' },
  { term: 'Gate', meaning: 'A review at the end of a phase where named people sign that listed evidence exists.' },
  { term: 'Golden set', meaning: 'A fixed set of inputs with expected outputs or scoring rubrics, used to evaluate LLM systems.' },
  { term: 'Guardrail metric', meaning: 'A measure that must not get worse while you improve the main one.' },
  { term: 'HLD and LLD', meaning: 'High-level design (components and flows) and low-level design (contracts, schemas, code structure).' },
  { term: 'Hypercare', meaning: 'The first weeks after go-live, with daily review and the build team still on hand.' },
  { term: 'Label maturity', meaning: 'The delay between a prediction and knowing the true outcome.' },
  { term: 'Leakage', meaning: 'A feature that contains information not available at prediction time. It inflates offline results and fails in production.' },
  { term: 'NFR', meaning: 'Non-functional requirement: latency, availability, throughput, security, recovery.' },
  { term: 'North-star metric', meaning: 'The single business outcome the system exists to move.' },
  { term: 'Operating point', meaning: 'The threshold at which a score becomes a decision, chosen from the cost of each kind of error.' },
  { term: 'Point-in-time correct', meaning: 'Each training row uses feature values exactly as they were at the moment of prediction.' },
  { term: 'RACI', meaning: 'Responsible (does it), Accountable (answers for it), Consulted (takes part), Informed (is told).' },
  { term: 'Rollback', meaning: 'Returning production to the previous version by a rehearsed path.' },
  { term: 'Runbook', meaning: 'Step-by-step instructions for detecting, mitigating and recovering from one kind of failure.' },
  { term: 'Shadow', meaning: 'Running the new system on real traffic without acting on its output.' },
  { term: 'SLI and SLO', meaning: 'Service-level indicator (what is measured) and objective (the target for it).' },
  { term: 'UAT', meaning: 'User acceptance testing: real users confirm the system meets the acceptance criteria.' },
];
