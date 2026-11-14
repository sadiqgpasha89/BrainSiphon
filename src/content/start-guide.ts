/**
 * The getting-started guide: a reading and referring sequence for engineers new to the site. It is data, so a test can check that every
 * link resolves and every blueprint section it names exists, and the page cannot drift from the site it describes.
 */
import type { SectionId } from '../lib/roles';

/** The blueprint the examples point at. Readers swap it for their own use case. */
export const EXAMPLE = 'fintech/real-time-card-upi-fraud-detection';
export const EXAMPLE_BATCH = 'supply-chain/network-demand-sensing-short-term';
export const EXAMPLE_RAG = 'saas/developer-docs-assistant';
export const EXAMPLE_AGENT = 'cybersecurity/soc-copilot-llm-investigation';

export interface GuideStep {
  /** stable id, used to remember what a reader has ticked off in this browser */
  id: string;
  title: string;
  /** a path on this site (with an optional #anchor), or an https URL */
  href: string;
  minutes: number;
  /** what to read or look at, and what to look for */
  read: string;
  /** how you know you have it */
  checkpoint: string;
}

export interface GuideWeek {
  id: string;
  title: string;
  goal: string;
  steps: GuideStep[];
  exercise: string;
  /** a question you should be able to answer before moving on */
  question: string;
}

export const FIRST_HOUR: GuideStep[] = [
  {
    id: 'h1',
    title: 'Know what this site is, and is not',
    href: '/about',
    minutes: 10,
    read: 'The first section and the five maturity levels. Every blueprint is a reference design whose numbers are modelled starting points, not measurements.',
    checkpoint: 'You can say why you must replace every number with your own baseline.',
  },
  {
    id: 'h2',
    title: 'Pick the closest use case, not the most impressive one',
    href: '/#domains',
    minutes: 10,
    read: 'Open your industry, follow its Start here path or a track, or press ⌘K (Ctrl+K) and search by problem. Choose the blueprint whose decision and data look most like yours.',
    checkpoint: 'You have one blueprint chosen. Write down its slug (the part after the site name).',
  },
  {
    id: 'h3',
    title: 'Read that blueprint once, in Pure Signal mode',
    href: `/${EXAMPLE}`,
    minutes: 25,
    read: 'Press [ for Pure Signal, which hides what is not core. Skim the four groups in order: Understand, Design, Prove, Ship and run. Do not study yet; get the shape.',
    checkpoint: 'You can name the decision the system supports and the two or three things that move its metric.',
  },
  {
    id: 'h4',
    title: 'Open the delivery guide with your use case and your role selected',
    href: '/delivery',
    minutes: 10,
    read: 'Choose your use case at the top and then your role. Only your steps remain, and each links to the blueprint section to read.',
    checkpoint: 'You know which phase you are in and which steps you own.',
  },
  {
    id: 'h5',
    title: 'See what has been checked, and what has not',
    href: '/release',
    minutes: 5,
    read: 'The maturity ladder and the starter-kit runs. This tells you how far to trust each part.',
    checkpoint: 'You can tell whether your blueprint has a tested starter for its exact problem.',
  },
];

