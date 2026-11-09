/**
 * Metrics catalogue: every number a team should watch to know this system works, is safe, is affordable and is still working next
 * quarter, grouped by layer (business, adoption, model, data, system, cost, responsible AI, security and compliance, MLOps,
 * experimentation health) plus the layers that only apply to some systems (RAG, LLM serving, agents, human review).
 *
 * Generated deterministically from the use case's own fields, never from a fixed list: its offline and online metrics, its
 * signals and their leakage risks, its pipeline stages and their latency budgets, its edge cases, its capacity model, its SLOs,
 * its regulatory obligations and its agents and tools. A layer that does not apply is not padded: the page says why it does not.
 *
 * Targets are starting thresholds, not measurements. System targets come from this blueprint's own budgets and capacity model;
 * model and business targets are stated relative to the baseline and the minimum detectable effect, because an absolute figure
 * invented without your data would be false precision.
 */
import {
  isAgentic,
  type Agentic,
  type Archetype,
  type Domain,
  type EnterpriseContext,
  type Experimentation,
  type Governance,
  type LatencySLA,
  type MetricLayer,
  type MetricLayerId,
  type MetricRow,
  type Metrics,
  type Mlops,
  type Operations,
  type Paradigm,
  type PatternId,
} from '../schemas/usecase.schema';
import { DOMAIN_ENTERPRISE } from './enterprise-domains';
import { LABEL_DELAY, type Stance } from './extras';
import { m, type Stage } from './design';
import type { RawUseCase } from './parse';
import { usd, type ScaleResult } from './scale';

export interface MetricsCtx {
  raw: RawUseCase;
  domain: Domain;
  paradigms: Paradigm[];
  latency: LatencySLA;
  pattern: PatternId;
  archetype: Archetype;
  stance: Stance;
  scale: ScaleResult;
  stages: Stage[];
  features: string[];
  agentic: Agentic;
  operations: Operations;
  governance: Governance;
  experimentation: Experimentation;
  mlops: Mlops;
  enterprise: EnterpriseContext;
  /** recovery-time objective in words, from the disaster-recovery plan */
  rtoText: string;
}

/* ------------------------------------------------------------------ helpers */

const strip = (s: string) => s.trim().replace(/[.;]+$/, '');
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const cut = (s: string, n = 120) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
const q = (s: string) => `"${strip(s)}"`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (n: number) => Math.round(n).toLocaleString('en-US');

type Kind = MetricRow['kind'];
const row = (metric: string, kind: Kind, definition: string, target: string, cadence: string, owner: string, onBreach: string): MetricRow => ({
  metric,
  kind,
  definition,
  target,
  cadence,
  owner,
  onBreach,
});

const LAYER_TITLE: Record<MetricLayerId, string> = {
  business: 'Business and value',
  adoption: 'Adoption, trust and experience',
  model: 'Model quality',
  data: 'Data and features',
  system: 'System and reliability',
  cost: 'Cost and sustainability',
  responsible: 'Responsible AI',
  security: 'Security, privacy and compliance',
  mlops: 'MLOps and delivery',
  experiment: 'Experimentation health',
  rag: 'RAG: retrieval and grounding',
  llm: 'LLM serving and generation',
  agent: 'Agents',
  hitl: 'Human review',
};

const LAYER_WHY: Record<MetricLayerId, string> = {
  business: 'The only layer that says the system is worth running. Everything below is a reason to believe this layer will move, or a warning that it is about to stop.',
  adoption: 'A correct output nobody acts on, or acts on against their judgement, creates no value. These metrics show whether people use, trust and understand the output.',
  model: 'Offline quality on matured labels and the slices that matter. It is a screening step: a gain here is not a result until the business layer agrees.',
  data: 'Most production incidents begin as a data change. These metrics catch stale, missing, skewed or leaking inputs before the model does anything wrong with them.',
  system: 'Whether the service answers inside its deadline, stays up, and degrades on purpose instead of by accident. Numbers come from the stage budgets and SLOs in this blueprint.',
  cost: 'A system that works but costs more than the value it creates is a failed system. Tracks unit cost against the capacity model, and the energy it burns.',
  responsible: 'Fairness, explainability and human control, measured rather than asserted, at the strictness the risk tier requires.',
  security: 'Abuse, leakage and obligations, with the evidence an auditor would ask for tracked as a number with an owner and a cadence.',
  mlops: 'How safely and quickly the model changes: retraining freshness, promotion gates, rollback and reproducibility.',
  experiment: 'Whether the experiments that justify the system can be trusted: assignment, power, and agreement between offline and online results.',
  rag: 'A retrieval-grounded answer fails in two places, finding the evidence and using it faithfully. Measure both separately or you cannot tell which broke.',
  llm: 'Language-model behaviour that conventional model metrics do not see: token economics, first-token latency, format validity, safety and provider drift.',
  agent: 'An agent is a loop with tools, so the unit of measure is the trajectory: did it finish, with valid evidence, inside its step, cost and permission budgets.',
  hitl: 'The review queue is part of the system. Its backlog, agreement and overturn rates decide the real accuracy, latency and label quality.',
};

/* ------------------------------------------------------------------ builder */

