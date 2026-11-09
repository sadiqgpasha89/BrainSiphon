/**
 * Statistical validation and business experimentation.
 *
 * A model metric is not a business result. NDCG can rise while incremental revenue does not, a fraud model can look better on the
 * labels it caused, and a forecast can be accurate and still change nothing a planner does. This section states, for each use case,
 * the causal question, the experimental design that can answer it, the power arithmetic, label maturity and selection bias,
 * calibration and uncertainty, slices to check, a causal method where randomisation is impossible, and when to stop.
 */
import type { Archetype, Domain, Experimentation, LatencySLA } from '../schemas/usecase.schema';
import { DOMAIN_META } from '../schemas/usecase.schema';
import type { RawUseCase } from './parse';

const strip = (s: string) => s.trim().replace(/[.;]+$/, '');
const q = (s: string) => `"${strip(s)}"`;

const LABEL_DELAY: Partial<Record<Domain, string>> = {
  fintech: 'Chargebacks, disputes and confirmed fraud arrive 30 to 120 days after the decision, and some are never reported.',
  bfsi: 'Defaults, lapses and claims mature over months to years; early labels are proxies with their own bias.',
  healthcare: 'Clinical outcomes lag the prediction by hours to months, and treatment given in response contaminates the label.',
  adtech: 'Conversions are attributed days to weeks later, and consent or privacy limits remove part of the signal.',
  'supply-chain': 'Outcomes (delivery, stock-out, breakdown) are observed after the horizon closes and are revised by late scans.',
  retail: 'Returns, cancellations and repeat purchase arrive weeks after the sale; stock-outs censor observed demand.',
  cybersecurity: 'Confirmed incidents are found late or never; unreported attacks look like clean traffic.',
  edtech: 'Learning outcomes arrive at the end of a course or term, long after the recommendation.',
  saas: 'Retention and expansion outcomes arrive over billing cycles; usage is a proxy for value.',
  'real-estate': 'Sale prices and outcomes lag the valuation; listings that do not transact leave no price.',
};

const SLICES: Partial<Record<Domain, string[]>> = {
  fintech: ['Customer segment, tenure and new versus existing accounts', 'Geography and channel (card-present, online, UPI)', 'Protected-class proxies where lawful analysis is permitted, to check disparate impact'],
  bfsi: ['Income band, age band and thin-file applicants', 'Product, channel and region', 'Protected classes under the applicable fair-lending or conduct rules'],
  healthcare: ['Age, sex, ethnicity and language', 'Site and device (case mix, equipment differences)', 'Comorbidity and acuity bands, including the sickest decile'],
  edtech: ['Age band, with minors analysed separately', 'First-generation, language and accessibility groups', 'Course, cohort and device'],
  'real-estate': ['Neighbourhood and price band', 'Property type and listing age', 'Fair-housing protected-class proxies such as area-level demographics'],
};

interface Base {
  design: Experimentation['design']['type'];
  unit: string;
  why: string;
  interference: string;
  causal: { method: string; when: string };
  counterfactual: string;
  calibration: string;
}

