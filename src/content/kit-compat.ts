/**
 * Starter-kit compatibility.
 *
 * A reference starter kit is only a starter for a use case when it implements the same fundamental problem. Sharing a broad
 * paradigm ("tabular") is not enough: survival modelling, uplift, regression and event classification are all tabular and none can
 * reuse another's labels, validation, metrics or model. This module
 *
 *   1. classifies each use case into a problem type and a profile (label semantics, validation, metrics, data, model, serving,
 *      integrations) from its own authored fields;
 *   2. compares that profile with the contract of every reference kit (content/kit-contracts.json);
 *   3. returns one of three verdicts: `exact` (the kit implements the same problem), `adaptable` (reusable parts, with named
 *      modifications) or `none` (no compatible executable kit: architecture and implementation guidance only);
 *   4. says how far the executable artifacts get an engineer on the four-step completion ladder.
 *
 * It never substitutes one task's kit for another's. The build fails if a playbook ships a kit its verdict does not allow.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NO_KIT_STATEMENT, PROBLEM_LABEL, type ProblemType } from '../lib/problem-types';
import type { Compatibility, CompatDimension, Domain, LatencySLA, Paradigm } from '../schemas/usecase.schema';
import { TOTAL_BUDGET_MS, type Stage } from './design';
import type { RawUseCase } from './parse';
import { KIT_IDS, pickKit, type KitId } from './playbook-gen';

/* ------------------------------------------------------------------ contracts and overrides */

export interface KitContract {
  problemTypes: ProblemType[];
  adaptable: Partial<Record<ProblemType, string[]>>;
  provides: {
    label: string;
    validation: string;
    metrics: string;
    metricFamilies: string[];
    data: string;
    dataShapes: string[];
    model: string;
    modelFamilies: string[];
    serving: string;
    integrations: string;
    vocabulary: string;
  };
  reusable: string[];
  cannotRepresent: string[];
  /** sub-structures the kit does not implement, matched against the use case's own text */
  caveats?: { pattern: string; dimension: 'data' | 'model'; change: string }[];
}
export interface Override {
  problemType: ProblemType;
  reason: string;
}

interface Files {
  contracts: Record<KitId, KitContract>;
  overrides: Record<string, Override>;
  labels: Record<KitId, string>;
}
const cache = new Map<string, Files>();

export function loadCompatFiles(root: string): Files {
  const hit = cache.get(root);
  if (hit) return hit;
  const content = join(root, 'content');
  const raw = JSON.parse(readFileSync(join(content, 'kit-contracts.json'), 'utf8')) as Record<string, unknown>;
  const contracts = {} as Record<KitId, KitContract>;
  const labels = {} as Record<KitId, string>;
  for (const id of KIT_IDS) {
    const c = raw[id] as KitContract | undefined;
    if (!c) throw new Error(`content/kit-contracts.json has no contract for the "${id}" kit`);
    contracts[id] = c;
    labels[id] = (JSON.parse(readFileSync(join(content, 'kits', id, 'kit.json'), 'utf8')) as { label: string }).label;
  }
  const of = join(content, 'kit-compatibility.json');
  const overrides = existsSync(of) ? (JSON.parse(readFileSync(of, 'utf8')) as { overrides?: Record<string, Override> }).overrides ?? {} : {};
  const f = { contracts, overrides, labels };
  cache.set(root, f);
  return f;
}

/* ------------------------------------------------------------------ the problem profile of one use case */

interface TypeProfile {
  label: string;
  validation: string;
  data: string;
  models: string[];
}

