/**
 * Phase 0: Enterprise Discovery and Business Requirements, generated for every blueprint.
 *
 * It answers, before any architecture, the questions a Business Analyst has to settle: who the user is, who owns the decision,
 * what the process is today, which application consumes the output, what happens when the output is wrong, who approves
 * changes to business policy, what the baseline performance is and how return is measured. It also carries the AS-IS and TO-BE
 * process, user journeys, functional requirements with acceptance criteria, a RACI and a business case.
 *
 * Everything is derived from the use case's own fields and the per-domain enterprise facts. None of it is a finding about a real
 * organisation: each answer is a starting position for the discovery workshop (`status: 'to-confirm'`), and the exit gate stays
 * open until the client has confirmed it.
 */
import type { Discovery, EnterpriseContext, Governance } from '../schemas/usecase.schema';
import { DOMAIN_ENTERPRISE } from './enterprise-domains';
import { LABEL_DELAY, PROTOCOLS } from './extras';
import { TOTAL_BUDGET_MS } from './design';
import { usd } from './scale';
import type { EntCtx } from './enterprise';

const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const strip = (s: string) => s.trim().replace(/[.;]+$/, '');

export function buildDiscovery(c: EntCtx, ent: EnterpriseContext, gov: Governance): Discovery {
  const { raw, domain, scale } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const batch = scale.mode === 'batch';
  const total = TOTAL_BUDGET_MS[c.latency];
  const llm = c.paradigms.includes('llm-agents') || c.pattern === 'llm-agent' || c.pattern === 'llm-rag';
  const sync = c.stages.filter((s) => !s.async);
  const owner = d.stakeholders[0]!;
  const operator = d.stakeholders[1] ?? owner;
  const control = d.stakeholders[2] ?? operator;
  const affected = d.stakeholders[3] ?? control;
  const consumer = d.downstream[0]!;
  const caseTool = d.downstream[1] ?? consumer;
  const notify = d.downstream[2] ?? consumer;
  const kpi0 = strip(raw.on[0] ?? raw.obj);
  const kpi1 = strip(raw.on[1] ?? raw.on[0] ?? raw.obj);
  const edge = raw.edge[0] ?? [raw.title, 'the output is wrong', 'fall back to the baseline'];
  const decision = llm ? 'answer or action' : batch ? 'scored result' : 'decision';
  const within = total === null ? 'by the end of the run window' : `within ${total} ms at p99`;

  const questions: Discovery['questions'] = [
    {
      id: 'system-user',
      question: 'Who is the actual system user?',
      proposedAnswer: `Operators: ${operator.who} (${lc(strip(operator.needs))}). Affected without operating it: ${affected.who} (${lc(strip(affected.needs))}). Confirm who really touches the output, as opposed to who is named in the project charter.`,
      confirmWith: `${operator.who} and ${owner.who}`,
      evidence: 'Named user groups with headcount, and interview or observation notes from the people who do the work today',
    },
    {
      id: 'decision-owner',
      question: 'Who owns the business decision?',
      proposedAnswer: ent.business.decisionOwner,
      confirmWith: owner.who,
      evidence: 'A named accountable executive and a written delegation of who sets thresholds',
    },
    {
      id: 'existing-process',
      question: 'What is the existing process?',
      proposedAnswer: `${ent.business.currentState} Walk it step by step with the people who run it, with volumes, cycle times and exception rates.`,
      confirmWith: `The owner of ${lc(d.processes[0]!)}`,
      evidence: 'A process map signed off by the people who run it, with measured cycle times and volumes',
    },
    {
      id: 'consuming-application',
      question: 'Which application will consume the model or AI output?',
      proposedAnswer: `${consumer} consumes the ${decision} ${batch ? 'once the run publishes' : within}; ${caseTool} receives the cases that need a person; ${d.systemsOfRecord[0]} stays the system of record. Confirm each consumer's interface (${PROTOCOLS[domain].split(',')[0]!.trim()}), change window and owner.`,
      confirmWith: 'The application owners and the Solution Architect',
      evidence: 'An interface inventory naming each consuming application, its owner, protocol and release calendar',
    },
    {
      id: 'wrong-output',
      question: 'What happens when the output is wrong?',
      proposedAnswer: `The worst credible case is "${strip(edge[0]!)}": ${lc(strip(edge[1]!))}. It is detected through ${lc(kpi0)} and through reviewer overrides in ${caseTool}, and the service steps down a degradation ladder (stale features, then the baseline model, then a safe business default). State per error type who is harmed, how quickly it must be reversed and who has the authority to stop the system.`,
      confirmWith: `${owner.who} and ${control.who}`,
      evidence: 'An error-cost table (false positive versus false negative), a stop-authority statement and a reversal procedure',
    },
    {
      id: 'policy-approver',
      question: 'Who approves changes to business policies?',
      proposedAnswer: `${owner.who} approves changes to thresholds and business rules; model promotion follows the ${gov.riskTier}-risk path (${strip(gov.approvalPath[0]!)}). Thresholds, reason-code wording and override rules are policy, not model parameters: they change through the same change record as a release.`,
      confirmWith: `${owner.who} and ${control.who}`,
      evidence: 'A named policy approver, a change-record template and the approval path accepted by risk or compliance',
    },
    {
      id: 'baseline-performance',
      question: 'What is the baseline business performance?',
      proposedAnswer: `The comparison is today's process, not the baseline model. Measure at least one full label-maturity window (${LABEL_DELAY[domain]}) of: ${raw.on.slice(0, 3).map((m) => lc(strip(m))).join('; ')}. The technical baseline to beat is: ${strip(raw.base)}.`,
      confirmWith: 'The data analyst and the business owner',
      evidence: 'A baseline report from the system of record, with the query, the period and the owner who signed it',
    },
    {
      id: 'roi-measurement',
      question: 'How will financial or operational ROI be measured?',
      proposedAnswer: `Value is the measured change in ${lc(kpi0)} and in handling effort, less run cost (modelled at ${usd(scale.monthlyTotalUSD)} per month at the default workload, a planning figure and not a quote). Measure with a holdout or phased rollout, count benefit only on matured labels, and agree unit values with finance before launch.`,
      confirmWith: `${owner.who} and finance`,
      evidence: 'An agreed ROI formula, unit values signed by finance and a measurement plan that names the holdout',
    },
  ];

  const stakeholders: Discovery['stakeholders'] = [
    ...d.stakeholders.map((s, i) => ({
      who: s.who,
      needs: s.needs,
      involvement: (['decides', 'uses', 'consulted', 'informed'] as const)[Math.min(i, 3)]!,
    })),
    { who: 'Enterprise architecture, security and operations', needs: 'Integration, controls and run-ability agreed before anything is built', involvement: 'consulted' },
  ];

  return {
    status: 'to-confirm',
    summary: `Phase 0 is compulsory for ${raw.title}: no architecture, data or model work starts until the business has confirmed the answers below. They are starting positions drawn from this use case and its domain, to be confirmed or corrected in the discovery workshop. Nothing here describes a real organisation.`,
    questions,
    process: {
      asIs: [
        `Input arrives from ${d.upstream[0]}`,
        `${d.processes[0]} is applied with fixed rules and manual checks on top of ${d.legacy}`,
        `Exceptions go to ${operator.who}, who decide case by case`,
        'Outcomes are reported periodically and are rarely fed back as labelled examples',
      ],
      toBe: [
        `Input arrives from ${d.upstream[0]} as before`,
        `${sync.slice(0, 4).map((s) => s.label).join(' → ')} produce the ${decision} ${batch ? 'in the scheduled run' : within}`,
        `${consumer} uses it directly; uncertain or high-impact cases go to ${caseTool} with reason codes`,
        `${notify} carries the outcome to the affected party`,
        'Every override and outcome is stored as a labelled example for monitoring and retraining',
      ],
      changes: [
        `${operator.who} work a smaller, explained queue instead of the raw volume`,
        `Thresholds and rules become governed policy with a named approver (${owner.who})`,
        `${d.legacy} stays as the fallback path until the canary has held for a full label-maturity window`,
      ],
    },
    stakeholders,
    journeys: [
      {
        persona: operator.who,
        goal: operator.needs,
        steps: [
          `Opens the case in ${caseTool}`,
          `Reads the ${decision} with its reason codes${llm ? ' and cited sources' : ''}`,
          'Accepts it or overrides it with a recorded reason',
          'The override is stored as a labelled outcome',
        ],
        whenWrong: 'Overrides and escalates; a run of overrides on the same pattern opens a model review.',
      },
      {
        persona: affected.who,
        goal: affected.needs,
        steps: [
          'Uses the existing channel, unchanged',
          `Receives the outcome through ${notify}`,
          'Sees a plain reason when the outcome is adverse',
          'Can contest the outcome through a defined route',
        ],
        whenWrong: 'Contests the outcome; the appeal is resolved by a person and recorded.',
      },
      {
        persona: owner.who,
        goal: owner.needs,
        steps: [
          'Reviews the KPI dashboard against the agreed baseline',
          'Approves threshold and policy changes on evidence',
          'Decides to promote, pause or roll back',
        ],
        whenWrong: 'Invokes the stop authority and returns the decision to the legacy path.',
      },
    ],
    requirements: [
      {
        id: 'FR-1',
        requirement: `Return a ${decision} for every valid input from ${d.upstream[0]} ${within}.`,
        acceptance: `Given a valid input, when it is submitted, then a ${decision} is returned ${within} in at least 99% of requests in the load test.`,
      },
      {
        id: 'FR-2',
        requirement: llm ? 'Show the sources and tool calls behind every answer.' : 'Return the main reasons for each decision.',
        acceptance: llm ? 'Given any answer, when a reviewer opens it, then every claim links to a retrieved source or a tool result.' : 'Given any decision, when a reviewer opens it, then at least the top reason codes are shown and agree with the model inputs.',
      },
      {
        id: 'FR-3',
        requirement: `Let ${operator.who} accept or override a result and record the reason.`,
        acceptance: 'Given a case in review, when the reviewer overrides it, then the override, reason and reviewer are stored and appear as a labelled outcome in the next training set.',
      },
      {
        id: 'FR-4',
        requirement: 'Degrade safely when the model plane is unavailable.',
        acceptance: 'Given the model service is down, when a request arrives, then the baseline or the safe default is returned, flagged as degraded, and no request is dropped.',
      },
      {
        id: 'FR-5',
        requirement: 'Record every decision so it can be replayed.',
        acceptance: 'Given any past decision, when it is replayed from the ledger, then the same output is reproduced from the stored feature hash, model version and policy version.',
      },
      {
        id: 'FR-6',
        requirement: `Let ${owner.who} change thresholds and policy without a code release, under a change record.`,
        acceptance: 'Given an approved change record, when a threshold is changed, then the new value is live within the agreed window and the old value can be restored in one step.',
      },
      {
        id: 'FR-7',
        requirement: `Report ${lc(kpi0)} and ${lc(kpi1)} against the agreed baseline.`,
        acceptance: 'Given the agreed baseline period, when the dashboard is opened, then both measures show current value, baseline and difference, with the data source named.',
      },
    ],
    raci: [
      { activity: 'Confirm business objective and decision rights', responsible: 'Business Analyst', accountable: owner.who, consulted: `${control.who}; AI Architect`, informed: 'Delivery team' },
      { activity: 'Document AS-IS, TO-BE, journeys and requirements', responsible: 'Business Analyst', accountable: owner.who, consulted: `${operator.who}; QA / Test Engineer`, informed: 'Architects' },
      { activity: 'Measure baseline business performance', responsible: 'Data Analyst', accountable: 'Business Analyst', consulted: 'Data Engineer; finance', informed: owner.who },
      { activity: 'Approve thresholds and business policy', responsible: owner.who, accountable: owner.who, consulted: `${control.who}; Security Engineer`, informed: 'MLOps Engineer; operations' },
      { activity: 'Design the integration and architecture', responsible: 'Solution Architect', accountable: 'Solution Architect', consulted: 'AI Architect; Platform Engineer; Security Engineer', informed: 'Business Analyst' },
      { activity: 'Choose the model strategy and AI risk controls', responsible: 'AI Architect', accountable: 'AI Architect', consulted: `Data Scientist; ${control.who}`, informed: 'Business Analyst' },
      { activity: 'Build, validate and release the model', responsible: 'Data Scientist; ML Engineer; MLOps Engineer', accountable: 'AI Architect', consulted: 'QA / Test Engineer; Security Engineer', informed: owner.who },
      { activity: 'Security and privacy sign-off', responsible: 'Security Engineer', accountable: 'Security Engineer', consulted: 'Platform Engineer; Solution Architect', informed: owner.who },
      { activity: 'Go-live approval', responsible: 'SRE / DevOps Engineer; QA / Test Engineer', accountable: owner.who, consulted: 'All roles', informed: `${operator.who}` },
      { activity: 'Track benefit against the baseline', responsible: 'Business Analyst', accountable: owner.who, consulted: 'Data Analyst; finance', informed: 'Steering group' },
    ],
    businessCase: {
      baseline: `Not yet measured. Capture ${raw.on.slice(0, 3).map((m) => lc(strip(m))).join('; ')} from the system of record before build, over at least one label-maturity window (${LABEL_DELAY[domain]}).`,
      target: `Improve ${lc(kpi0)} against the measured baseline while holding ${lc(kpi1)} inside a guardrail the business owner sets. Targets are set in discovery, never inferred from this page.`,
      valueDrivers: raw.on.slice(0, 3).map((m) => strip(m)),
      costs: [
        `Run cost of the model plane: about ${usd(scale.monthlyTotalUSD)} per month at the default workload (${usd(scale.costPer1kUSD)} per 1,000 decisions); a planning model, not a quote`,
        'Build and integration effort across the roles involved, estimated once discovery is complete',
        'Human review and change management for the operating team',
      ],
      roiFormula: 'ROI = (measured benefit per period − run cost per period − amortised build cost) ÷ (run cost per period + amortised build cost)',
      measurement: [
        'Phased rollout or a randomly held-out group so benefit is a difference, not an assertion',
        `Count benefit only from matured labels (${LABEL_DELAY[domain]})`,
        'Finance agrees the unit value of each outcome before launch, and reviews the figures at each quarterly benefit review',
      ],
      assumptions: [
        'Volumes follow the modelled workload; replace them with real volumes in discovery',
        'Run cost uses public-price planning rates; replace with the negotiated cloud rates',
      ],
    },
    exitGate: [
      { criterion: 'Every discovery question has a confirmed answer with a named owner', owner: 'Business Analyst', status: 'open' },
      { criterion: 'AS-IS process, TO-BE process and user journeys are agreed with the people who run them', owner: 'Business Analyst', status: 'open' },
      { criterion: 'Baseline business performance is measured, not estimated', owner: 'Data Analyst', status: 'open' },
      { criterion: 'Functional requirements and acceptance criteria are approved', owner: owner.who, status: 'open' },
      { criterion: 'RACI is agreed and the policy approver is named', owner: owner.who, status: 'open' },
      { criterion: 'ROI measure, unit values and data source are agreed with finance', owner: owner.who, status: 'open' },
      { criterion: 'Consuming applications and systems of record are confirmed with their owners', owner: 'Solution Architect', status: 'open' },
      { criterion: 'Data owners and access are confirmed for every source', owner: 'Data Engineer', status: 'open' },
      { criterion: `The ${gov.riskTier} risk tier and its approval path are accepted`, owner: 'Security Engineer', status: 'open' },
    ],
  };
}