export function buildMetrics(c: MetricsCtx): Metrics {
  const { raw, domain, archetype, scale, stages, agentic, operations: ops, governance: gov, experimentation: xp, mlops, enterprise: ent } = c;
  const d = DOMAIN_ENTERPRISE[domain];
  const batch = scale.mode === 'batch';
  const isLlm = c.paradigms.includes('llm-agents') || c.pattern === 'llm-agent' || c.pattern === 'llm-rag';
  const hasAgents = isAgentic(agentic.fit) && agentic.agents.length > 0;
  const retrieve = stages.find((s) => s.kind === 'retrieve');
  const human = stages.find((s) => s.kind === 'human');
  const feature = stages.find((s) => s.kind === 'feature');
  const model = stages.find((s) => s.kind === 'model') ?? stages[0]!;
  const hasRag = c.pattern === 'llm-rag' || (Boolean(retrieve) && isLlm);
  const hasLlm = isLlm || hasAgents;
  const personal = archetype !== 'forecasting' && archetype !== 'optimisation' && archetype !== 'computer-vision';
  const strict = gov.riskTier === 'high' || gov.riskTier === 'critical';
  const unit = d.unit;
  const bizOwner = d.stakeholders[0]!.who;
  const modelOwner = `${d.team} model owner`;
  const dataOwner = d.owners[0]!;
  const north = strip(raw.on[0] ?? 'the north-star business metric');
  const guard = strip(raw.on[1] ?? 'the guardrail metric');
  const baseName = strip(raw.base).split(',')[0]!;
  // person-level slices make no sense for a forecast, a plan or a camera: use the cuts that decide whether it is trusted
  const slices =
    archetype === 'forecasting'
      ? ['Forecast horizon', 'Promoted versus regular periods', 'New, intermittent and long-tail series']
      : archetype === 'optimisation'
        ? ['Site and shift', 'Tight versus slack-capacity days', 'Peak versus normal demand periods']
        : archetype === 'computer-vision'
          ? ['Camera, line and station', 'Lighting and product variant', 'Shift and time of day']
          : xp.slices.slice(0, 3);
  const sliceA = slices[0]!;
  const sliceList = slices.slice(0, 2).map((x) => cut(x, 50)).join('; ');
  const maturity = batch ? 'Per run' : 'Weekly on matured labels, daily on proxies';
  const sync = stages.filter((s) => !s.async);
  const steps = raw.opts.s ?? 3;
  const slo = (i: number) => ops.slos[i]!;

  const layers: MetricLayer[] = [];
  const add = (id: MetricLayerId, rows: MetricRow[]) => layers.push({ id, title: LAYER_TITLE[id], why: LAYER_WHY[id], rows });

  /* business */
  const extraOn = raw.on.slice(2).map(strip);
  add('business', [
    row(north, 'outcome', `Incremental effect on this outcome per ${unit}, measured against a persistent holdout or control (${xp.design.type}), on matured labels.`, `Improvement over ${lc(baseName)} of at least the minimum detectable effect fixed before launch (α = ${xp.power.alpha}, power ${Math.round(xp.power.power * 100)}%).`, maturity, bizOwner, 'Hold promotion; re-check label maturity and the holdout; roll back if the interval excludes the minimum effect.'),
    row(guard, 'guardrail', 'The harm the system must not cause while it chases the north star. Non-inferiority test against the control, not a point estimate.', 'No worse than control beyond the non-inferiority bound agreed up front.', batch ? 'Per run' : 'Daily, with a live burn-rate alert', bizOwner, 'Automatic halt of the canary and rollback to the previous champion; open an incident if production is affected.'),
    ...extraOn.map((e, i) => row(e, i === 0 ? 'outcome' : 'guardrail', 'Secondary business measure named in the specification, tracked beside the north star so a gain on one is not paid for on the other.', 'Reported with an interval; investigate any move that the north star does not explain.', maturity, bizOwner, 'Add to the weekly business review; escalate if it moves against the north star.')),
    row('Net value after all-in cost', 'outcome', 'Incremental benefit in money minus the all-in run cost (compute, platform, storage, retraining, observability, transfer, backup and human review).', `Positive and above the modelled all-in run cost of ${usd(scale.monthlyAllInUSD)} per month (range ${usd(scale.costRange.low)} to ${usd(scale.costRange.high)}).`, 'Monthly', bizOwner, 'Re-run the business case; narrow scope or retire the feature that costs more than it returns.'),
    row('Durability of the effect', 'outcome', 'Effect size re-measured at 30 and 90 days against the launch measurement, to separate novelty and adversary or customer adaptation from real value.', 'Effect at 90 days still inside the launch interval.', 'At 30 and 90 days, then quarterly', bizOwner, 'Treat a decaying effect as drift: open a challenger and review the feature set.'),
    row(batch ? 'Decision-ready lead time' : 'Decision coverage', 'leading', batch ? 'Time from the data cut-off to a published output that downstream teams can use, per run.' : `Share of eligible ${unit}s that receive a model decision rather than a default or a manual path.`, batch ? "Inside the run window in the capacity model, with output published before the consumer's cut-off." : 'Coverage above the level assumed in the business case; falls are investigated as incidents.', batch ? 'Per run' : 'Daily', bizOwner, 'Check upstream freshness and the degradation ladder; widen coverage only with the guardrail intact.'),
  ]);

  /* adoption */
  add('adoption', [
    row('Acted-on rate', 'leading', `Share of outputs that a person or downstream system actually uses to decide or act, as opposed to ignores, re-does or overrides, per ${unit}.`, 'Rising for the first 90 days after launch, then stable; a sustained fall is the earliest sign of lost trust.', 'Weekly', bizOwner, 'Interview the users who ignore it; check explanation quality and false-alarm rate before touching the model.'),
    row('Override rate and direction', 'diagnostic', `Share of decisions a human or downstream rule reverses, split by direction: too strict (harm to ${lc(guard)}) versus too lenient (leakage on ${lc(north)}). Each override is logged as a labelled outcome.`, 'Stable inside a band set from the first 30 days; every spike is explained within one working day.', 'Daily', modelOwner, 'Sample the overridden cases, feed them to the labelling queue and test whether a threshold or a feature is wrong.'),
    row('Explanation usefulness', 'diagnostic', `Share of users who open the ${strict ? 'reason codes' : 'explanation'} and rate them useful, plus the share of decisions that carry one.`, strict ? '100% of adverse or high-impact decisions carry an explanation; usefulness rated by a sampled panel.' : 'Explanation present on the decisions that need one; usefulness tracked by a sampled panel.', 'Monthly', modelOwner, 'Revise the explanation text and the reason-code taxonomy with the people who read them.'),
    row(`Contest and complaint rate per 1,000 ${unit}s`, 'guardrail', `Appeals, disputes and complaints that cite this system, per 1,000 ${unit}s, with the overturn share and resolution time.`, 'No worse than before launch; overturn share reviewed monthly.', 'Weekly', bizOwner, 'Route to the oversight owner; each overturned case becomes a labelled example in the next training set.'),
    row(batch ? 'Consumer satisfaction' : 'Task satisfaction', 'outcome', `Short survey or thumbs signal from the people who depend on this output (${d.stakeholders[1]!.who}), reported by segment.`, 'At least the level of the process it replaced, by segment.', 'Quarterly', bizOwner, 'Add the lowest-scoring segment to the next slice review.'),
  ]);

  /* model */
  const offRows = raw.off.map(strip).map((o, i) =>
    row(o, i === 0 ? 'leading' : 'diagnostic', 'Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice.', `Beat ${lc(baseName)} by more than its interval on the same split; no slice below its floor.`, 'Every training run, then weekly on matured labels', 'Data scientist', 'Block promotion; compare against the champion on the frozen golden set before changing anything.'),
  );
  add('model', [
    ...offRows,
    ...archetypeModelRows(archetype, c.pattern, unit, north),
    row(`Worst-slice performance: ${cut(sliceA, 60)}`, 'guardrail', `Primary metric on each slice (${sliceList}) against the overall result.`, 'Every slice above its floor; a breach is a release blocker.', 'Every training run and weekly', 'Data scientist', 'Do not promote; add slice-aware features or data, or restrict the policy for that slice.'),
    row('Lift over the baseline', 'diagnostic', `Gain of the production model over ${lc(baseName)} on the primary offline metric, divided by the extra run cost it brings.`, 'Lift is worth its extra cost: if it falls under the cost of complexity, the baseline wins.', 'Per release', modelOwner, 'Fall back to the baseline rung of the degradation ladder and re-open the model choice.'),
    row('Calibration error (ECE) and reliability', 'guardrail', 'Gap between predicted and observed rates in equal-mass bins, overall and per slice. Thresholds and costs act on the probability, not the rank.', strict ? 'ECE at or below 0.02 overall and 0.05 on each slice (starting thresholds).' : 'ECE at or below 0.05 overall (starting threshold).', 'Weekly on matured labels', 'Data scientist', 'Recalibrate (isotonic or Platt) per segment; do not move thresholds on a miscalibrated score.'),
    row('Champion versus challenger gap', 'diagnostic', 'Difference between the live model and the best challenger on the same matured window, with an interval.', 'Challenger inside the champion interval; a clear, repeated lead triggers promotion review.', 'Weekly', modelOwner, 'Start the promotion gates in the MLOps section for the challenger.'),
  ]);

  /* data */
  const sources = ent.data.sources;
  const dataRows: MetricRow[] = [
    ...raw.sig.slice(0, 3).map(([name, , , leak], i) => {
      const ing = sources[i]?.ingestion;
      return row(`Freshness and leakage guard: ${name}`, 'guardrail', `${ing ? `Event-to-feature delay and null rate for this input (${lc(strip(ing))}). ` : ''}Automated point-in-time test that fails when: ${lc(strip(leak!))}.`, `${ing && /\d+\s*(ms|seconds?|minutes?)/.test(ing) ? 'Delay inside the contract stated above; ' : 'Freshness inside the data contract; '}zero point-in-time violations in the training set.`, batch ? 'Per run' : 'Continuous, alert on a missed window', dataOwner, 'Quarantine the partition and serve the last good value flagged stale; fix the producer or the join.');
    }),
    row('Training-serving skew', 'diagnostic', `Distribution distance (PSI or KS) between each served feature (starting with ${raw.sig.slice(0, 3).map((f) => f[0]).join(', ')}) and the same feature in the training snapshot, plus a row-level parity check on a sampled request replay.`, 'PSI under 0.1 per feature; investigate between 0.1 and 0.2; act above 0.2 (starting thresholds). Replay parity above 99.9%.', batch ? 'Per run' : 'Hourly', dataOwner, 'Find the feature whose online and offline code paths differ; ship one implementation to both.'),
    row('Population drift', 'leading', `Input distribution on production traffic versus the training window, plus prediction-score drift. ${LABEL_DELAY[domain]}`, 'No sustained drift above 0.2 PSI on a top feature without a matching quality drop being ruled out.', 'Daily', 'Data scientist', 'Open an investigation; retrain only on a confirmed matured-label drop (see MLOps triggers).'),
    row('Label maturity and delay', 'diagnostic', 'Share of training rows whose label has matured, and the label delay at p50 and p90, per source. Rows whose labels are still arriving are censored, not negatives.', 'Training and evaluation use only matured windows; delay tracked against the horizon in the experimentation section.', 'Weekly', dataOwner, 'Shorten the window or add a survival-aware label model; never train on unmatured negatives.'),
    row('Contract violations and quarantine', 'guardrail', 'Records rejected or quarantined by the schema, range and uniqueness checks of the data contract, with the duplicate and late-event shares.', 'Duplicates below 0.01% and completeness at or above 99.9% on required fields, as in the contract example.', 'Continuous', dataOwner, 'Notify the producer; apply the on_breach action in the contract (quarantine and serve stale).'),
    row('Banned-feature check', 'guardrail', `Automated test that none of the features the specification calls noise (${raw.noise.slice(0, 3).map((n) => cut(strip(n[0]!), 40)).join('; ')}) or any prohibited attribute enters the feature set.`, 'Zero occurrences in the training set, feature store and serving path.', 'Every build', dataOwner, 'Fail the pipeline; remove the feature and retrain.'),
  ];
  if (feature) dataRows.push(row(`Feature cache hit rate: ${feature.label}`, 'diagnostic', 'Share of lookups served from cache within the staleness limit, and the share served stale with a flag.', 'Hit rate above the level assumed in the latency budget; stale-flagged share inside the degraded-path SLO.', 'Continuous', 'ML platform', 'Re-warm the cache; widen the stale window only with a stated accuracy cost.'));
  add('data', dataRows);

  /* system */
  const stageRows = (batch ? sync.slice(0, 4) : sync.filter((s) => s.budgetMs !== null)).map((s) =>
    batch
      ? row(`Stage runtime: ${s.label}`, 'diagnostic', `Wall-clock time of ${s.label} (${s.tech}) as a share of the run window.`, 'No stage above 40% of the window; growth over 20% week on week is investigated.', 'Per run', 'ML platform', 'Profile the stage; add parallelism or move work off the critical path.')
      : row(`Stage latency: ${s.label}`, 'leading', `p99 latency of ${s.label} (${s.tech}), as a histogram from the stage's own span.`, `p99 at or below ${s.budgetMs} ms (its slice of the budget in the HLD).`, 'Continuous, burn-rate alert', 'ML platform', 'Shed optional work first; tune this stage before widening the end-to-end budget.'),
  );
  const sysRows: MetricRow[] = [
    row(slo(1).sli, 'guardrail', batch ? 'Duration of the run from trigger to atomic publish.' : 'Server-side latency from request to decision, per region, as a histogram.', slo(1).slo, 'Continuous', 'SRE', 'Page on burn rate; follow the degradation ladder before adding capacity.'),
    ...stageRows,
    row(slo(0).sli, 'guardrail', 'Successful, deadline-respecting responses over valid requests.', `${slo(0).slo}; error budget ${slo(0).errorBudget}.`, 'Continuous', 'SRE', 'Freeze risky releases when the budget burns faster than the multi-window alert.'),
    row(slo(4).sli, 'guardrail', 'Share of decisions made below the full model path (fallback, stale features, baseline rung).', slo(4).slo, 'Continuous', 'ML platform', 'Treat a sustained rise as an incident in the dependency that triggered the fallback.'),
    row(`Saturation: ${scale.nodeUnit}`, 'leading', `${scale.nodeUnit} utilisation, queue depth and queue wait against the remaining deadline.`, batch ? `${num(scale.nodes)} ${scale.nodeUnit} provisioned for ${num(scale.eventsPerDay)} rows per run (modelled utilisation ${r1(scale.utilisation * 100)}%); the run finishes inside its window with headroom for a backfill.` : `Planned peak utilisation ${r1(scale.utilisation * 100)}% on ${num(scale.nodes)} ${scale.nodeUnit} for ${num(scale.provisionedQps)} req/s; queue wait under 30% of the deadline.`, 'Continuous', 'SRE', 'Autoscale on queue depth; shed background and retry traffic first.'),
    row('Dependency health', 'diagnostic', `Error, timeout and retry rate per dependency (${[feature?.label, retrieve?.label, model.label].filter(Boolean).join(', ')}), with breaker state.`, 'Breaker closed; retries under 5% of calls (starting threshold).', 'Continuous', 'ML platform', 'Open the breaker, use cached or default values with a flag and page the owner.'),
    row('Event-bus consumer lag', 'diagnostic', 'Lag of the decision-log and label consumers, which feed audit and retraining.', batch ? 'Zero lag at run close.' : 'Lag inside the freshness target of the downstream feature and label jobs.', 'Continuous', dataOwner, 'Scale consumers or partitions; replay from the log once healthy.'),
    row('Detect, acknowledge, recover (SEV1)', 'guardrail', 'Time to detect, to acknowledge and to restore service for the highest severity, from the incident record.', `Acknowledge in 15 minutes; recovery inside RTO ${c.rtoText}.`, 'Per incident and quarterly game day', 'SRE', 'Run the blameless review; add the missing alert or runbook step.'),
  ];
  if (scale.computeClass.startsWith('gpu'))
    sysRows.push(row('Accelerator utilisation and batch occupancy', 'diagnostic', 'GPU compute and memory use, achieved batch size and the share of requests waiting for a batch to fill.', 'Occupancy high enough to meet cost per 1,000 decisions without breaking the latency stage budget.', 'Continuous', 'Inference engineer', 'Retune dynamic batching, quantisation or the model tier.'));
  if (human) sysRows.push(row('Exception queue size and age', 'guardrail', `Items waiting in ${human.label} for a person, with the age of the oldest.`, 'Oldest item younger than the review SLA in the Human review layer.', 'Continuous', modelOwner, 'Add reviewers or route low-risk items to a faster tier.'));
  add('system', sysRows);

  /* cost */
  const costRows: MetricRow[] = [
    row(slo(5).sli, 'guardrail', 'Monthly run cost divided by monthly decisions, from billing tags.', `${slo(5).slo}; ${slo(5).errorBudget}.`, 'Monthly', 'FinOps', 'Review the largest cost line first; right-size before changing the model.'),
    row(`Cost per ${scale.outcomeUnit}`, 'outcome', `All-in monthly cost divided by business outcomes (${scale.outcomeUnit}s), including retraining, observability, transfer, backup and human review.`, `${usd(scale.costPerOutcomeUSD)} modelled at the published workload; alert above 120% of it.`, 'Monthly', 'FinOps', 'Compare against value per outcome; if the margin is gone, cut tiers or scope.'),
    row('Compute utilisation and idle spend', 'diagnostic', `Used versus provisioned ${scale.nodeUnit} over the month, and spend on capacity that served nothing.`, `Measured use of the ${num(scale.nodes)} provisioned ${scale.nodeUnit} stays near the modelled ${r1(scale.utilisation * 100)}%; pools running under half of the modelled figure are flagged for right-sizing.`, 'Weekly', 'FinOps', 'Right-size pools; schedule batch work into off-peak windows.'),
    row('Retraining and evaluation spend', 'diagnostic', 'Compute and labelling cost per retraining cycle and per evaluation run, per month.', 'Inside the modelled share of the all-in cost; a cycle that cannot beat the champion is stopped early.', 'Per cycle', 'FinOps', 'Cut the schedule to the drift and label-maturity triggers; cache features between runs.'),
    row('Energy and carbon per 1,000 decisions', 'diagnostic', "Estimated kWh and gCO2e per 1,000 decisions from node-hours, utilisation and the region's grid intensity.", 'Tracked and falling or flat as traffic grows; reported with the cost figure.', 'Monthly', 'FinOps', 'Prefer lower-carbon regions for batch work, smaller models for easy cases and higher utilisation.'),
  ];
  if (human) costRows.push(row('Human review cost share', 'diagnostic', 'Reviewer hours times loaded rate as a share of the all-in cost, and cost per reviewed item.', 'Falling as precision of the queue improves; share inside the modelled review rate.', 'Monthly', 'FinOps', 'Raise the auto-decision band only with the guardrail intact.'));
  if (hasLlm) costRows.push(row('Token spend share', 'diagnostic', 'Provider or GPU cost of input and output tokens as a share of the all-in cost, per model tier.', 'Inside budget per request; cached and small-model shares tracked.', 'Weekly', 'FinOps', 'Add caching, shorten context, route easy requests to the small tier.'));
  add('cost', costRows);

  /* responsible */
  add('responsible', [
    row(personal ? 'Fairness gap across slices' : 'Performance gap across segments', 'guardrail', personal ? `Difference in the primary error rate and in selection rate between slices (${sliceList}), with intervals.` : `Difference in the primary error between segments (${sliceList}), with intervals, so no group is systematically under-served.`, strict ? 'Gap within the tolerance agreed with risk and legal; selection-rate ratio at or above 0.8 where a four-fifths test applies (starting threshold).' : 'Gap no worse than the control, with the tolerance written down.', 'Every release and monthly', 'Responsible AI lead', 'Release blocker; investigate features that proxy a protected class and re-run the slice report.'),
    row('Explanation coverage and fidelity', 'guardrail', 'Share of decisions returned with reason codes or citations, and agreement of the stated reason with an independent attribution on a sample.', strict ? '100% coverage on adverse decisions; sampled fidelity reviewed monthly.' : 'Coverage on the decisions that need an explanation.', 'Monthly sample', modelOwner, 'Fix the reason-code mapping; stop returning codes that cannot be reproduced from the ledger.'),
    row('Human oversight in practice', 'guardrail', 'Time to halt the system from the stop control, share of required reviews that happened inside their time limit, and override handling.', 'Stop drill succeeds inside the incident target; no required review skipped.', 'Quarterly drill', 'Risk owner', 'Treat a failed drill as a SEV2; fix authority, tooling or paging.'),
    row('Appeal overturn rate and time to resolve', 'diagnostic', 'Share of contested decisions overturned, and median days to a final answer.', 'Resolution inside the policy window; overturn reasons reviewed for patterns.', 'Monthly', 'Risk owner', 'Add overturned patterns to the golden set and the slice report.'),
    row('Model documentation currency', 'diagnostic', 'Share of production versions whose model card, intended-use statement and limitations are current and approved.', '100% of production versions; approval trail attached.', 'Per release', modelOwner, 'Block the release until the card is current.'),
  ]);

  /* security, privacy and compliance */
  const threat = gov.aiSecurity[0]!;
  const securityRows: MetricRow[] = [
    row(`Abuse and probing: ${cut(strip(threat.threat), 70)}`, 'guardrail', `Callers or sessions flagged for the behaviour behind this threat, and the share blocked or throttled. Control in place: ${lc(cut(strip(threat.control), 110))}.`, 'Flagged sessions triaged inside a working day; no successful evasion in the red-team replay.', 'Continuous', 'Security', 'Throttle or block the caller, rotate thresholds near the boundary and add the pattern to the red-team set.'),
    row('Sensitive data in logs, caches and features', 'guardrail', `Count of unredacted sensitive fields (${lc(cut(d.classification, 70))}) found by scanning sampled logs, traces, caches and training snapshots.`, 'Zero unredacted sensitive fields in any sampled log, trace, cache or snapshot.', 'Weekly scan', 'Security', 'Purge, fix the redaction rule, and review who could read it.'),
    row('Artifact provenance', 'guardrail', 'Share of production models, datasets and containers that are signed, scanned and present in the ML bill of materials.', '100% of production artifacts signed, scanned and listed in the bill of materials.', 'Per release', 'Security', 'Block deployment; investigate any unsigned artifact as a supply-chain event.'),
    row('Deletion and retention propagation', 'guardrail', 'Time from a deletion request or retention expiry to removal from features, embeddings, caches and training snapshots.', 'Inside the statutory or contractual window for this domain.', 'Monthly sample', 'Privacy officer', 'Fix the lineage gap that kept the data; re-run the deletion.'),
    row('Decision-ledger completeness and replay', 'guardrail', 'Share of decisions with a complete ledger entry (inputs hash, model version, policy version, output), and the share of a sampled set that replays to the same output.', '100% complete; sampled replay reproduces the output.', 'Daily and monthly sample', modelOwner, 'Stop promotion until the ledger path is fixed; an incomplete ledger is an audit finding.'),
    ...gov.regulatory.slice(0, 3).map((r) => row(`Evidence freshness: ${cut(strip(r.obligation), 70)}`, 'diagnostic', `Age of the evidence for this obligation: ${lc(cut(strip(r.evidence), 120))}.`, `Evidence refreshed ${lc(r.cadence)}.`, r.cadence, r.owner, 'Escalate to the control owner before the evidence goes stale; record the exception.')),
  ];
  if (c.stance === 'residency-pinned') securityRows.push(row('Cross-border access to regulated state', 'guardrail', 'Reads or writes of pinned records from outside their jurisdiction, from the access log.', 'Zero outside the approved token and derived-feature paths.', 'Continuous', 'Platform engineering', 'Block the path and open a compliance incident.'));
  if (c.stance === 'tenant-isolated') securityRows.push(row('Cross-tenant access attempts', 'guardrail', 'Requests that reach data outside the caller tenant, caught by the policy layer, and any that are not caught.', 'Zero uncaught; every blocked attempt reviewed.', 'Continuous', 'Security', 'Revoke the credentials and audit the cell.'));
  add('security', securityRows);

  /* MLOps */
  const trigger = strip(mlops.retraining.triggers[0]!);
  add('mlops', [
    row('Model age against its label horizon', 'leading', `Days since the champion was trained on a fully matured window. Retraining trigger: ${lc(cut(trigger, 140))}.`, 'Younger than the scheduled refresh; never older than the label horizon.', 'Daily', 'MLOps engineer', 'Start the retraining pipeline; if it fails, keep the champion and freeze promotion.'),
    row('Retraining pipeline reliability', 'guardrail', 'Success rate and duration of scheduled training runs, and the time from trigger to a registered candidate.', 'Two consecutive failures page the owner; duration inside the retraining window.', 'Per run', 'MLOps engineer', 'Re-run from the last good dataset snapshot; add a contract or resource test for the failing step.'),
    row('Promotion gate pass rate and shadow disagreement', 'diagnostic', 'Share of candidates that pass all release gates, and the disagreement rate between challenger and champion in shadow.', 'Gates unchanged by hand; shadow disagreement explained before canary.', 'Per candidate', 'MLOps engineer', 'Hold the candidate; add the disagreeing cases to the golden set.'),
    row('Time to roll back', 'guardrail', `Time from a decision to roll back to traffic fully on the previous version. ${cut(strip(ops.release.rollback), 130)}.`, 'Rehearsed every quarter and inside the incident acknowledgement target.', 'Quarterly rehearsal', 'MLOps engineer', 'Fix the slowest step; a rollback that has never been rehearsed is assumed broken.'),
    row('Change failure rate and lead time', 'diagnostic', 'Share of model or pipeline changes that cause a rollback or incident, and time from merge to production.', 'Change failure rate falling; lead time short enough that fixes are not batched.', 'Monthly', 'MLOps engineer', 'Reduce batch size of changes; strengthen the gate that missed it.'),
    row('Reproducibility', 'guardrail', 'Share of registry versions that can be rebuilt from recorded code, data snapshot and config with metrics inside tolerance.', '100% of production versions.', 'Per release and quarterly sample', 'MLOps engineer', 'Freeze the version until its inputs are recorded.'),
    row('Regression test for the offline-online trap', 'guardrail', `A test in the regression suite for the known trap: ${lc(cut(strip(raw.gap[0] ?? 'offline gains that do not transfer online'), 130))}.`, 'Passing on every candidate; the trap is checked, not assumed away.', 'Every candidate', 'Data scientist', 'Fail the candidate and fix the split, label or feature that causes the gap.'),
  ]);

  /* experimentation health */
  add('experiment', [
    row('Sample ratio mismatch', 'guardrail', 'Chi-square test of actual versus intended arm sizes for every experiment.', 'p-value above 0.001; a smaller value invalidates the readout (standard practice).', 'Per experiment, daily', 'Experimentation lead', 'Stop the readout; find the assignment, logging or filtering bug before analysing.'),
    row('Realised power and minimum detectable effect', 'diagnostic', `Power achieved at the observed variance against the minimum effect that pays for the change. Design: ${xp.design.type}.`, `Power at least ${Math.round(xp.power.power * 100)}% at the planned minimum effect; duration covers whole weekly cycles and the label delay.`, 'Per experiment', 'Experimentation lead', 'Extend the test or reduce variance (CUPED); do not read an underpowered test.'),
    row('Offline-online agreement', 'leading', `Share of past launches where the sign and rough size of the offline gain on ${q(raw.off[0] ?? 'the offline metric')} matched the online effect on ${q(north)}.`, 'Agreement tracked across launches; a falling rate means the offline set no longer represents production.', 'Per launch', 'Data scientist', 'Rebuild the offline evaluation set from recent production and re-check the known trap.'),
    row('Holdout health', 'diagnostic', 'Size, stability and contamination of the persistent holdout, and the share of the randomised slice that is observed.', 'Holdout never receives the new policy; exploration slice logged with its propensity.', 'Monthly', 'Experimentation lead', 'Refresh the holdout and re-estimate propensities.'),
  ]);

  /* layers that only apply to some systems: an absent layer says why */
  const notApplicable: Metrics['notApplicable'] = [];

  if (hasRag) {
    const where = retrieve ? `${retrieve.label} (${retrieve.tech})` : 'the retrieval step';
    add('rag', [
      row('Retrieval hit rate, recall and MRR at k', 'leading', `Share of golden questions whose supporting evidence is in the top k from ${where}, with recall@k and mean reciprocal rank, by question type.`, 'Above the baseline retriever on a frozen golden set; no question type below its floor.', 'Per index or prompt change; weekly', 'AI engineer', 'Tune chunking, hybrid weights or the reranker before touching the generator.'),
      row('Context precision and context recall', 'diagnostic', 'Share of retrieved passages that are relevant, and share of the needed evidence that was retrieved at all.', 'Precision high enough that the context window is not diluted; recall measured on questions with known evidence.', 'Per change', 'AI engineer', 'Adjust k, reranking and metadata filters.'),
      row('Faithfulness (groundedness)', 'guardrail', 'Share of claims in the answer that the cited passages support, scored by a calibrated judge and a human sample.', strict ? 'At or above 0.95 on the golden set (starting threshold for a high-risk tier).' : 'At or above 0.90 on the golden set (starting threshold).', 'Per change and on a weekly production sample', 'AI engineer', 'Hold the release; tighten the prompt to cite or abstain, and add the failing cases to the set.'),
      row('Citation precision and recall', 'guardrail', 'Share of citations that point at a passage that supports the claim, and share of claims that carry a citation.', 'Every factual claim cited; invalid citations near zero.', 'Weekly sample', 'AI engineer', 'Verify citations programmatically before display; drop unverifiable ones.'),
      row('Answer relevance and completeness', 'leading', 'Judge and human score of whether the answer addresses the question and covers what the evidence supports.', 'At or above the champion on the golden set; judge-human agreement (κ) at least 0.7.', 'Per change', 'AI engineer', 'Recalibrate the judge against fresh human labels.'),
      row('Abstention quality', 'guardrail', 'Share of unanswerable questions where the system declines (correct abstention), against answerable questions it refuses (over-abstention).', 'Answers given without evidence close to zero; over-abstention tracked as a cost.', 'Weekly', 'AI engineer', 'Move the confidence threshold; improve retrieval for the refused types.'),
      row('Index freshness and ingestion health', 'guardrail', 'Delay from a source change to the passage being searchable, ingestion and parse failure rates, and the share of near-duplicate chunks.', 'Freshness inside the data contract; parse failures reviewed daily.', 'Continuous', dataOwner, 'Pause answers that depend on the stale source or flag them; backfill the failed documents.'),
      row('Access-control correctness', 'guardrail', 'Retrieved passages the requesting user is not entitled to see, found by the permission test set and by log audit.', 'Zero retrieved passages the requesting user may not see.', 'Every index change and daily audit', 'Security', 'Disable retrieval from the affected source until the filter is fixed.'),
      row('Stale and conflicting source handling', 'diagnostic', 'Answers that cite an outdated version, or merge sources that disagree without saying so, on a seeded test set.', 'Superseded content never preferred over its current version.', 'Weekly', 'AI engineer', 'Add version metadata and a recency or authority rule to the ranker.'),
    ]);
  } else {
    notApplicable.push({
      layer: 'rag',
      reason: `${raw.title} does not answer questions from a retrieved document corpus: ${retrieve ? `its retrieval stage (${retrieve.label}) fetches ${archetype === 'recommendation' ? 'candidate items to rank' : 'features or candidates for a model, not evidence for a generated answer'}, so recall@k of candidates is tracked in the Model quality layer instead` : 'there is no retrieval stage in the pipeline'}. Add this layer if a document-grounded assistant is bolted on later.`,
    });
  }

  if (hasLlm) {
    const t = raw.opts.t;
    const budget = t ? `${num(steps * t)} output tokens per request (${steps} steps × ${t}); alert at 1.5×` : 'Inside the per-step token budget in the capacity model; alert at 1.5×';
    add('llm', [
      row('Time to first token and inter-token latency', 'leading', 'Time from request to first streamed token, and mean gap between tokens, per model tier and region.', batch ? 'Throughput target per run window instead of interactive latency.' : `First token inside the stage budget for ${model.label}; inter-token gap under what a reader perceives as stalling.`, 'Continuous', 'Inference engineer', 'Route to the smaller tier, lower the context length or add capacity.'),
      row('Tokens per request and cost per request', 'guardrail', 'Input and output tokens per request and per step, and the resulting cost, per model tier.', budget, 'Continuous', 'FinOps', 'Trim context, cache prefixes, cap output and route easy requests to the small tier.'),
      row('Structured-output validity', 'guardrail', 'Share of responses that parse and validate against the required schema on the first attempt, and the retry rate.', 'At least 99% valid on first attempt; retries bounded (starting threshold).', 'Continuous', 'AI engineer', 'Use constrained decoding or a schema repair step; add the failures to the eval set.'),
      row('Hallucination and unsupported-claim rate', 'guardrail', 'Share of sampled responses containing a claim not supported by the provided context or tool results, judge-scored and human-checked.', strict ? 'Below the threshold set with the risk owner; zero tolerated on regulated statements.' : 'Below the champion on the golden set.', 'Weekly sample', 'AI engineer', 'Tighten grounding, require citations, or restrict the answer scope.'),
      row('Prompt-injection and jailbreak resistance', 'guardrail', 'Attack success rate on a planted-instruction and jailbreak test set, and blocked attempts in production.', 'Zero successful attacks on the replay set; production attempts reviewed.', 'Every prompt, model or tool change; continuous', 'Security', 'Block the release; strengthen input isolation, the policy layer and output filters.'),
      row('Safety, toxicity and PII in output', 'guardrail', 'Share of outputs flagged by the safety classifier or PII detector, and the false-block rate.', 'Flag rate stable; PII in output at zero after filtering.', 'Continuous', 'Security', 'Tune filters, review false blocks with the product owner.'),
      row('Refusal and over-refusal rate', 'diagnostic', 'Share of requests the model refuses, split into correct refusals and refusals of legitimate requests.', 'Over-refusal under the level that hurts task success.', 'Weekly', 'AI engineer', 'Adjust the policy prompt and examples.'),
      row('Provider drift and failover', 'guardrail', 'Change in golden-set scores after a provider model update, provider error rate, and failover success to the secondary.', 'No regression beyond tolerance after a provider change; failover tested in a game day.', 'On provider change; quarterly', 'AI platform on-call', 'Pin the model version; fail over and re-evaluate the secondary.'),
      row('Judge calibration', 'diagnostic', 'Agreement between the LLM judge and human graders on a rolling sample.', 'Cohen’s κ at least 0.7 (starting threshold).', 'Monthly', 'AI engineer', 'Retrain or replace the judge; do not trust automated scores until restored.'),
    ]);
  } else {
    notApplicable.push({ layer: 'llm', reason: `${raw.title} runs conventional models (${raw.paradigms.join(', ')}); there are no prompts, tokens or generated text to measure.` });
  }

  if (hasAgents) {
    const agents = agentic.agents.slice(0, 3);
    const writes = agentic.tools.filter((t) => t.access !== 'read');
    const tools = agentic.tools.slice(0, 3).map((t) => t.name);
    add('agent', [
      row('Task success rate', 'outcome', `Share of ${agents.map((a) => a.name.toLowerCase()).join(', ')} tasks that finish with the correct disposition, on a frozen replay set and on audited production cases.`, 'Targets for each autonomy level are in the Agentic section; promotion to the next level requires meeting them.', 'Per change; weekly sample', 'AI engineer', 'Hold the autonomy level; replay the failing trajectories.'),
      row('Evidence validity', 'guardrail', 'Share of cited claims that point at a real record that supports them, checked against the record store.', 'At least 99%.', 'Weekly', 'AI engineer', 'Drop uncited claims from the output; fix the retrieval or tool that supplied the wrong record.'),
      row('Tool-call accuracy and error rate', 'leading', `Share of tool calls (${tools.join(', ')}) with valid arguments, correct tool choice and a successful result, per tool.`, 'Invalid-argument calls near zero; per-tool error rate inside the tool owner SLO.', 'Continuous', 'AI engineer', 'Tighten the tool schema and descriptions; add a validation layer before the call.'),
      row('Steps, loops and retries per task', 'diagnostic', `Median and p95 steps per task against the cap of ${steps}, repeated identical calls, and retry rate.`, `p95 steps under the cap of ${steps}; loop detections near zero.`, 'Continuous', 'AI engineer', 'Add a loop breaker and a better stopping rule; review the planner prompt.'),
      row('Escalation precision and recall', 'guardrail', 'Share of escalations that needed a person (precision), and share of cases needing a person that were escalated (recall), including cases with missing evidence.', 'No case with missing evidence decided anyway; precision above 80% so people are not flooded.', 'Weekly', 'AI engineer', 'Adjust the confidence threshold and the escalation rules.'),
      row(`Write-action safety${writes.length ? `: ${cut(writes.slice(0, 2).map((t) => t.name).join(', '), 60)}` : ''}`, 'guardrail', 'Write actions outside policy, actions that needed approval and did not get it, and compensating actions needed.', 'Exactly zero outside policy; every write has an approval or an idempotent reversal.', 'Continuous', 'AI platform on-call', 'Revoke the tool scope and drop the agent to read-only (L0).'),
      row('Autonomy level and gate status', 'diagnostic', `Current level per agent (${agents.map((a) => `${a.name}: ${a.autonomy}`).join('; ')}), and whether the promotion gate evidence is current.`, 'No agent above the level its latest evidence supports; demotion on any gate breach.', 'Weekly', 'Risk owner', 'Demote the agent one level and re-run the gate evidence.'),
      row('Cost and time per task', 'guardrail', 'Tokens, tool calls and wall-clock time per completed task, and cost per resolved case.', 'Cheaper or faster than the human-only path for the same quality; budget cap enforced per task.', 'Daily', 'FinOps', 'Lower the step budget; cache tool results; use a smaller model for the easy steps.'),
      row('Handoff success between agents', 'diagnostic', `Share of handoffs (${agents.map((a) => a.name).join(', ')}) that carry the context the next agent needs, measured by task failures traced to lost context.`, 'Near zero handoff-caused failures.', 'Weekly', 'AI engineer', 'Make the handoff payload a typed contract and validate it.'),
      row('Trajectory regression', 'guardrail', 'Pass rate on stored trajectories (including tool outages and planted instructions) after any model, prompt or tool change.', '100% of safety trajectories; no drop on task trajectories beyond tolerance.', 'Every change', 'AI engineer', 'Block the release and add the new failure to the replay set.'),
    ]);
  } else {
    notApplicable.push({ layer: 'agent', reason: `Agents are ${agentic.fit.replace('-', ' ')} for this system. ${cut(strip(agentic.rationale.split(/(?<=\.)\s/)[0] ?? agentic.role), 220)}. The workflow and exception-queue metrics in the System layer cover what an agent dashboard would have shown.` });
  }

  if (human) {
    add('hitl', [
      row('Review queue backlog and age', 'guardrail', `Items waiting in ${human.label} (${human.tech}), age of the oldest and age at p95.`, 'p95 age inside the review SLA; backlog does not grow for three days running.', 'Continuous', modelOwner, 'Add reviewers or tighten the routing band so only the ambiguous cases arrive.'),
      row('Queue precision (hit rate)', 'leading', 'Share of reviewed items that were true positives or needed action.', 'Rising as the model improves; a fall means the queue is being fed noise.', 'Daily', modelOwner, 'Re-tune the routing thresholds; examine the new false-positive pattern.'),
      row('Reviewer agreement', 'diagnostic', 'Cohen’s κ between reviewers on the same items, and between reviewers and the audit panel.', 'κ of at least 0.7 (starting threshold); disagreements adjudicated.', 'Monthly', modelOwner, 'Clarify the guideline and retrain reviewers; noisy labels cap model quality.'),
      row('Model overturn rate', 'diagnostic', 'Share of model suggestions the reviewer changes, split by direction and by reviewer.', 'Stable band; reviewer-level outliers explained.', 'Weekly', modelOwner, 'Check for automation bias (too few overturns) or a model fault (too many).'),
      row('Random audit coverage', 'guardrail', 'Share of auto-decided items sampled at random for human audit, and the error rate found.', 'A fixed sampling rate maintained; error rate in the audit sample inside the guardrail.', 'Weekly', modelOwner, 'Raise sampling; this slice is also the unbiased label source for training.'),
      row('Label feedback latency', 'diagnostic', 'Time from a reviewer decision to the labelled outcome being available for training.', 'Inside the daily label job; no decision without a label record.', 'Daily', dataOwner, 'Fix the label-store path; unlabelled decisions cannot be learned from.'),
      row('Handle time and throughput', 'diagnostic', 'Median time per item and items per reviewer-hour, with quality score on golden items.', 'Throughput up only while golden-item accuracy holds.', 'Weekly', modelOwner, 'Improve the case view before pushing throughput.'),
    ]);
  } else {
    notApplicable.push({ layer: 'hitl', reason: `There is no human-review stage in the pipeline for ${raw.title}; decisions are made by the system and corrected through appeals and audit samples, which are tracked in the Adoption and Responsible AI layers.` });
  }

  /* failure monitors: one per edge case in the specification */
  const failureMonitors = raw.edge.map(([scenario, failureMode, mitigation]) => {
    const text = `${scenario} ${failureMode}`.toLowerCase();
    let signal: string;
    if (/\b(timeouts?|outages?|down|unavailable|latency|slow|failover|stale)\b/.test(text)) signal = 'Dependency error and timeout rate, fallback level and share of decisions made on stale data';
    else if (/\b(delays?|delayed|late|matur\w*|labels?|censor\w*|backfill\w*)\b/.test(text)) signal = 'Label-maturity coverage, late-event share and the gap between proxy and matured metrics';
    else if (/\b(adversar\w*|attacks?|attackers?|evasion|rotat\w*|spoof\w*|poison\w*|inject\w*|prob(e|es|ing)|abus\w*|manipulat\w*|gam(e|ed|ing)|fraudsters?)\b/.test(text)) signal = 'Probing and adversarial pattern rate, challenger disagreement and displacement to other channels';
    else if (/\b(cold|new|first|unseen|thin|sparse|onboard\w*|newly)\b/.test(text)) signal = 'Share of traffic in the cold-start segment and the primary metric on that segment alone';
    else if (/\b(missing|nulls?|corrupt\w*|schema|duplicat\w*|malformed|format\w*)\b/.test(text)) signal = 'Null, schema-violation and duplicate rate on the affected inputs';
    else if (/\b(bias\w*|fair\w*|protected|prox(y|ies)|groups?|demograph\w*)\b/.test(text)) signal = 'Primary error rate and selection rate by slice against the slice floors';
    else if (/\b(season\w*|holidays?|promo\w*|campaigns?|spikes?|surges?|burst\w*|peaks?|weather|regimes?|shifts?|drift\w*|trends?|flash)\b/.test(text)) signal = 'Feature and score PSI against the calendar-matched baseline, and volume versus forecast';
    else signal = `Frequency of the condition "${cut(strip(scenario).toLowerCase(), 70)}" and the rate at which its mitigation fires`;
    return {
      scenario: strip(scenario),
      signal: `${signal}.`,
      threshold: `Alert when the signal moves more than 3 standard deviations from its 28-day baseline, or the condition is detected and "${cut(strip(mitigation), 60)}" does not fire.`,
      response: strip(mitigation),
    };
  });

  /* metric tree: how the layers connect for this system */
  const f0 = raw.sig[0]![0]!;
  const tree = [
    'flowchart LR',
    `  B["Outcome: ${m(north, 46)}"]`,
    `  G["Guardrail: ${m(guard, 46)}"]`,
    `  M["Model: ${m(strip(raw.off[0] ?? 'offline metric'), 46)}"]`,
    `  D["Data: freshness and leakage of ${m(f0, 36)}"]`,
    `  S["System: ${m(slo(1).slo, 52)}"]`,
    `  C["Cost: ${m(slo(5).slo, 40)} per 1,000"]`,
    ...(hasRag ? ['  R["RAG: faithfulness and hit rate"]', '  D --> R', '  R --> B'] : []),
    ...(hasAgents ? ['  A["Agent: task success and safe tool use"]', '  M --> A', '  A --> B'] : []),
    ...(human ? ['  H["Human review: backlog and agreement"]', '  H --> M'] : []),
    '  D --> M',
    '  M --> B',
    '  S --> B',
    '  S --> G',
    '  M -.-> G',
    '  C -.-> B',
  ].join('\n');

  /* how each headline metric gets gamed, and what to read beside it */
  const gaming: Metrics['gaming'] = [
    { metric: north, risk: 'Moves when the measured population or the label window changes, not only when the system improves; novelty and adaptation inflate early readings.', counter: `${guard}, read at 90 days against the holdout` },
    { metric: strip(raw.off[0] ?? 'the offline metric'), risk: `Optimising it breaks on a known trap: ${lc(cut(strip(raw.gap[0] ?? 'offline gains that do not transfer online'), 150))}.`, counter: `${north} on the holdout; the offline-online agreement rate` },
    { metric: human ? 'Straight-through (auto-decision) rate' : 'Coverage', risk: human ? 'Raised by widening the auto-decision band, which hides errors that nobody reviews.' : 'Raised by deciding easy cases only, which leaves the hard ones on the old path.', counter: human ? 'Random audit error rate and the guardrail' : 'Metric on the hardest decile and on the cold-start slice' },
    { metric: slo(1).sli, risk: 'Met by dropping or defaulting the hardest requests, so the percentile looks good while quality falls.', counter: 'Degraded-path share and the primary metric on the fallback path' },
    ...(raw.gap[1] ? [{ metric: 'Any single offline score', risk: `A second known trap: ${lc(cut(strip(raw.gap[1]), 150))}.`, counter: 'The matured-label metric by slice and the champion-challenger gap' }] : []),
  ];

  return {
    basis: `Targets are starting thresholds, not measurements. System, latency, availability and cost figures come from this blueprint's own stage budgets, SLOs and capacity model; model and business targets are stated against ${lc(baseName)} and the minimum detectable effect because an absolute number invented without your data would be false precision. Thresholds marked as starting values (PSI, ECE, κ, faithfulness) are common rules of thumb to tune on your own baseline. Nothing here is a measured result.`,
    tree,
    layers,
    notApplicable,
    failureMonitors,
    gaming,
  };
}