const PROFILE: Record<ProblemType, TypeProfile> = {
  'binary-event-classification': { label: 'A binary outcome per event, confirmed after a delay and sometimes never observed', validation: 'Chronological split with entity separation and a label-maturity rule', data: 'Event-level rows with point-in-time features', models: ['gbdt', 'linear'] },
  'multiclass-classification': { label: 'One of several classes per entity or event', validation: 'Chronological split with entity separation; per-class metrics', data: 'Entity or event rows with point-in-time features', models: ['gbdt', 'linear'] },
  'regression-estimation': { label: 'A continuous quantity per entity (a price, a duration, a value, a rate)', validation: 'Chronological split with segment-level error and interval coverage', data: 'Entity rows with point-in-time features', models: ['gbdt', 'linear'] },
  'survival-time-to-event': { label: 'Time until an event, with right-censored observations (accounts that have not yet had the event)', validation: 'Time-aware split by cohort or vintage that keeps censoring explicit; horizon-specific evaluation', data: 'Entity lifecycles observed over time, with censoring and time-varying covariates', models: ['probabilistic', 'gbdt'] },
  'uplift-causal-effect': { label: 'The change in outcome caused by an action, estimated from treated and control groups', validation: 'Randomised holdout or experiment data; no label of the counterfactual exists', data: 'Entity rows with a treatment indicator, its assignment probability and an outcome', models: ['gbdt', 'linear'] },
  'causal-measurement': { label: 'An aggregate effect or contribution with no per-row label', validation: 'Experiment design, placebo tests and holdout lift rather than a train and test split', data: 'Aggregated time series or panel data by market, channel or period', models: ['probabilistic', 'linear'] },
  forecasting: { label: 'Future values of many series at several horizons', validation: 'Rolling forecast origins with origin-safe features', data: 'Many time series with seasonality, calendar effects and late-arriving data', models: ['gbdt', 'statistical'] },
  'time-series-anomaly-detection': { label: 'Whether a point or interval in a series is anomalous, judged against known events', validation: 'Chronological evaluation at a fixed alert budget with no future information', data: 'Operational or sensor series with seasonality and level shifts', models: ['statistical', 'linear'] },
  'tabular-anomaly-detection': { label: 'Whether an entity or event departs from its normal behaviour, judged against injected or confirmed cases', validation: 'Chronological evaluation at a fixed alert budget with injected or replayed cases', data: 'Entity-level behaviour features over time', models: ['statistical', 'gbdt'] },
  'next-item-recommendation': { label: 'The next item a user will choose, taken from the session itself', validation: 'Time split with a leave-last-out protocol', data: 'Anonymous sessions of item interactions', models: ['statistical'] },
  'personalised-ranking': { label: 'A ranked list of items per user and context, judged by the user\'s later actions', validation: 'Time split by user with a ranking evaluation on held-out interactions', data: 'User, item and context interactions with exposure logs', models: ['neural', 'gbdt'] },
  'search-ranking': { label: 'Graded relevance of documents or products for a query', validation: 'Query-grouped evaluation on human relevance judgements or position-debiased clicks', data: 'Queries, candidates, relevance judgements and click logs', models: ['neural', 'gbdt'] },
  'entity-resolution': { label: 'Whether two records refer to the same real-world entity', validation: 'Group-separated split, evaluated on pairs and on the resulting clusters', data: 'Records with shared and near-matching attributes', models: ['gbdt', 'graph'] },
  'graph-analytics': { label: 'Structure in a graph: clusters, communities, paths or node risk', validation: 'Split that keeps connected structure together, judged against analyst or expert groupings', data: 'A graph of entities and relationships', models: ['graph', 'gbdt'] },
  'vision-classification': { label: 'Whether an image (or region) contains a finding, labelled per image', validation: 'Split by physical item or patient, with checks across sites and devices', data: 'Images with per-image labels from several sites or devices', models: ['neural', 'linear'] },
  'vision-detection-segmentation': { label: 'Where in an image the objects, defects or structures are (boxes or masks)', validation: 'Split by physical item or patient, with overlap-based scoring', data: 'Images with box, mask or keypoint annotations', models: ['neural'] },
  'text-classification': { label: 'The class of a piece of text', validation: 'Time and thread-grouped split with a leak-token check', data: 'A text corpus with drifting vocabulary and duplicate threads', models: ['linear', 'neural'] },
  'information-extraction': { label: 'Fields, entities or spans pulled out of text, documents or images', validation: 'Document-grouped split scored at field or entity level', data: 'Documents with field or span annotations', models: ['neural', 'linear'] },
  'speech-audio': { label: 'Text or scores derived from audio', validation: 'Speaker-grouped split scored by word error rate or rater agreement', data: 'Audio recordings with transcripts or ratings', models: ['neural'] },
  'grounded-qa': { label: 'A correct, cited answer drawn from a document collection, or an abstention', validation: 'Golden question set including unanswerable questions; claim-level verification', data: 'A versioned document collection', models: ['retrieval-llm'] },
  'grounded-generation': { label: 'Generated text whose every statement must be supported by source material', validation: 'Golden set of source documents with statement-level support checks and human review', data: 'Source documents and reference outputs', models: ['retrieval-llm'] },
  'agentic-read-only': { label: 'A verdict or recommendation with cited evidence gathered through read-only tools', validation: 'Replay set of cases with tool outages, missing evidence and planted instructions', data: 'Cases with evidence records', models: ['retrieval-llm'] },
  'agentic-write-actions': { label: 'An action carried out on a person\'s behalf through product or enterprise APIs, verified after execution', validation: 'Replay of tasks with write scenarios, partial failures, permission denials and planted instructions', data: 'Tasks, user permissions and system state before and after', models: ['retrieval-llm'] },
  'off-policy-decisioning': { label: 'The best action per context, learned from logged decisions with known selection probabilities', validation: 'Offline off-policy estimators checked against randomised traffic', data: 'Logged context, action, propensity and reward', models: ['linear', 'policy'] },
  'sequential-control-simulation': { label: 'A policy for repeated decisions over time, trained or evaluated in a simulator', validation: 'Simulator fidelity checks, scenario stress tests and safe deployment limits', data: 'Simulator state, controls and rewards over time', models: ['policy'] },
  'optimisation-allocation': { label: 'The assignment, route or schedule that minimises realised cost under constraints', validation: 'Instances with known true costs, scored against the best plan in hindsight', data: 'Allocation instances with predicted costs and hard constraints', models: ['solver'] },
  'clustering-segmentation': { label: 'Groups with no ground-truth label, judged by stability and usefulness', validation: 'Stability across samples and periods, and separation on a downstream outcome', data: 'Entity features or embeddings without a target', models: ['statistical', 'neural'] },
  'generative-or-other': { label: 'A generated or specialised output that none of the other problem types describes', validation: 'Task-specific human and automated evaluation', data: 'Task-specific data', models: ['neural'] },
};

/** Why no reference kit fits a problem type, and which kit is closest (shown for background reading, never as a starter). */
const NONE_REASON: Partial<Record<ProblemType, { why: string; closest: KitId; closestWhy: string }>> = {
  'survival-time-to-event': {
    why: 'None of the eleven reference kits models time-to-event outcomes. Their labels are a binary outcome, a continuous value or a relevance judgement, so none can represent right-censoring, time-varying hazards or horizon-specific default probabilities.',
    closest: 'tabular',
    closestWhy: 'It teaches chronological splits, label maturity and leakage tests, which also matter here. Its label, baseline and metrics are those of event classification: using it would treat censored accounts as non-events and score the wrong thing.',
  },
  'causal-measurement': {
    why: 'No reference kit implements aggregate causal measurement (attribution, marketing-mix, geo or holdout experiments, placebo tests). These problems have no per-row label and are validated by experiment design, not by a train and test split.',
    closest: 'bandit',
    closestWhy: 'It teaches logged assignment probabilities and the gap between an offline estimate and the true effect. It estimates the value of a policy per decision, not an aggregate channel or market effect.',
  },
  'sequential-control-simulation': {
    why: 'No reference kit implements simulator-based or multi-step control. The bandit kit evaluates single decisions from logs and the optimisation kit scores one-shot plans against true costs.',
    closest: 'bandit',
    closestWhy: 'It teaches why you cannot trust an offline estimate of a policy. It does not implement a simulator, state transitions or multi-step policies.',
  },
  'clustering-segmentation': {
    why: 'No reference kit implements unsupervised grouping. Every kit measures against a label, a relevance judgement or a known true value, and clustering has none.',
    closest: 'graph',
    closestWhy: 'It clusters records by connected components and checks cluster size. It measures clusters against a known true grouping, which segmentation does not have.',
  },
  'speech-audio': {
    why: 'No reference kit handles audio. The text and image kits assume the input is already a document or a picture.',
    closest: 'nlp',
    closestWhy: 'It teaches leak-aware text evaluation. It has no audio front end, acoustic model or word-error-rate scoring.',
  },
  'generative-or-other': {
    why: 'This task (for example generated media, code, tutoring or text rewriting) is not what any reference kit implements, and its quality is judged by task-specific human or automated review rather than a label.',
    closest: 'llm-rag',
    closestWhy: 'It teaches a verifier and a golden set with unanswerable cases. It implements question answering over documents, not this generative task.',
  },
};