function baseFor(a: Archetype, latency: LatencySLA, primary: string): Base {
  switch (a) {
    case 'recommendation':
      return {
        design: 'interleaving-then-ab',
        unit: 'User (not session or impression), assigned by a salted hash',
        why: 'Interleaving is sensitive enough to rank candidate rankers quickly with little traffic; a user-level A/B test with a persistent holdout then measures what interleaving cannot: incremental revenue and long-term behaviour.',
        interference: 'Items compete for finite inventory and attention, and a learning ranker changes what future data it sees. Keep a long-lived holdout that never receives the new policy and run the A/B at user level, not request level.',
        causal: { method: 'Incrementality against a personalisation-off holdout, plus uplift (treatment-effect) modelling to find who is actually moved', when: 'To prove recommendations add sales, rather than predicting purchases that would have happened anyway' },
        counterfactual: 'Log the propensity of every shown item. Estimate a new policy offline with inverse-propensity and doubly-robust estimators, and trust it only if it agrees in direction with the last real A/B.',
        calibration: 'Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker\'s scores can be compared and combined with business value.',
      };
    case 'forecasting':
      return {
        design: 'rolling-origin-backtest',
        unit: 'Store-week or region-week for decisions made from the forecast; series-origin for accuracy',
        why: 'A forecast is judged first by a rolling-origin backtest that repeats the real production process across many forecast origins. Whether acting on it helps is a separate question, answered with a switchback or region-level test of the decision.',
        interference: 'Stores share supply and substitute for one another, so randomising stores leaks effects between arms. Randomise by region and by time block (switchback) and wash out carry-over between blocks.',
        causal: { method: 'Difference-in-differences or synthetic control on waste, stock-outs and margin between regions that use the new forecast and those that do not', when: 'When randomisation by region is not allowed, to estimate the effect of changing the decision rather than the forecast' },
        counterfactual: 'Replay the replenishment or planning rule on historical forecasts versus actuals to estimate what the decision would have cost, correcting for demand censored by stock-outs.',
        calibration: 'Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.',
      };
    case 'realtime-decisioning':
      return {
        design: 'shadow-then-holdout',
        unit: 'Decision (entity and time), with a stable entity-level holdout',
        why: `Shadow mode shows what the model would have done without acting. A small randomised holdout then provides unbiased outcomes for the cases the old policy would have blocked or passed, which is the only way to measure ${q(primary)} without the policy shaping its own labels.`,
        interference: 'Adversaries and customers adapt to the policy. Keep the holdout small and persistent, watch for displacement to other channels, and measure over a window long enough for behaviour to settle.',
        causal: { method: 'Reject inference and inverse-propensity weighting using the logged exploration slice', when: 'When labels exist only for cases the previous policy let through (selective labels)' },
        counterfactual: 'Replay a week of logged traffic through the challenger with the production thresholds and compute the cost-weighted outcome, weighting the exploration slice by its logged propensity.',
        calibration: 'Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.',
      };
    case 'rag':
      return {
        design: 'offline-replay-then-canary',
        unit: 'User session, with answers sampled for human grading',
        why: 'Model, prompt and index changes are first judged on a frozen golden question set with grounded-answer and retrieval metrics, then canaried to a small share of users with a control to measure task completion, deflection and complaints.',
        interference: 'Users share documents and learn from earlier answers. Keep assignment sticky per user and keep the index version in the experiment key.',
        causal: { method: 'Randomised comparison of assisted versus unassisted task completion, adjusted for task difficulty', when: 'To show the assistant saves time or avoids errors rather than just producing plausible text' },
        counterfactual: 'Re-run logged questions against the candidate prompt and index, and grade with a calibrated judge plus a human sample; never tune on the held-out set.',
        calibration: 'Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.',
      };
    case 'agentic-workflow':
      return {
        design: 'shadow-then-holdout',
        unit: 'Case or task, with a control group handled without the agent',
        why: 'Agents earn autonomy in steps. Shadow mode measures agreement with experts and evidence validity at no risk; a control group then shows whether cases actually resolve faster or more accurately.',
        interference: 'Cases from the same customer or incident are correlated, and analysts learn from agent suggestions. Randomise at the case-cluster level and rotate reviewers.',
        causal: { method: 'Randomised control with cluster-robust standard errors; stratify by case type and severity', when: 'To attribute changes in handling time and quality to the agent rather than to staffing or case mix' },
        counterfactual: 'Replay frozen cases, including tool outages and planted instructions, against each new model, prompt and tool version before any live exposure.',
        calibration: 'Calibrate the agent\'s "I am sure" signal against expert agreement so escalation thresholds mean what they say.',
      };
    case 'optimisation':
      return {
        design: 'switchback',
        unit: 'Time block per site (for example shift-day), alternating policies',
        why: 'Planning policies change shared resources, so users or items cannot be randomised independently. Alternating policies over time blocks per site, with carry-over washout, isolates the policy effect.',
        interference: 'A plan changes the state the next block starts from (inventory, driver positions). Size blocks to exceed the carry-over, and include block and site effects in the analysis.',
        causal: { method: 'Switchback regression with site and time-block fixed effects, or synthetic control when only one site can change', when: 'When a policy affects shared capacity and a clean randomised unit does not exist' },
        counterfactual: 'Re-solve historical days under the new objective with the information available at the time, then compare the cost and service level to what actually happened.',
        calibration: 'Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.',
      };
    case 'computer-vision':
      return {
        design: 'offline-replay-then-canary',
        unit: 'Camera, line or station (the physical unit that shares conditions)',
        why: 'Accuracy depends on lighting, lens and product, so a golden set stratified by those conditions is run first; a canary on a subset of lines with a human-checked sample then confirms live precision and recall.',
        interference: 'Lines share parts and operators. Pair similar lines and run the canary on one of each pair.',
        causal: { method: 'Matched-pair comparison of lines with and without the system, on scrap, escape and rework rates', when: 'To show the system lowers defects that escape, not just that it detects defects in a test set' },
        counterfactual: 'Replay recorded frames from each condition through the candidate engine and compare detections with human labels, including hard examples mined from past misses.',
        calibration: 'Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.',
      };
    case 'document-extraction':
      return {
        design: 'offline-replay-then-canary',
        unit: 'Document, stratified by type and scan quality',
        why: 'Field-level accuracy differs sharply by document type and scan quality, so a stratified golden set decides promotion, and a canary measures straight-through rate and downstream corrections in production.',
        interference: 'Reviewers learn the system\'s habits, which biases correction data. Sample audits blind to the model\'s answer.',
        causal: { method: 'Randomised routing of a share of documents to the new pipeline, comparing straight-through rate and downstream correction cost', when: 'To estimate the cost saved after rework, not only extraction accuracy' },
        counterfactual: 'Re-extract archived, human-verified documents with the candidate pipeline and compare field by field.',
        calibration: 'Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.',
      };
    case 'batch-analytics':
    default:
      return {
        design: latency === 'batch' ? 'shadow-then-holdout' : 'randomised-ab-test',
        unit: 'Entity (customer, account, asset), with a stable holdout across runs',
        why: 'A challenger scores in shadow beside the champion for several runs; a persistent holdout of entities that never receive the new action then measures incremental effect instead of correlation with the score.',
        interference: 'Actions on one entity can affect its neighbours (households, networks, shared capacity). Randomise at the cluster level where that is true.',
        causal: { method: 'Randomised holdout with uplift modelling, or difference-in-differences when the action cannot be withheld', when: 'When the score is used to choose who to treat, since predicting risk is not the same as predicting benefit from action' },
        counterfactual: 'Re-score historical runs with the challenger and compare the cohort it would have selected against what the champion selected, using outcomes observed after both.',
        calibration: 'Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.',
      };
  }
}