/* ------------------------------------------------------------------ archetype-specific model metrics */

type ArchRow = [metric: string, kind: Kind, definition: string, target: string];

function archetypeModelRows(a: Archetype, pattern: PatternId, unit: string, north: string): MetricRow[] {
  const mk = ([metric, kind, definition, target]: ArchRow) =>
    row(metric, kind, definition, target, 'Every training run and weekly on matured labels', 'Data scientist', 'Do not promote; diagnose on the slice or horizon where it fell.');
  const rows: ArchRow[] = [];
  switch (a) {
    case 'realtime-decisioning':
      rows.push(
        ['PR-AUC and recall at a fixed false-positive rate', 'leading', 'Ranking quality in the operating region, not over all thresholds. ROC-AUC alone hides a useless operating region on rare positives.', 'Above the baseline at the same false-positive rate, with an interval.'],
        ['Action mix and threshold stability', 'diagnostic', 'Share of decisions per action (for example allow, step up, block) and how it shifts after a model or threshold change.', 'Action mix moves only by decision; any unexplained shift is investigated before promotion.'],
        ['Cost-weighted error', 'leading', `Expected cost of false positives and false negatives per 1,000 ${unit}s using the business cost matrix.`, 'Lower than the champion at the production thresholds.'],
      );
      break;
    case 'batch-analytics':
      rows.push(
        ['Lift and precision at review or action capacity', 'leading', 'Precision, recall and lift in the top-k that the downstream team can actually act on.', 'Above the baseline at the real capacity, not at an arbitrary cut-off.'],
        ['Score and rank stability across runs', 'diagnostic', 'Rank correlation of consecutive runs for stable entities, and share of entities that change band without a data change.', 'Stable unless inputs changed; churn explained.'],
        ['Cumulative capture of the target outcome', 'leading', 'Share of eventual positives found within the top deciles, matured over the label horizon.', 'Above the champion on the same matured cohort.'],
      );
      break;
    case 'forecasting':
      rows.push(
        ['WAPE and bias', 'leading', 'Weighted absolute percentage error and mean percentage error, rolling-origin, by horizon and by top segment.', 'Below the seasonal-naive and the current planning forecast at every horizon that drives a decision.'],
        ['Forecast value added (FVA)', 'leading', 'Error of the model versus the naive forecast and versus the human-adjusted forecast, at the planning horizon.', 'Positive: every override or model step must beat the step before it.'],
        ['Prediction-interval coverage and pinball loss', 'guardrail', 'Share of actuals inside the 80% and 95% intervals, and quantile (pinball) loss.', '80% interval covers 75 to 85% of actuals overall, by horizon and by top segment.'],
        ['Error on intermittent and new series', 'diagnostic', 'Metric on low-volume, intermittent and recently launched series separately from the head.', 'No worse than the baseline on the tail; documented fallback for new series.'],
      );
      break;
    case 'recommendation':
      rows.push(
        ['NDCG@k, MRR and candidate recall@k', 'leading', 'Ranking quality of the final list, and recall of the retrieval stage that feeds it, on time-split logs.', 'Above the incumbent ranker; candidate recall high enough that the ranker is not the bottleneck.'],
        ['Coverage, diversity, novelty and popularity bias', 'guardrail', 'Share of the catalogue ever recommended, list diversity, novelty, and the share of impressions on the head items.', 'No collapse into the head; floors set per surface.'],
        ['Cold-start performance', 'diagnostic', 'Primary metric for new users and new items separately.', 'Defined fallback with a floor; improvement tracked.'],
        ['Position-bias-corrected click or conversion', 'leading', 'Click and conversion rates after inverse-propensity correction for position.', 'Direction agrees with the last online A/B.'],
      );
      break;
    case 'computer-vision':
      rows.push(
        ['mAP and per-class precision and recall at the operating threshold', 'leading', 'Detection or classification quality per class at the deployed threshold and across IoU thresholds, by condition (lighting, camera, product, shift).', 'Above the baseline per class; no condition below its floor.'],
        ['False-reject and escape rates', 'guardrail', 'Good items wrongly flagged, and defective items missed, from audited samples.', 'False rejects inside the cost budget; escapes inside the quality limit.'],
        ['Confidence calibration by condition', 'diagnostic', 'Whether a fixed threshold means the same precision across cameras, lines and lighting.', 'One threshold gives comparable precision across lines.'],
        ['Hard-example miss rate', 'diagnostic', 'Recall on a mined set of past misses and rare defects.', 'Rising across releases; no regression on the set.'],
      );
      break;
    case 'document-extraction':
      rows.push(
        ['Field-level exact match and F1', 'leading', 'Per-field accuracy against human-verified documents, by document type and scan quality.', 'Above the baseline for each document type that carries volume.'],
        ['Straight-through rate at target accuracy', 'outcome', 'Share of documents accepted with no human touch whose fields are correct.', 'Raised only while accuracy among auto-accepted fields holds.'],
        ['Confidence calibration of auto-accept', 'guardrail', 'Accuracy among auto-accepted fields at each confidence band.', 'Accuracy at the auto-accept threshold meets the target in every document type.'],
        ['Human correction rate and rework time', 'diagnostic', 'Share of fields corrected downstream and minutes of rework per document.', 'Falling release over release.'],
      );
      break;
    case 'optimisation':
      rows.push(
        ['Optimality gap and objective value', 'leading', 'Gap between the plan found and the best bound or a long-run solve, and the objective against the incumbent heuristic.', 'Better objective than the incumbent within the time limit.'],
        ['Constraint violations and feasibility rate', 'guardrail', 'Plans that break a hard constraint, and share of solves that return a feasible plan inside the limit.', 'Zero hard violations; feasibility rate at the level the operation needs.'],
        ['Solve time and plan stability', 'diagnostic', 'p95 solve time, and churn between consecutive plans when inputs barely changed.', 'Inside the run window; churn inside what operations can absorb.'],
        ['Input forecast error contribution', 'diagnostic', 'Share of plan regret explained by error in the forecasts or estimates fed to the optimiser.', 'Tracked; a biased input shifts the optimum silently.'],
      );
      break;
    case 'rag':
      rows.push(
        ['Task-level answer correctness', 'leading', 'Share of golden questions answered correctly end to end, graded by a calibrated judge and a human sample.', 'Above the baseline assistant on the frozen set.'],
        ['Judge agreement with humans', 'diagnostic', 'Agreement between automated grading and expert grading.', 'Cohen’s κ at least 0.7 (starting threshold).'],
      );
      break;
    case 'agentic-workflow':
      rows.push(
        ['Task success on the golden set', 'leading', 'Share of replayed tasks completed with the correct outcome, by task type.', 'Above the human-only baseline before any autonomy is granted.'],
        ['Judge agreement with experts', 'diagnostic', 'Agreement between automated trajectory grading and expert grading.', 'Cohen’s κ at least 0.7 (starting threshold).'],
      );
      break;
  }
  if (pattern === 'bandit')
    rows.push(
      ['Cumulative regret and exploration share', 'leading', 'Reward lost versus the best fixed arm in hindsight, and the share of traffic spent exploring.', 'Regret sublinear; exploration share matches the budget set for the business.'],
      ['Off-policy estimate versus realised reward', 'guardrail', 'Inverse-propensity and doubly-robust estimate of the new policy compared with its measured reward.', 'Estimates agree with the realised reward inside their intervals.'],
    );
  if (pattern === 'graph')
    rows.push(['Graph freshness and coverage', 'diagnostic', 'Age of the graph snapshot the scores use, and the share of entities present in it.', 'Snapshot age inside the contract; coverage of active entities near complete.']);
  if (pattern === 'anomaly')
    rows.push(['Alert precision and time to detect', 'leading', 'Share of alerts that are true events, and delay from event onset to alert.', `Precision high enough that the team keeps trusting the alert; detection delay inside the harm window for ${north}.`]);
  return rows.map(mk);
}