/* ------------------------------------------------------------------ classification */

export interface Classified {
  type: ProblemType;
  basis: string;
}

/** The text a classifier reads. Lower-cased and with punctuation flattened so that regular expressions can use word boundaries. */
function texts(raw: RawUseCase) {
  // keep each hyphenated word both ways ('in-app' and 'in app'), so a pattern can be written either way
  const flat = (s: string) => {
    const a = s.toLowerCase().replace(/[^a-z0-9%@.+-]+/g, ' ');
    return ` ${a} ${a.replace(/-/g, ' ')} `;
  };
  return {
    head: flat(`${raw.key} ${raw.title}`),
    metrics: flat([...raw.off, ...raw.on].join(' ')),
    /** the primary offline metric: what the use case is judged by */
    off: flat(raw.off[0] ?? ''),
    model: flat(`${raw.base} ${raw.prod} ${raw.loss ?? ''}`),
    obj: flat(raw.obj),
    pipe: flat(raw.pipe.map((p) => `${p.label} ${p.tech}`).join(' ')),
  };
}

export function classifyProblem(raw: RawUseCase, paradigms: Paradigm[], overrides: Record<string, Override>, slug: string): Classified {
  const o = overrides[slug];
  if (o) return { type: o.problemType, basis: `Declared in content/kit-compatibility.json: ${o.reason}` };

  const t = texts(raw);
  const kit = pickKit(raw, paradigms);
  const hit = (re: RegExp, s: string) => re.test(s);
  const done = (type: ProblemType, basis: string): Classified => ({ type, basis });

  // language-model systems first: an agent or a document-grounded assistant is judged very differently from a classifier
  if (kit === 'llm-agent' || kit === 'llm-rag') {
    if (hit(/\b(in app|runbook|playbook agent|remediat|tool permission|autonomous|dispatch|executes?|automation agent|incident response)\b/, t.head))
      return done('agentic-write-actions', 'language-model agent whose title names actions it performs');
    if (kit === 'llm-agent') {
      if (hit(/\b(copilot|assistant|agent)\b/, t.head) && hit(/\b(summar|memo|lesson|generation|generate|draft|review assistant|code review|qbr|keyword|sigma)\b/, `${t.head}${t.off}`))
        return done('grounded-generation', 'agent-style assistant whose output is generated text judged for support');
      if (hit(/\b(extraction|intake|spreading|coding)\b/, t.head)) return done('information-extraction', 'agent-style assistant whose output is extracted fields');
      if (hit(/\bnatural language to sql|sql\b/, `${t.head}${t.off}`)) return done('agentic-read-only', 'agent that reads data through a query tool');
      if (hit(/\b(tutor|conversational|oral exam|practice|code completion|support chatbot|shopping assistant)\b/, t.head)) return done('generative-or-other', 'conversational or tutoring task judged by rubric, not by grounded answers');
      return done('agentic-read-only', 'language-model agent gathering evidence through tools');
    }
    // llm-rag family
    if (hit(/\b(tutor|socratic|question generation|distractor|creative generation|code completion|test generation|simplification|macro scenario|programming assignment|math solution|short answer grading|conversational ads|email assistant|gift|oral)\b/, t.head))
      return done('generative-or-other', 'generative or tutoring task not grounded in a retrieved collection');
    if (hit(/\b(triage|routing|screening|prompt injection)\b/, t.head) && !hit(/\b(extraction|abstraction|parsing)\b/, t.head)) return done(hit(/\b(prompt injection)\b/, t.head) ? 'text-classification' : 'text-classification', 'language-model classification or routing of messages');
    if (hit(/\b(extraction|abstraction|parsing|matching|schema|coding|call qa|prior authorization|compliance checking|llm judge|monitoring|evaluation and regression)\b/, t.head)) {
      if (hit(/\b(prompt injection|routing|llm app eval|rag quality|llm judge|judge)\b/, t.head)) return done('generative-or-other', 'evaluation or routing of language-model systems');
      return done('information-extraction', 'language-model extraction of fields or labels from documents');
    }
    if (hit(/\b(summar|scribe|factsheet|report generation|notes|description generation)\b/, t.head)) return done('grounded-generation', 'generates text that must stay faithful to source material');
    return done('grounded-qa', 'answers questions from a document collection');
  }

  // survival: a time-to-event target with censoring (judged by its own metrics and title, not by words in its prose)
  if (hit(/\b(concordance|c-index|time-dependent auc|hazard|survival|cumulative (cpr|cdr))\b/, `${t.off}${t.head}`) || hit(/\b(time to sell|dwell time|time to (default|event|failure|lapse))\b/, t.head))
    return done('survival-time-to-event', 'its own metrics or title are time-to-event (concordance, time-dependent AUC, hazard)');

  // uplift and causal measurement
  if (hit(/\b(qini|auuc|uplift)\b/, `${t.off}${t.head}`)) return done('uplift-causal-effect', 'its metric or title is uplift (Qini or AUUC)');
  if (hit(/\b(placebo|multi-touch attribution|attribution|geo experiments?|elasticity|cuped|a\/a|incrementality|marketing mix|holdout lift|differential privacy|panel reach|modeled conversions)\b/, `${t.head}${t.off}`) && !hit(/\b(threat actor|footfall attribution forecast)\b/, t.head))
    return done('causal-measurement', 'estimates an aggregate effect or quantity with no per-row label');

  // forecasting and anomaly detection on series
  const series = paradigms[0] === 'time-series' || kit === 'forecast' || kit === 'anomaly';
  const anomalyWords = /\b(anomal|intrusion|exfil|ransom|ddos|excursion|spoofing|incident detection|deepfake|drift monitoring|outage|failure detection|attack|fraud|break detection|runtime)\w*\b/;
  if (series && hit(/\b(wape|wmape|mape|pinball|quantile|coverage|forecast|horizon|qlike|back-?test|rmse|mae|census|occupancy|count error|reach error|error by|mean absolute error|quantity error|run-off)\b/, `${t.off}${t.head}`) && !hit(/\b(detection delay|false alarms?|alerts?|at fixed false)\b/, t.off))
    return done('forecasting', 'predicts future values of series and is judged by forecast error');
  if (series && (kit === 'anomaly' || hit(anomalyWords, `${t.head}${t.off}`)) && hit(/\b(detect|detection|recall|alert|lead time|delay|precision|false)\b/, t.off))
    return done('time-series-anomaly-detection', 'detects events in a series at an alert budget');

  // recommendation and search
  if (kit === 'recommender' && hit(/\b(ndcg|hit ?rate|hitrate|mrr|recall@|top-1 acceptance|agreement with|acceptance prediction|ranking accuracy|precision and recall vs manual)\b/, t.off)) {
    if (hit(/\b(search|query|relevance|retrieval|bm25)\b/, `${t.head}${t.off}${t.model}`)) return done('search-ranking', 'ranks documents or products for a query');
    if (hit(/\b(session|next item|next-item)\b/, t.head)) return done('next-item-recommendation', 'recommends the next item from the session');
    return done('personalised-ranking', 'ranks items for a user and is judged by ranking metrics');
  }
  if (hit(/\b(search|relevance)\b/, t.head) && hit(/\b(ndcg|judgments|judgements|recall@|mrr|auc against human)\b/, t.off)) return done('search-ranking', 'ranks documents or products for a query');

  // entity resolution and graph structure
  if (hit(/\b(resolution|matching|deduplication|duplicate listing|cross-device|record linkage|merge|entity)\b/, t.head) && !hit(/\b(prediction|fraud ring)\b/, t.head))
    return done('entity-resolution', 'decides whether two records are the same entity');
  if (kit === 'graph' && hit(/\b(cluster|community|ring|correlation|deduplication|root cause|similarity|attack path|attribution|suppression|grouping|purity)\b/, `${t.head}${t.off}`))
    return done('graph-analytics', 'finds structure in a graph of entities');

  // vision
  const visionFirst = paradigms[0] === 'computer-vision';
  if (visionFirst || (paradigms.includes('computer-vision') && hit(/\b(map|iou|dice|hausdorff|froc|boundary|detection f1|lesion-level|ocr|field-level|word error|room iou)\b/, `${t.off}${t.head}`))) {
    if (hit(/\b(ocr|document|invoice|spreading|handwritten|barcode|floor plan|screenshot|extraction|mrz|field-level|word error|cell exact)\b/, `${t.head}${t.off}`)) return done('information-extraction', 'reads fields or text out of images and documents');
    if (hit(/\b(map|iou|dice|hausdorff|froc|boundary|detection f1|lesion-level|segmentation|contouring|dimensioning|element accuracy|room iou|collision|measurement error|fid|structure similarity|identity similarity)\b/, `${t.off}${t.head}`)) {
      if (hit(/\b(fid|structure similarity|identity similarity|virtual try|staging|enhancement|path planning|collision)\b/, `${t.off}${t.head}`)) return done('generative-or-other', 'generates or plans from images rather than labelling them');
      return done('vision-detection-segmentation', 'localises findings in images (boxes, masks or measurements)');
    }
    if (hit(/\b(recall@|search|embeddings)\b/, `${t.off}${t.head}`) && hit(/\bvisual search\b/, t.head)) return done('personalised-ranking', 'retrieves and ranks products from an image query');
    if (visionFirst && !hit(/\b(mape|rmse|mae|error|rank correlation|brier|calibration|enrichment|ranking accuracy|usefulness)\b/, t.off)) return done('vision-classification', 'labels an image or a piece of content');
  }

  // text and speech
  if (hit(/\b(asr|speech|voice|pronunciation|captioning|word error rate|wer|fluency|audio|vishing)\b/, `${t.head}${t.off}`)) return done('speech-audio', 'derives text or scores from audio');
  if (paradigms[0] === 'nlp') {
    if (hit(/\b(extraction|redaction|parsing|geocoding|entity recall|component f1|field-level|word error|extract|spans?|skill extraction|phi|pii)\b/, `${t.head}${t.off}`)) return done('information-extraction', 'pulls fields or entities out of text');
    if (hit(/\b(coherence|clustering|mining|topic)\b/, `${t.head}${t.off}`) && !hit(/\bmacro-f1\b/, t.off)) return done('clustering-segmentation', 'groups text without a ground-truth label');
    if (hit(/\b(generation|distractor|summar)\b/, t.head)) return done('generative-or-other', 'generates text');
    if (!hit(/\b(rmse|mape|mae|error|quadratic weighted|kappa|correlation)\b/, t.off) || hit(/\b(essay|grading|scoring)\b/, t.head)) return done('text-classification', 'assigns a class or a risk label to text');
  }

  // decisions, control and optimisation
  if (paradigms.includes('reinforcement-learning') || kit === 'bandit' || kit === 'optimize') {
    if (hit(/\b(market making|hvac|order execution|slippage|digital twin|fuzzing|red team|spaced repetition|drone|treatment response|portfolio optimization|autoscaling|feature flag|rollout safety|simulation)\b/, `${t.head}`) || (kit === 'bandit' && hit(/\b(simulat|market-replay|backtest)\w*\b/, t.off) && !hit(/\b(off-policy|doubly|propensity|replay|regret|randomi[sz]ed)\b/, t.off)))
      return done('sequential-control-simulation', 'a policy for repeated decisions evaluated in a simulator or replay');
    if (kit === 'bandit' && hit(/\b(off-policy|doubly|propensity|replay|regret|randomi[sz]ed|fqe|inverse|counterfactual|surplus per impression|incremental conversions)\b/, t.off)) return done('off-policy-decisioning', 'chooses actions from logged decisions and is judged by off-policy value');
    if (kit === 'optimize') return done('optimisation-allocation', 'allocates, routes or schedules under constraints');
    if (kit === 'bandit') return done('binary-event-classification', 'the model is a prediction (calibration, AUC) that feeds a decision rule');
  }

  // clustering
  if (hit(/\b(cluster|clustering|segmentation|segments|purity|coherence|differential response|persona)\b/, `${t.head}${t.off}`) && !hit(/\b(f1|auc|precision at|recall)\b/, t.off))
    return done('clustering-segmentation', 'groups entities with no ground-truth label');

  // regression versus classification on entity rows
  if (hit(/\b(mape|wape|mae|rmse|mean absolute|absolute error|squared error|error vs|error against|error versus|deviance|variance explained|expected-use error|cod and prd|rank correlation|spearman|brier|weighted quantile|pinball|quantile loss|information coefficient|overrun|fuel per trip|std|standard error|per square|median absolute|prediction error|forecast error|count error|quantity error|gini of (value|ltv)|normalised gini of|sharpe|qlike)\b/, `${t.off}`) && !hit(/\b(pr-auc|precision at|recall at|detection rate)\b/, t.off))
    return done('regression-estimation', 'predicts a continuous quantity and is judged by error');
  if (hit(/\b(macro-f1|macro f1|micro-f1|accuracy|routing accuracy|per-class|top-1|ranked probability|quadratic weighted|kappa|cause accuracy|rating)\b/, t.off) && !hit(/\b(pr-auc|auc|precision at|recall at)\b/, t.off))
    return done('multiclass-classification', 'assigns one of several classes');
  if (kit === 'tabular' || hit(/\b(auc|pr-auc|precision|recall|detection|lift|gini|ks\b|calibration|f1|brier|accuracy)\b/, t.off))
    return done('binary-event-classification', 'scores individual events or entities against a binary outcome');

  return done('generative-or-other', 'no more specific rule applied');
}

