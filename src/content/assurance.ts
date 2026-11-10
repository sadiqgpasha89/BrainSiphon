/**
 * Two views that gather what a blueprint already says about evaluation and guardrails into one place each.
 *
 * Nothing here is new content. A blueprint's evaluation detail is spread over four sections (Evaluation, Statistical
 * validation, Metrics catalogue, Agentic solution) and its guardrails over five (Problem, Low-level design, Statistical
 * validation, Agentic solution, MLOps). A reader who opens "Evaluation" or looks for "guardrails" should find the whole
 * answer there, so these functions select and arrange existing fields; the page and the markdown export both render them.
 */
import type { UseCase } from '../schemas/usecase.schema';

export interface EvaluationPlan {
  /** the causal question the evaluation has to answer, and the quantity it estimates */
  question: string;
  estimand: string;
  /** how offline evaluation must be run for its number to mean anything */
  protocol: { item: string; how: string }[];
  /** slices every metric is reported on */
  slices: string[];
  /** release thresholds from the metrics catalogue: starting values to calibrate, never measurements */
  thresholds: { metric: string; target: string; cadence: string; onBreach: string }[];
  thresholdBasis: string;
  /** evaluation of the language model or agents, present only where the blueprint has them */
  aiQuality: { what: string; metric: string; target: string; how: string }[];
  /** the online experiment that decides whether the system ships */
  online: {
    design: string;
    unit: string;
    why: string;
    primary: string;
    guardrails: string[];
    stopping: string[];
  };
  /** what keeps evaluating the system after launch */
  continuous: { triggers: string[]; championChallenger: string; dataMaturity: string };
  /** executable checks in the starter kit, each with its pass condition */
  tests: { test: string; pass: string }[];
}

const THRESHOLD_LAYERS = ['model', 'responsible'] as const;

export function evaluationPlan(uc: UseCase): EvaluationPlan {
  const x = uc.experimentation;
  const layer = (id: string) => uc.metrics.layers.find((l) => l.id === id)?.rows ?? [];
  // the model layer leads with the metrics named in the use case's own specification; two responsible-AI rows keep
  // fairness in the release decision instead of in a separate report nobody opens
  const thresholds = [...layer(THRESHOLD_LAYERS[0]).slice(0, 4), ...layer(THRESHOLD_LAYERS[1]).slice(0, 2)].map(
    (r) => ({ metric: r.metric, target: r.target, cadence: r.cadence, onBreach: r.onBreach }),
  );
  return {
    question: x.question,
    estimand: x.estimand,
    protocol: [
      { item: 'Split and sampling', how: x.sampling },
      { item: 'Label maturity', how: x.labels.maturity },
      { item: 'Label quality', how: x.labels.quality },
      { item: 'Selection bias', how: x.labels.selectionBias },
      { item: 'Calibration', how: x.calibration },
      { item: 'Uncertainty', how: x.uncertainty },
    ],
    slices: x.slices,
    thresholds,
    thresholdBasis: uc.metrics.basis,
    aiQuality: uc.agentic.evaluation,
    online: {
      design: x.design.type,
      unit: x.design.unit,
      why: x.design.why,
      primary: x.metrics.primary,
      guardrails: x.metrics.guardrails,
      stopping: x.stopping,
    },
    continuous: {
      triggers: uc.mlops.retraining.triggers,
      championChallenger: uc.mlops.retraining.championChallenger,
      dataMaturity: uc.mlops.retraining.dataMaturity,
    },
    tests: (uc.playbook?.tests ?? []).map((t) => ({ test: t.test, pass: t.pass })),
  };
}

export const GUARDRAIL_LAYERS = [
  'Hard constraint',
  'Runtime control',
  'Outcome guardrail',
  'Human oversight',
  'Degradation',
  'Stop and roll back',
] as const;
export type GuardrailLayer = (typeof GUARDRAIL_LAYERS)[number];

export interface GuardrailRow {
  layer: GuardrailLayer;
  /** what must not happen, or what must hold: several lines when one mechanism enforces them all */
  guardrails: string[];
  /** the mechanism, or mechanisms, that enforce it */
  enforcedBy: string[];
}

export interface GuardrailPlan {
  rows: GuardrailRow[];
  /** true when the request path has a language model or an agent, so prompt and tool guardrails apply */
  hasAgentControls: boolean;
  /** why there are no prompt or tool guardrails, when there are none */
  noAgentNote?: string;
  /** the autonomy ladder: how much the system may do alone, and what it must prove to do more */
  autonomy: { level: string; name: string; behaviour: string; gate: string }[];
}

/** Agent guardrails that only restate a hard constraint: folded into the hard-constraint row instead of listed twice. */
const RESTATES_CONSTRAINT = /^Violating the constraint:/;

export function guardrailPlan(uc: UseCase): GuardrailPlan {
  const agent = uc.agentic;
  const restated = agent.guardrails.find((g) => RESTATES_CONSTRAINT.test(g.risk));
  const runtime = agent.guardrails.filter((g) => !RESTATES_CONSTRAINT.test(g.risk));
  const hasAgentControls = runtime.length > 0;
  const rows: GuardrailRow[] = [
    {
      layer: 'Hard constraint',
      guardrails: uc.problemFormulation.constraints,
      enforcedBy: [
        restated?.control ??
          'Checked outside the model, in the serving path, and covered by a test: a constraint the model is merely asked to respect is not a guardrail.',
      ],
    },
    ...runtime.map((g) => ({
      layer: 'Runtime control' as const,
      guardrails: [g.risk],
      enforcedBy: [g.control],
    })),
    {
      layer: 'Outcome guardrail',
      // a named metric needs the direction spelling out; the SLO and fairness lines already state their own limit
      guardrails: uc.experimentation.metrics.guardrails.map((g) =>
        g.startsWith('"') ? `${g} must not get worse` : g,
      ),
      enforcedBy: [
        'Watched during shadow, canary and every experiment; a breach beyond the pre-agreed bound stops the rollout.',
      ],
    },
    {
      layer: 'Human oversight',
      guardrails: [`Oversight mode: ${uc.decisionMatrix.humanOversight.mode.replace(/-/g, ' ')}`],
      enforcedBy: [uc.decisionMatrix.humanOversight.detail],
    },
    ...uc.systemDesign.lld.degradationLadder
      .filter((d) => d.level > 0)
      .map((d) => ({
        layer: 'Degradation' as const,
        guardrails: [`Level ${d.level}: ${d.trigger}`],
        enforcedBy: [d.behaviour],
      })),
    {
      layer: 'Stop and roll back',
      guardrails: ['A release that breaches its limits is withdrawn'],
      enforcedBy: uc.mlops.rollback,
    },
  ];
  return {
    rows,
    hasAgentControls,
    ...(hasAgentControls
      ? {}
      : {
          noAgentNote:
            'This design has no language model or agent in the request path, so there are no prompt, retrieval or tool guardrails to list. Its guardrails are the hard constraints, the outcome metrics, the oversight mode and the degradation ladder below.',
        }),
    autonomy: agent.autonomy,
  };
}