export const WEEKS: GuideWeek[] = [
  {
    id: 'w1',
    title: 'Week 1: understand the problem before the technology',
    goal: 'Be able to state the decision, the cost of each kind of error, the label and how long it takes to arrive, and the baseline to beat.',
    steps: [
      { id: 'w1a', title: 'Read the Understand group of the fraud blueprint', href: `/${EXAMPLE}#discovery`, minutes: 90, read: 'Discovery, enterprise context, signal versus noise, problem formulation. This is the model for how every blueprint starts.', checkpoint: 'You can explain what is signal and what only looks like it.' },
      { id: 'w1b', title: 'Read a contrasting one: a batch forecast', href: `/${EXAMPLE_BATCH}#signal-noise`, minutes: 60, read: 'Compare how the problem, the label and the metric differ from the real-time case.', checkpoint: 'You can say what changes between online decisioning and batch forecasting.' },
      { id: 'w1c', title: 'Learn the eleven archetypes', href: '/patterns', minutes: 45, read: 'The L1 archetypes (tabular, forecast, anomaly, recommender, graph, NLP, vision, bandit, optimisation, RAG, agent). Match yours.', checkpoint: 'You know which archetype your problem is and which neighbour it could be mistaken for.' },
      { id: 'w1d', title: 'Do Phase 0 of the delivery guide', href: '/delivery#p0', minutes: 60, read: 'Ten steps from a named decision owner to a signed charter. Download the discovery questionnaire and business requirements templates.', checkpoint: 'You have the questionnaire answered and the decision owner named.' },
    ],
    exercise: 'Write a one-page problem statement for your own use case: the decision, who owns it, the cost of a false positive and a false negative, the label and its delay, and the baseline you must beat.',
    question: 'What would make you stop this project in week two?',
  },
  {
    id: 'w2',
    title: 'Week 2: design the system and choose a platform',
    goal: 'Produce a high-level design on the cloud you will use, with the decisions behind it written down.',
    steps: [
      { id: 'w2a', title: 'Read the Design group on your blueprint', href: `/${EXAMPLE}#features`, minutes: 120, read: 'Features, model pipeline, high-level design, sequence, low-level design, end-to-end build and the capacity model. Re-run the calculator at your own traffic.', checkpoint: 'You can redraw the high-level design from memory and say where the p99 budget goes.' },
      { id: 'w2b', title: 'Redraw it on your platform', href: `/${EXAMPLE}#hld`, minutes: 60, read: 'On the deployment topology, switch the tabs between Cloud-neutral, AWS, Azure, GCP and OpenStack. Read how the services connect for the use case and what changes on each platform. The choice you make stays selected on every diagram on the page.', checkpoint: 'You can name the service that fills each role on your platform, and what you would have to run yourself.' },
      { id: 'w2c', title: 'Learn five primitives that recur', href: '/patterns/primitives/point-in-time-feature-joins', minutes: 90, read: 'Start with point-in-time feature joins, then data-contract-quality-sla, probability-calibration, shadow-canary-mirroring and model-registry-promotion-gates. Each says the problem, preconditions and failure modes.', checkpoint: 'You can explain why each exists by describing the failure it prevents.' },
      { id: 'w2d', title: 'Do Phase 1 of the delivery guide', href: '/delivery#p1', minutes: 90, read: 'Architecture decision records, API and data contracts, threat model, test strategy. Download the ADR, OpenAPI and data-contract templates.', checkpoint: 'Two ADRs are written, each with the alternative you rejected and why.' },
      { id: 'w2e', title: 'Choose a runtime and a recovery tier', href: '/deployment#variants', minutes: 45, read: 'Not everything needs Kubernetes. Pick the workload class, then the recovery tier (T0 to T3) and read what it costs you.', checkpoint: 'You can defend your availability target with a cost, not a habit.' },
    ],
    exercise: 'Draw the high-level design for your use case on your chosen platform, and write two architecture decision records: one for the runtime, one for the recovery tier.',
    question: 'Which single component, if it fails, takes down the decision, and what is the fallback?',
  },
  {
    id: 'w3',
    title: 'Week 3: build it and prove it works',
    goal: 'Run a complete reference system, change it, and see your change in the evaluation.',
    steps: [
      { id: 'w3a', title: 'Pick the reference implementation closest to your use case', href: '/implementations', minutes: 30, read: 'Four complete systems: real-time decisioning, batch forecasting, RAG assistant, agentic workflow. Each says what it covers and what is simulated.', checkpoint: 'You know which one you will build from, and what it does not cover.' },
      { id: 'w3b', title: 'Run it end to end', href: 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/reference-implementations', minutes: 120, read: 'In its directory run make setup and then make demo. Read the README sections on prerequisites, expected results and troubleshooting.', checkpoint: 'The demo and the verification pass on your machine.' },
      { id: 'w3c', title: 'Read the Prove group', href: `/${EXAMPLE}#evaluation`, minutes: 120, read: 'Evaluation plan, edge cases that break the system, governance and guardrails, experimentation, and the metrics catalogue.', checkpoint: 'You can list the release thresholds and the guardrail metrics for your use case.' },
      { id: 'w3d', title: 'Read the build playbook and its starter kit', href: `/${EXAMPLE}#playbook`, minutes: 90, read: 'Milestones with exit gates. Then the kit page for your archetype, such as /patterns/tabular. The kit is the modelling step on synthetic data; it is not serving.', checkpoint: 'You can say which milestones the starter covers and which you must build.' },
      { id: 'w3e', title: 'Do Phases 2 to 4 for your role', href: '/delivery#p2', minutes: 60, read: 'Data access and contracts, model build, verification. Filter the guide to your role.', checkpoint: 'You have the data contract signed or its blockers named.' },
    ],
    exercise: 'In the reference implementation, change one thing (a threshold, a feature or a data-quality rule). Predict what will happen to the evaluation, run it, and write down whether you were right.',
    question: 'Which of your numbers came from your data, and which are still the blueprint\'s?',
  },
  {
    id: 'w4',
    title: 'Week 4: ship it and keep it running',
    goal: 'Be able to take a change from a pull request to production, roll it back, and hand it over.',
    steps: [
      { id: 'w4a', title: 'Read the Ship and run group', href: `/${EXAMPLE}#mlops`, minutes: 90, read: 'MLOps lifecycle and gates, operations (SLOs, incidents, ten failure scenarios), the agentic verdict, and what the validation section says was checked.', checkpoint: 'You can describe how a model is promoted, watched and rolled back.' },
      { id: 'w4b', title: 'Generate a deployment package and read the commands', href: '/workspace', minutes: 45, read: 'On Architecture Packages choose your family, cloud, environment and tier. Read the recommendation, the generated files and the validation notes.', checkpoint: 'You have a dev package and you know which files are still unvalidated.' },
      { id: 'w4c', title: 'Read the deployment page', href: '/deployment#validation', minutes: 45, read: 'Environments, versions, recovery tiers, and the table of what has and has not been validated for the infrastructure code.', checkpoint: 'You can say what you must test in your own account before you rely on a target.' },
      { id: 'w4d', title: 'Do Phases 5 and 6', href: '/delivery#p5', minutes: 90, read: 'Shadow, canary, hypercare, handover, then monitoring and the quarterly review. Download the release checklist, rollback plan, handover package and runbook templates.', checkpoint: 'Your rollback plan names the command and who runs it.' },
      { id: 'w4e', title: 'Read the incident runbooks', href: 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/deployment/runbooks', minutes: 45, read: 'RB-01 to RB-10: degradation, pipeline failure, latency, provider outage, vector database failure, tool failure, drift, security, cost, regional outage.', checkpoint: 'You know the first command you would run for each.' },
    ],
    exercise: 'Dress rehearsal: draft the handover package for your use case, write the restore-test plan, and rehearse the rollback in a non-production environment.',
    question: 'What is the first sign this system is wrong, and who gets paged?',
  },
];

export const CAPSTONE =
  'Capstone: take one use case through all seven delivery phases to the Phase 4 gate, with the evidence pack assembled from the templates. Someone else should be able to run the demo, read your ADRs and tell what is measured and what is assumed.';

/** What each of the 22 blueprint sections is for, so a reader knows why they are reading it. Covers every section id exactly once. */
export const SECTION_PURPOSE: Record<SectionId, string> = {
  discovery: 'Phase 0: the questions to ask the business, the requirements and acceptance criteria. Start here, always.',
  enterprise: 'Where the system sits in the enterprise: context and container diagrams, integrations, requirements, decisions, build versus buy.',
  'signal-noise': 'What actually moves the metric, what only looks like it, and why teams get it wrong.',
  problem: 'The problem written as something you can optimise: label, loss and the cost of each error.',
  features: 'The features that carry signal, the noise to drop, and the leakage to avoid.',
  blueprint: 'The model pipeline and feedback loop: baseline first, then the production model.',
  hld: 'The system for 10 million users, now redrawable on AWS, Azure, GCP and OpenStack.',
  sequence: 'The request path with deadline propagation and the degradation branch, also redrawable per platform.',
  lld: 'API contract, data model, events, classes, hot path, config, failure and test scenarios. An illustrative scaffold.',
  e2e: 'The end-to-end build, phase by phase.',
  scale: 'The capacity and cost model you can re-run at your own traffic.',
  evaluation: 'What has to be proven and how: offline protocol, thresholds, online experiment, guardrails.',
  'edge-cases': 'The cases that break the system in production, and how you notice.',
  'role-lenses': 'What each of the fifteen roles should take from this blueprint.',
  governance: 'Risk tier, guardrails in six layers, regulatory orientation. Not legal advice.',
  experimentation: 'The statistical design: estimand, power, selection bias, calibration, slices, stopping rules.',
  metrics: 'Every metric to track: business, model, data, system, cost and safety, with owners and actions.',
  mlops: 'The nine-area lifecycle with artifacts and gates, retraining, champion and challenger, rollback.',
  operations: 'SLOs, telemetry, incident classes and ten failure scenarios from detection to learning.',
  agentic: 'Whether agents belong here at all, and if so the tools, autonomy ladder and guardrails.',
  playbook: 'The build playbook: milestones, exit gates and the starter kit that matches.',
  validation: 'What was checked and what was not, with the evidence for each maturity level.',
};

export interface StuckRow {
  question: string;
  where: { label: string; href: string }[];
}

export const STUCK: StuckRow[] = [
  { question: 'Is this the right use case for me?', where: [{ label: 'Domain pages and tracks', href: '/#domains' }, { label: 'Kit compatibility on a blueprint playbook', href: `/${EXAMPLE}#playbook` }] },
  { question: 'Who does what, and in what order?', where: [{ label: 'Delivery guide: 7 phases, 69 steps, RACI', href: '/delivery' }] },
  { question: 'How big does it have to be, and what does it cost?', where: [{ label: 'Capacity and cost model with calculator', href: `/${EXAMPLE}#scale` }] },
  { question: 'Which cloud service plays which role?', where: [{ label: 'Cloud tabs on the high-level design', href: `/${EXAMPLE}#hld` }, { label: 'Same tabs on the sequence diagram', href: `/${EXAMPLE}#sequence` }] },
  { question: 'Does Kubernetes make sense for this?', where: [{ label: 'Workload variants', href: '/deployment#variants' }] },
  { question: 'What availability and recovery targets are defensible?', where: [{ label: 'Recovery tiers T0 to T3', href: '/deployment#recovery' }] },
  { question: 'A mechanism keeps recurring (outbox, calibration, canary). What is it?', where: [{ label: 'Patterns and primitives', href: '/patterns' }] },
  { question: 'Where is the code?', where: [{ label: 'Reference implementations', href: '/implementations' }, { label: 'Starter kits per archetype', href: '/patterns' }] },
  { question: 'Which template do I need for this deliverable?', where: [{ label: 'Templates and ZIP downloads', href: '/delivery#templates' }, { label: 'Generated deployment package and backlog', href: '/workspace' }] },
  { question: 'Can I trust this number?', where: [{ label: 'Release report and each blueprint\'s Validation section', href: '/release' }] },
  { question: 'How do I give this to an LLM or my IDE?', where: [{ label: 'Append .md to any blueprint URL, or use /llms.txt', href: '/llms.txt' }] },
];

export const SHORTCUTS: { keys: string; does: string }[] = [
  { keys: '⌘K or Ctrl+K', does: 'Search every blueprint' },
  { keys: '[', does: 'Pure Signal mode: hide what is not core' },
  { keys: '1 to 9, a to f', does: 'Role lens: show only what that role needs (several can be combined)' },
  { keys: '.md after a blueprint URL', does: 'Clean Markdown of the whole page, for LLMs and IDEs' },
  { keys: 'Platform tabs on a diagram', does: 'Cloud-neutral, AWS, Azure, GCP, OpenStack. The choice is remembered in this browser and applies to every diagram on the page' },
];

/** Every internal link the guide makes, for the test that checks they resolve. */
export function guideLinks(): string[] {
  const links: string[] = [];
  for (const s of FIRST_HOUR) links.push(s.href);
  for (const w of WEEKS) for (const s of w.steps) links.push(s.href);
  for (const r of STUCK) for (const w of r.where) links.push(w.href);
  return links;
}