/* ------------------------------------------------------------------ metric, model and shape families */

export function metricFamilies(text: string): string[] {
  const s = ` ${text.toLowerCase().replace(/[^a-z0-9%@.+/-]+/g, ' ')} `;
  const f = new Set<string>();
  const add = (re: RegExp, fam: string) => re.test(s) && f.add(fam);
  add(/\b(pr-auc|auprc|precision at|recall at|recall of|detection rate|tpr|alerts?|capacity|top-k|precision of|precision on|false alarms?)\b/, 'rare-event-ranking');
  add(/\b(auc|auroc|gini|ks|roc)\b/, 'discrimination');
  add(/\b(calibration|ece|brier|reliab)\w*\b/, 'calibration');
  add(/\b(concordance|c-index|time-dependent|hazard|survival)\b/, 'survival');
  add(/\b(qini|uplift|auuc|incremental|placebo)\b/, 'uplift');
  add(/\b(ndcg|mrr|hit ?rate|hitrate|recall@|map@)\b/, 'ranking');
  add(/\b(wape|wmape|mape|smape|pinball|quantile|coverage|mase|qlike)\b/, 'forecast-error');
  add(/\b(rmse|mae|mean absolute|deviance|squared error|absolute error|error)\b/, 'regression-error');
  add(/\b(f1|accuracy|macro|micro|kappa|per-category|per-policy)\b/, 'classification-f1');
  add(/\b(map|iou|dice|hausdorff|froc|sensitivity|specificity)\b/, 'vision');
  add(/\b(grounded|groundedness|citation|faithful\w*|hallucinat\w*|abstain|abstention|answer correctness|unsupported)\b/, 'grounding');
  add(/\b(task success|verdict accuracy|unsafe|injection|trajectory|replayed|replay)\b/, 'agent-task');
  add(/\b(off-policy|doubly|inverse propensity|regret|counterfactual|policy value|fqe)\b/, 'ope');
  add(/\b(simulated|simulation|cost|service level|tardiness|gap to|utili[sz]ation)\b/, 'optimisation');
  add(/\b(link precision|pair|cluster purity|merge precision|purity)\b/, 'resolution');
  add(/\b(delay|latency|lead time)\b/, 'detection-delay');
  return [...f];
}