export function buildExperimentation(raw: RawUseCase, domain: Domain, archetype: Archetype, latency: LatencySLA, hasHuman: boolean): Experimentation {
  const primary = strip(raw.on[0] ?? 'the north-star business metric');
  const guard = strip(raw.on[1] ?? 'the guardrail metric');
  const offline = strip(raw.off[0] ?? 'the offline metric');
  const gap = raw.gap[0] ? strip(raw.gap[0]) : 'offline gains that do not transfer online';
  const b = baseFor(archetype, latency, primary);
  const name = DOMAIN_META[domain].name;

  return {
    question: `Does ${strip(raw.title)} improve ${q(primary)} without worsening ${q(guard)}, compared with ${strip(raw.base).toLowerCase()}?`,
    estimand: `The average causal effect of acting on the system's output on ${q(primary)}, per ${b.unit.split(',')[0]!.toLowerCase()}, over the evaluation window, with ${q(guard)} as a non-inferiority guardrail.`,
    design: { type: b.design, unit: b.unit, why: b.why, interference: b.interference },
    metrics: {
      primary: `${q(primary)}. Offline model metric ${q(offline)} is a screening step and not a success criterion.`,
      guardrails: [q(guard), 'Latency and error rate within the SLOs in the operations section', 'Fairness gap across the slices below no worse than the control'],
      offlineOnlineGap: `Known trap: ${gap.charAt(0).toLowerCase()}${gap.slice(1)}.`,
    },
    power: {
      alpha: 0.05,
      power: 0.8,
      mde: `Set from the business case before running: the smallest change in ${q(primary)} that pays for the cost of the change. If it cannot be stated, the experiment is not ready.`,
      sampleSizeRule: 'Per arm, n ≈ 16·σ²/δ² for a continuous metric, or n ≈ 16·p(1−p)/δ² for a rate p, at α = 0.05 (two-sided) and 80% power, where δ is the minimum detectable effect. Use the baseline variance from your own data, reduce it with pre-experiment covariates (CUPED), and inflate n by the design effect when units are clustered.',
      duration: 'Whole weekly cycles (at least two) and long enough for the label delay below; never stop on the first significant day.',
    },
    labels: {
      maturity: LABEL_DELAY[domain] ?? `Outcomes in ${name} arrive after the decision; measure label delay per source and train and evaluate only on matured windows.`,
      quality: 'Estimate label noise with an expert re-label of a random sample; report agreement. Noisy labels cap the achievable metric and bias comparisons between models.',
      selectionBias: hasHuman || archetype === 'realtime-decisioning'
        ? 'Outcomes are observed mainly for cases the previous policy or a reviewer touched. Reserve a small randomised slice that is observed regardless, log its propensity, and use it to correct training and evaluation.'
        : 'Check whether outcomes are observed for every unit or only for those that were acted on or reached; if only some, treat it as selection bias and weight or model it explicitly.',
    },
    sampling: `Evaluate on out-of-time splits, never random splits, for any metric that will be used forward in time. Stratify by the slices below and by ${archetype === 'forecasting' ? 'forecast origin and horizon' : 'period and cohort'}; keep one untouched final test period for the release decision and do not tune on it.`,
    dataQuality: [
      'Missingness by feature, segment and time: test whether it is missing at random or informative (for example a missing field that only occurs for one channel).',
      'Representativeness: compare the training population with current production traffic on the main features (population stability) before trusting any metric.',
      'Duplicates, leakage and look-ahead: confirm every feature is available at decision time and that no label-derived field is in the inputs.',
    ],
    uncertainty: archetype === 'forecasting' ? 'Report quantile forecasts with a tested coverage, and carry the interval into the decision (safety stock, staffing) rather than discarding it.' : 'Report confidence intervals (bootstrap by cluster) on every headline metric and on each slice, and use calibrated probabilities or conformal sets where a decision depends on how sure the model is.',
    slices: [...(SLICES[domain] ?? ['Customer or user segment, tenure and new versus existing', 'Geography, channel and device', 'Protected-class proxies where lawful analysis is permitted']), 'Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance'],
    causal: b.causal,
    counterfactual: b.counterfactual,
    calibration: b.calibration,
    stopping: [
      'Fix the sample size or the sequential-testing plan (for example alpha spending) before launch; peeking at a fixed-horizon test inflates false positives.',
      `Stop early for harm: any guardrail breach, including ${q(guard)}, beyond its pre-agreed bound ends the experiment immediately.`,
      'Stop for futility when the confidence interval excludes the minimum detectable effect; ship only when the interval clears it, not when it merely excludes zero.',
      'A result that depends on one slice, one day or one outlier is not a result: confirm with a replication or a longer holdout.',
    ],
    businessValue: [
      { metric: q(primary), how: 'Incremental effect versus the holdout or control, with an interval, converted to money using the unit economics in the operations section.' },
      { metric: 'Net value after cost', how: 'Incremental benefit minus the all-in run cost from the capacity model and the human-review cost; report the payback period.' },
      { metric: 'Durability', how: 'Re-measure the effect at 30 and 90 days; novelty effects and adversary or customer adaptation often decay a first result.' },
    ],
    pitfalls: [
      'Declaring success on the offline metric: the improvement does not transfer when the offline set is not the production distribution.',
      'Measuring a correlation with the score instead of the effect of acting on it.',
      'Randomising a unit that interferes with its neighbours, then reading the difference as a treatment effect.',
      'Stopping when the p-value first dips below 0.05.',
    ],
  };
}