function modelFamilies(text: string): string[] {
  const s = ` ${text.toLowerCase()} `;
  const f = new Set<string>();
  const add = (re: RegExp, fam: string) => re.test(s) && f.add(fam);
  add(/lightgbm|xgboost|gradient|boost|catboost|random forest|decision tree|\btrees?\b|gbdt/, 'gbdt');
  add(/logistic|\bglm\b|linear|regression|scorecard|ridge|lasso|elastic/, 'linear');
  add(/transformer|neural|lstm|gru|cnn|deep|\bbert\b|embedding|two-tower|dnn|vit\b|resnet|u-net|unet|\bgan\b|diffusion|encoder|attention/, 'neural');
  add(/cox|hazard|bayes|bg\/nbd|gamma|probabilistic|gaussian|hierarchical|state.space|kalman/, 'probabilistic');
  add(/arima|ets\b|seasonal|naive|statistical|z-score|holt|prophet|moving average|bm25|co-visitation|popularity|collaborative/, 'statistical');
  add(/milp|cp-sat|or-tools|solver|linear program|mip\b|optimi[sz]er|assignment|routing|heuristic/, 'solver');
  add(/thompson|bandit|policy|\brl\b|reinforcement|q-learning|ppo|actor|reward model/, 'policy');
  add(/\bgnn\b|graph|connected component|louvain|node2vec|community/, 'graph');
  add(/\bllm\b|language model|rag\b|retriev|agent|prompt|gpt|claude/, 'retrieval-llm');
  return [...f];
}

/* ------------------------------------------------------------------ profile and matching */

export interface Profile {
  problemType: ProblemType;
  basis: string;
  metrics: string[];
  primaryMetricFamilies: string[];
  modelFamilies: string[];
  integrations: string[];
  writes: boolean;
}

const sentenceOf = (s: string, n = 170) => {
  const x = s.trim().replace(/\s+/g, ' ');
  const first = x.split(/(?<=[.!?])\s/)[0] ?? x;
  return first.length <= n ? first.replace(/[.]$/, '') : `${first.slice(0, n - 1).trimEnd()}…`;
};
const clip = (s: string, n = 150) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

export function buildProfile(raw: RawUseCase, paradigms: Paradigm[], stages: Stage[], cls: Classified): Profile {
  const stageText = stages.map((s) => `${s.label} ${s.tech} ${s.kind}`).join(' ');
  const integrations: string[] = [];
  for (const s of stages) {
    if (s.kind === 'feature') integrations.push(`${s.label} (${s.tech})`);
    else if (s.kind === 'human') integrations.push(`${s.label} (${s.tech}): a person in the loop`);
    else if (s.kind === 'sink') integrations.push(`${s.label} (${s.tech})`);
    else if (s.kind === 'retrieve') integrations.push(`${s.label} (${s.tech})`);
    else if (s.kind === 'ingest') integrations.push(`${s.label} (${s.tech})`);
  }
  const writes = cls.type === 'agentic-write-actions';
  return {
    problemType: cls.type,
    basis: cls.basis,
    metrics: raw.off.map((m) => m.trim()),
    primaryMetricFamilies: metricFamilies(raw.off[0] ?? ''),
    modelFamilies: unique([...modelFamilies(raw.prod), ...(modelFamilies(stageText).includes('retrieval-llm') && paradigms.includes('llm-agents') ? ['retrieval-llm'] : [])]),
    integrations: integrations.slice(0, 5),
    writes,
  };
}

const unique = <T,>(xs: T[]) => [...new Set(xs)];

export interface KitEvaluation {
  kitId: KitId;
  verdict: 'exact' | 'adaptable' | 'none';
  problem: 'match' | 'adapt' | 'mismatch';
  dimensions: CompatDimension[];
  modifications: string[];
  /** a rank for choosing among kits: lower is better */
  rank: number;
}

const LATENCY_TEXT: Record<LatencySLA, string> = {
  'sub-10ms': 'Online decision inside a few milliseconds',
  'sub-100ms': 'Online decision inside about 100 milliseconds',
  seconds: 'Interactive response in seconds',
  batch: 'Scheduled batch run',
};

export function evaluateKit(raw: RawUseCase, profile: Profile, latency: LatencySLA, stages: Stage[], kitId: KitId, c: KitContract): KitEvaluation {
  const type = profile.problemType;
  const p = PROFILE[type];
  const problem: KitEvaluation['problem'] = c.problemTypes.includes(type) ? 'match' : c.adaptable[type] ? 'adapt' : 'mismatch';
  const kitProblem = PROBLEM_LABEL[c.problemTypes[0]!];
  const mods: string[] = [...(c.adaptable[type] ?? [])];
  const dims: CompatDimension[] = [];
  const dim = (dimension: CompatDimension['dimension'], needs: string, provides: string, status: CompatDimension['status'], change?: string) => dims.push({ dimension, needs, provides, status, ...(change ? { change } : {}) });
  const byProblem: CompatDimension['status'] = problem;

  dim('problem', `${PROBLEM_LABEL[type]}: ${sentenceOf(raw.obj)}`, kitProblem, byProblem, problem === 'adapt' ? `The kit implements ${lcFirst(kitProblem)}; this use case is ${lcFirst(PROBLEM_LABEL[type])}. Only the reusable parts carry over (see the modifications)` : problem === 'mismatch' ? `The kit implements ${lcFirst(kitProblem)}, a different problem` : undefined);
  dim('label', p.label, c.provides.label, byProblem, problem === 'match' ? undefined : 'Define the label this use case really has before writing any code; the kit label does not describe it');
  dim('validation', p.validation, c.provides.validation, byProblem, problem === 'match' ? undefined : 'Use the validation method named here, not the kit split, which is built for the kit label');

  // metrics: does the primary metric belong to a family the kit evaluates?
  const kitFam = new Set(c.provides.metricFamilies);
  const primary = profile.primaryMetricFamilies;
  // only the problem, label and validation can rule a kit out; a different metric, data shape or model is a modification
  const metricStatus: CompatDimension['status'] = problem === 'mismatch' ? 'mismatch' : primary.some((f) => kitFam.has(f)) ? 'match' : 'adapt';
  const metricChange = `Score ${clip(profile.metrics.slice(0, 2).map((m) => `"${m}"`).join(' and '), 110)} instead of the kit metrics`;
  dim('metrics', clip(profile.metrics.join('; '), 170), c.provides.metrics, problem === 'match' ? metricStatus : problem === 'adapt' ? 'adapt' : 'mismatch', metricStatus === 'match' && problem === 'match' ? undefined : metricChange);

  const shape = dataShapeOf(type);
  const shapeStatus: CompatDimension['status'] = problem === 'mismatch' ? 'mismatch' : c.provides.dataShapes.includes(shape) ? 'match' : 'adapt';
  dim('data', p.data, c.provides.data, problem === 'match' ? shapeStatus : problem === 'adapt' ? 'adapt' : 'mismatch', shapeStatus === 'match' && problem === 'match' ? undefined : `Replace the synthetic data (${clip(c.provides.vocabulary, 70)}) with data of the shape this use case has; rename every column and keep the generator's trap tests`);

  const kitModels = new Set(c.provides.modelFamilies);
  const useModels = profile.modelFamilies.length ? profile.modelFamilies : p.models;
  const modelStatus: CompatDimension['status'] = problem === 'mismatch' ? 'mismatch' : useModels.some((m) => kitModels.has(m)) ? 'match' : 'adapt';
  dim('model', `Baseline: ${sentenceOf(raw.base, 110)}. Production: ${sentenceOf(raw.prod, 110)}`, c.provides.model, problem === 'match' ? modelStatus : problem === 'adapt' ? 'adapt' : 'mismatch', modelStatus === 'match' && problem === 'match' ? undefined : `Replace the kit's models with the blueprint's: ${clip(sentenceOf(raw.prod, 100), 100)}`);

  const budget = TOTAL_BUDGET_MS[latency];
  dim('serving', `${LATENCY_TEXT[latency]}${budget === null ? '' : ` (p99 ${budget} ms)`}`, c.provides.serving, 'outside-kit', 'Milestone M5 is yours: nothing in the kit serves traffic');
  const writeChange = profile.writes ? 'Typed write tools authorised on the user\'s behalf, with execution verification and reversal: the kit only simulates an approval token' : undefined;
  dim('integrations', profile.integrations.length ? `${profile.integrations.join('; ')}${profile.writes ? '; writes to product systems' : ''}` : 'No external system beyond the data source', c.provides.integrations, profile.writes && kitId === 'llm-agent' ? 'adapt' : 'outside-kit', writeChange ?? 'Connect these on your own platform in M5 and M6; the kit connects to nothing');

  // with no related kit, say nothing about the kit's own data or model: it belongs to a different problem
  if (problem === 'mismatch') {
    const set = (dimension: CompatDimension['dimension'], change: string) => {
      const d = dims.find((x) => x.dimension === dimension)!;
      d.change = change;
    };
    set('metrics', `Score ${clip(profile.metrics.slice(0, 2).map((m) => `"${m}"`).join(' and '), 110)}; the kit's metrics belong to another problem`);
    set('data', 'No synthetic data for this problem is supplied: build your own sample (milestone M1)');
    set('model', "No reference model for this problem is supplied: build the baseline and the production design from the blueprint");
  }

  // caveats: a kit for the same problem is not an exact match for a structurally different instance of it
  if (problem === 'match') {
    const t = texts(raw);
    const text = `${t.head}${t.obj}${t.model}${t.pipe}`;
    for (const cv of c.caveats ?? []) {
      if (!new RegExp(`\\b(${cv.pattern})`).test(text)) continue;
      const d = dims.find((x) => x.dimension === cv.dimension)!;
      if (d.status === 'match') {
        d.status = 'adapt';
        d.change = cv.change;
      } else if (d.change && !d.change.includes(cv.change)) d.change = `${d.change}; ${cv.change}`;
      else if (!d.change) d.change = cv.change;
    }
  }

  // modifications: the contract's own list, then one line per adapted or mismatched dimension that has a change
  if (problem !== 'mismatch')
    for (const d of dims)
      if ((d.status === 'adapt' || d.status === 'mismatch') && d.change && d.dimension !== 'problem' && d.dimension !== 'label' && d.dimension !== 'validation') mods.push(d.change);
  const modsU = unique(mods);

  let verdict: KitEvaluation['verdict'];
  if (problem === 'mismatch') verdict = 'none';
  else if (problem === 'adapt') verdict = 'adaptable';
  else verdict = dims.some((d) => d.status === 'adapt' || d.status === 'mismatch') ? 'adaptable' : 'exact';
  const rank = verdict === 'exact' ? 0 : verdict === 'adaptable' ? 10 + modsU.length : 100;
  return { kitId, verdict, problem, dimensions: dims, modifications: verdict === 'exact' ? [] : modsU, rank };
}

const lcFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function dataShapeOf(t: ProblemType): string {
  switch (t) {
    case 'binary-event-classification':
    case 'multiclass-classification':
    case 'regression-estimation':
    case 'survival-time-to-event':
    case 'uplift-causal-effect':
      return 'event-tabular';
    case 'forecasting':
    case 'time-series-anomaly-detection':
    case 'tabular-anomaly-detection':
    case 'causal-measurement':
      return 'panel-time-series';
    case 'next-item-recommendation':
      return 'sessions';
    case 'entity-resolution':
    case 'graph-analytics':
      return 'graph-records';
    case 'vision-classification':
    case 'vision-detection-segmentation':
      return 'images';
    case 'text-classification':
    case 'information-extraction':
      return 'text';
    case 'grounded-qa':
    case 'grounded-generation':
      return 'documents';
    case 'agentic-read-only':
    case 'agentic-write-actions':
      return 'cases';
    case 'off-policy-decisioning':
      return 'logged-decisions';
    case 'optimisation-allocation':
      return 'instances';
    default:
      return 'other';
  }
}

/* ------------------------------------------------------------------ the compatibility record */

export function buildCompatibility(
  raw: RawUseCase,
  paradigms: Paradigm[],
  latency: LatencySLA,
  stages: Stage[],
  domain: Domain,
  slug: string,
  root: string,
): Compatibility {
  const files = loadCompatFiles(root);
  const cls = classifyProblem(raw, paradigms, files.overrides, slug);
  const profile = buildProfile(raw, paradigms, stages, cls);
  const evals = KIT_IDS.map((id) => evaluateKit(raw, profile, latency, stages, id, files.contracts[id]));
  const preferred = pickKit(raw, paradigms);
  const best = [...evals].sort((a, b) => a.rank - b.rank || Number(b.kitId === preferred) - Number(a.kitId === preferred) || KIT_IDS.indexOf(a.kitId) - KIT_IDS.indexOf(b.kitId))[0]!;
  const evaluated = evals.map((e) => ({
    kitId: e.kitId,
    verdict: e.verdict,
    ...(e.verdict === 'none' ? { blocker: `Implements ${lcFirst(PROBLEM_LABEL[files.contracts[e.kitId].problemTypes[0]!])}, not ${lcFirst(PROBLEM_LABEL[cls.type])}` } : {}),
  }));
  const title = raw.title;

  if (best.verdict === 'none') {
    const nr = NONE_REASON[cls.type];
    const closestId = nr?.closest ?? preferred;
    const closest = files.contracts[closestId];
    const nearest = evals.find((e) => e.kitId === closestId)!;
    return {
      verdict: 'none',
      source: 'none',
      problemType: cls.type,
      basis: cls.basis,
      statement: NO_KIT_STATEMENT,
      dimensions: nearest.dimensions,
      reusable: [],
      modifications: [],
      blockers: [
        nr?.why ?? `No reference kit implements ${lcFirst(PROBLEM_LABEL[cls.type])}. Each kit implements one other problem and cannot represent this use case's label, validation or metrics.`,
        `"${title}" needs ${lcFirst(PROBLEM_PROFILE_LABEL(cls.type))}.`,
      ],
      closest: {
        kitId: closestId,
        label: files.labels[closestId],
        whyNot: nr?.closestWhy ?? `It implements ${lcFirst(PROBLEM_LABEL[closest.problemTypes[0]!])}. Read it for background on ${closest.reusable[0]!.toLowerCase()}, but do not use it as a starter for this problem.`,
      },
      evaluated,
    };
  }

  const c = files.contracts[best.kitId];
  return {
    verdict: best.verdict,
    source: 'reference-kit',
    problemType: cls.type,
    basis: cls.basis,
    kitId: best.kitId,
    kitLabel: files.labels[best.kitId],
    statement:
      best.verdict === 'exact'
        ? `Exact match: the "${files.labels[best.kitId]}" reference kit implements the same fundamental problem (${lcFirst(PROBLEM_LABEL[cls.type])}). Its code and numbers run on synthetic data, not on this use case's data.`
        : `Adaptable match: the "${files.labels[best.kitId]}" reference kit implements ${lcFirst(PROBLEM_LABEL[c.problemTypes[0]!])}. It supplies reusable parts for ${lcFirst(PROBLEM_LABEL[cls.type])}, but it is not this system's starter until the modifications below are made.`,
    dimensions: best.dimensions,
    reusable: c.reusable,
    modifications: best.modifications,
    blockers: [],
    closest: best.verdict === 'adaptable' ? { kitId: best.kitId, label: files.labels[best.kitId], whyNot: `Cannot represent: ${c.cannotRepresent.slice(0, 3).join('; ').toLowerCase()}.` } : undefined,
    evaluated,
  };
}

const PROBLEM_PROFILE_LABEL = (t: ProblemType) => PROFILE[t].label;

/** Compatibility of a hand-written pilot: its starter was written for this use case, so it matches by construction. */
export function buildAuthoredCompatibility(
  raw: RawUseCase,
  paradigms: Paradigm[],
  latency: LatencySLA,
  stages: Stage[],
  domain: Domain,
  slug: string,
  root: string,
  authored: { syntheticDescription: string; label: string; files: string[] },
): Compatibility {
  const files = loadCompatFiles(root);
  const cls = classifyProblem(raw, paradigms, files.overrides, slug);
  const profile = buildProfile(raw, paradigms, stages, cls);
  const p = PROFILE[cls.type];
  const budget = TOTAL_BUDGET_MS[latency];
  const dims: CompatDimension[] = [
    { dimension: 'problem', needs: `${PROBLEM_LABEL[cls.type]}: ${sentenceOf(raw.obj)}`, provides: `The same problem: a starter written for "${raw.title}"`, status: 'match' },
    { dimension: 'label', needs: p.label, provides: clip(authored.label, 220), status: 'match' },
    { dimension: 'validation', needs: p.validation, provides: 'The split, label-maturity and leakage tests in the starter (milestones M1 and M2)', status: 'match' },
    { dimension: 'metrics', needs: clip(profile.metrics.join('; '), 170), provides: `The starter reports ${clip(profile.metrics.slice(0, 2).join(' and '), 120)} for baseline and challenger (milestones M3 and M4)`, status: 'match' },
    { dimension: 'data', needs: p.data, provides: clip(authored.syntheticDescription, 220), status: 'match' },
    { dimension: 'model', needs: `Baseline: ${sentenceOf(raw.base, 110)}. Production: ${sentenceOf(raw.prod, 110)}`, provides: 'The baseline and the stronger design of the blueprint, trained and compared in the starter', status: 'match' },
    { dimension: 'serving', needs: `${LATENCY_TEXT[latency]}${budget === null ? '' : ` (p99 ${budget} ms)`}`, provides: 'No serving code: the starter runs offline', status: 'outside-kit', change: 'Milestone M5 is yours: nothing in the starter serves traffic' },
    { dimension: 'integrations', needs: profile.integrations.length ? profile.integrations.join('; ') : 'No external system beyond the data source', provides: 'None: the starter runs locally on synthetic data', status: 'outside-kit', change: 'Connect these on your own platform in M5 and M6' },
  ];
  return {
    verdict: 'exact',
    source: 'authored-starter',
    problemType: cls.type,
    basis: cls.basis,
    kitLabel: 'Hand-written starter for this use case',
    statement: `Exact match: this blueprint has a hand-written starter (${authored.files.join(', ')}) built for this problem. It runs on synthetic data; serving and rollout are yours.`,
    dimensions: dims,
    reusable: authored.files,
    modifications: [],
    blockers: [],
    evaluated: [],
  };
}
