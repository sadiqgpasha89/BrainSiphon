/**
 * Use-case-specific narrative: the problem statement, the solution approach, the reason each architecture stage exists
 * here, and the ten-phase end-to-end breakdown.
 *
 * Everything is assembled from the use case's own authored fields (objective, signal/noise rows, features, constraints,
 * pipeline stages, edge cases, metrics, traps) plus a voice for the kind of system it is (the same eleven patterns as the
 * reference kits) and for its domain. A validator gate keeps shared, word-for-word text out of the end-to-end steps.
 */
import { LATENCY_LABEL, type Domain, type LatencySLA, type Paradigm, type PatternId, type UseCase } from '../schemas/usecase.schema';
import { bottlenecksFor, TOTAL_BUDGET_MS, type Stage } from './design';
import type { RawUseCase } from './parse';
import { usd, type ScaleResult } from './scale';

type Narrative = Pick<UseCase, 'problemStatement' | 'solutionApproach' | 'architectureRationale'>;

const lc = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const up = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const dot = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const nodot = (s: string) => s.trim().replace(/[.!?]+$/, '');
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length > 3));
const overlap = (a: string, b: string) => {
  const wa = words(a);
  let n = 0;
  for (const w of words(b)) if (wa.has(w)) n++;
  return n;
};
const fmtN = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));

const DOMAIN_DATA: Record<Domain, string> = {
  fintech: 'Tokenise card and account numbers at the edge and keep PCI scope out of the feature pipeline',
  retail: 'Pseudonymise shopper identifiers, honour consent and deletion requests, and keep payment data out of the model path',
  healthcare: 'Treat every field as protected health information: de-identify before training, log every access, keep data in the covered environment',
  'supply-chain': 'Separate commercially sensitive supplier and rate data by tenant, and mask driver and recipient personal data',
  adtech: 'Hash identifiers at ingestion, honour consent signals per request and keep raw user-level data out of long-term stores',
  cybersecurity: 'Redact secrets and personal data from logs and artefacts before they reach models, and keep evidence immutable for investigations',
  edtech: 'Pseudonymise learners, apply stricter rules to minors and keep identifiable work samples out of prompts and logs',
  saas: 'Isolate tenants end to end, never train across customers without contract permission and keep customer content out of shared logs',
  bfsi: 'Mask customer and policy identifiers, keep model inputs inside the institution and retain evidence for model-risk and audit review',
  'real-estate': 'Mask tenant, buyer and owner personal data, keep protected attributes and their proxies out of features, and log the evidence behind each value or score',
};

const DOMAIN_OWNER: Record<Domain, string> = {
  fintech: 'risk and payments product',
  retail: 'merchandising and growth product',
  healthcare: 'clinical operations with a named clinical safety owner',
  'supply-chain': 'network operations',
  adtech: 'the buying and measurement team',
  cybersecurity: 'the security operations lead',
  edtech: 'the learning product team with an academic owner',
  saas: 'the product and platform team',
  bfsi: 'the business line with model risk as independent challenger',
  'real-estate': 'the valuation, leasing or asset-management owner',
};

interface Voice {
  shadow: (r: RawUseCase) => string;
  rollout: (r: RawUseCase) => string;
  labels: (r: RawUseCase) => string;
  retrain: (r: RawUseCase, days: string) => string;
  limit: (r: RawUseCase) => string;
}

const VOICE: Record<PatternId, Voice> = {
  tabular: {
    shadow: (r) => `Read only the decisions where challenger and champion disagree: those are the only cases that change an outcome, so review a sample of them for "${r.edge[0]![0]}" first.`,
    rollout: (r) => `Ramp by traffic slice and compare against a permanent holdout, because "${r.on[0]}" only moves where the model changes the decision.`,
    labels: (r) => `Outcomes for "${r.on[0]}" arrive late, so estimate performance on matured cohorts and treat the newest weeks as provisional.`,
    retrain: (_r, d) => `Retrain on a ${d}-day maturity window with the newest unmatured rows excluded, and promote only after the calibration check passes.`,
    limit: (r) => `Stop investing in model size when error analysis shows that misses cluster in "${r.edge[0]![0]}", which is a data and process problem.`,
  },
  forecast: {
    shadow: (r) => `Publish the challenger forecast beside the champion for a full seasonal cycle of the hardest series, and compare the interval coverage, not only the point error, on "${r.off[0]}".`,
    rollout: (r) => `Roll out by series group, starting with the stable high-volume ones, and keep a naive seasonal forecast running as the permanent comparator for "${r.on[0]}".`,
    labels: () => `Actuals arrive after the horizon closes, so score each forecast at the horizon it was made for and never overwrite old forecasts with revised history.`,
    retrain: (_r, d) => `Refit on a ${d}-day cadence with rolling-origin evaluation, and refit sooner when interval coverage drifts outside its band.`,
    limit: (r) => `Add model capacity only when residuals are not explained by "${r.edge[0]![0]}", otherwise the fix is an event feature, not a bigger network.`,
  },
  anomaly: {
    shadow: (r) => `Run the detector silently and have operators label a day of its alerts, concentrating on the alerts that fire during "${r.edge[0]![0]}".`,
    rollout: (r) => `Turn alerts on per service or series group, and tune thresholds to the alert volume the on-call can absorb, measured by "${r.on[1] ?? r.on[0]}".`,
    labels: () => `Labels are the incidents operators confirm, so record alert dispositions as the training signal and expect them to be sparse and biased toward what was noticed.`,
    retrain: (_r, d) => `Re-estimate the baselines every ${d} days and after every known level change, so a deploy or a promotion does not become tomorrow's false alarm.`,
    limit: (r) => `Move to a heavier detector only when the baseline plus calendar events cannot separate real incidents from "${r.edge[0]![0]}".`,
  },
  recommender: {
    shadow: (r) => `Log the challenger's ranking next to the champion's for the same sessions and compare overlap, coverage and the position of "${r.sig[0]![0]}"-driven items before any user sees them.`,
    rollout: (r) => `Use interleaving for the first fast read and confirm with a full A/B on "${r.on[0]}", watching "${r.on[1] ?? r.on[0]}" as the guardrail.`,
    labels: () => `Clicks are logged under the old policy, so correct for position and exposure bias before comparing models offline, and log propensities from the first day.`,
    retrain: (_r, d) => `Retrain embeddings every ${d} days and refresh the candidate index daily, so new items are retrievable before they have history.`,
    limit: (r) => `Reach for a larger ranker only when the gain survives debiasing; otherwise the fix is exploration and catalogue quality around "${r.edge[0]![0]}".`,
  },
  graph: {
    shadow: (r) => `Build the new graph alongside the live one and diff the merges and clusters, reviewing every large merge and every case of "${r.edge[0]![0]}" by hand.`,
    rollout: (r) => `Roll out by region or cohort with merges reversible for the first weeks, and read "${r.on[0]}" against a holdout that keeps the old matching.`,
    labels: () => `Ground truth comes from investigator and steward decisions, so store every confirm and reject as a labelled pair and keep them out of the evaluation split.`,
    retrain: (_r, d) => `Re-run blocking and the pair model every ${d} days, and rebuild clusters nightly with a cap on how large a cluster may grow in one run.`,
    limit: (r) => `Increase model complexity only when pair errors are not explained by hub values and "${r.edge[0]![0]}", which need caps and rules rather than more parameters.`,
  },
  nlp: {
    shadow: (r) => `Classify live text silently and have reviewers label a stratified sample, including the new vocabulary seen in "${r.edge[0]![0]}".`,
    rollout: (r) => `Release per language or channel with confidence-based routing to people, and read "${r.on[0]}" against the human-only queue.`,
    labels: () => `Annotation guidelines drift, so measure inter-annotator agreement monthly and version the guideline with every labelled batch.`,
    retrain: (_r, d) => `Fine-tune on a ${d}-day cadence using reviewer corrections as new labels, and compare against a frozen test set that never changes.`,
    limit: (r) => `Switch to a larger language model only when the errors are not label noise or guideline gaps around "${r.edge[0]![0]}".`,
  },
  cv: {
    shadow: (r) => `Run inference on live images without acting, and have reviewers check the low-confidence band and every image from a new site or device, starting with "${r.edge[0]![0]}".`,
    rollout: (r) => `Enable one site or device at a time after its validation checklist passes, and compare "${r.on[0]}" with the manual process at that site.`,
    labels: () => `Reviewers' dispositions become labels, so audit a sample for label noise and for shortcuts such as overlays, scanner artefacts or lighting.`,
    retrain: (_r, d) => `Fine-tune every ${d} days on newly reviewed images, and re-validate the operating threshold per site before each release.`,
    limit: (r) => `Grow the backbone only when errors are not explained by image quality or the shift described in "${r.edge[0]![0]}".`,
  },
  bandit: {
    shadow: (r) => `Replay logged traffic through the candidate policy offline and compare estimators, then run it with exploration capped, watching "${r.on[1] ?? r.on[0]}".`,
    rollout: (r) => `Start with a small exploration share and a hard cap on the downside, and widen it only while "${r.on[1] ?? r.on[0]}" stays inside its limit.`,
    labels: () => `Every decision logs its propensity and context, because without them the policy can never be evaluated offline.`,
    retrain: (_r, d) => `Update the policy every ${d} days from the logged data, and re-run off-policy evaluation before each promotion.`,
    limit: (r) => `Add policy complexity only when off-policy estimates have tight intervals; otherwise the fix is more exploration around "${r.edge[0]![0]}".`,
  },
  optimize: {
    shadow: (r) => `Solve each real instance in the background and compare the plan with the human or legacy plan on cost and on "${r.off[0]}", reading the instances where they differ most.`,
    rollout: (r) => `Let the solver propose first and a planner approve, then widen automation by instance type once plans match or beat the human on "${r.on[0]}".`,
    labels: () => `There is no label, only realised cost against promised cost, so log the instance, plan and outcome together to calibrate the predicted inputs.`,
    retrain: (_r, d) => `Refit the cost and demand predictors every ${d} days and re-tune the solver penalties against realised results.`,
    limit: (r) => `Improve the solver only when plan quality is limited by the optimisation and not by input error, or by constraints such as "${r.con[0]}".`,
  },
  'llm-rag': {
    shadow: (r) => `Run answers silently against live questions and grade a sample for citation validity and abstention, starting with cases like "${r.edge[0]![0]}".`,
    rollout: (r) => `Release to one audience first, gate every prompt, index or model change on a frozen golden set, and watch "${r.on[1] ?? r.on[0]}" with cost guardrails.`,
    labels: () => `Thumbs-down and abstentions are the labels, so route each to a weekly review that adds a golden-set case or fixes a source.`,
    retrain: (_r, d) => `Re-index sources continuously, refresh embeddings every ${d} days and re-run the golden set before any model or prompt change ships.`,
    limit: (r) => `Change the model only when retrieval recall is already high; most failures come from stale or missing sources like the ones in "${r.edge[0]![0]}".`,
  },
  'llm-agent': {
    shadow: (r) => `Run the agent in observe-only mode on live tasks and compare its proposed actions with what people did, replaying planted attacks along with "${r.edge[0]![0]}".`,
    rollout: (r) => `Climb the autonomy ladder one task class at a time, with write actions behind approval, and read "${r.on[0]}" against a human-only control.`,
    labels: () => `Approver decisions and overrides are the labels, so store them with the full tool trace as replayable cases.`,
    retrain: (_r, d) => `Re-run the replay set on every prompt, tool or model change and refresh it every ${d} days from reviewed production cases.`,
    limit: (r) => `Add agent capability only when the replay set shows tool or planning failures, not missing permissions or evidence like "${r.edge[0]![0]}".`,
  },
};

const LATENCY_PHRASE: Record<LatencySLA, string> = {
  'sub-10ms': 'in under 10 milliseconds',
  'sub-100ms': 'in under 100 milliseconds',
  seconds: 'interactively, within a few seconds',
  batch: 'as a scheduled batch job',
};
const SHADOW_DAYS: Record<LatencySLA, number> = { 'sub-10ms': 3, 'sub-100ms': 5, seconds: 7, batch: 2 };
const SHADOW_UNIT: Record<LatencySLA, string> = { 'sub-10ms': 'days', 'sub-100ms': 'days', seconds: 'days', batch: 'full batch cycles' };

function bestMatch(stage: Stage, raw: RawUseCase): { text: string; kind: string } | null {
  const target = `${stage.label} ${stage.tech}`;
  const cands: { text: string; kind: string }[] = [
    ...raw.con.map((c) => ({ text: c, kind: 'constraint' })),
    ...raw.sig.map((s) => ({ text: `${s[0]} ${s[1]}`, kind: 'signal' })),
    ...raw.edge.map((e) => ({ text: `${e[0]} ${e[2]}`, kind: 'edge case' })),
    ...raw.gap.map((g) => ({ text: g, kind: 'evaluation trap' })),
  ];
  let best: { text: string; kind: string; n: number } | null = null;
  for (const c of cands) {
    const n = overlap(target, c.text);
    if (n > 0 && (!best || n > best.n)) best = { ...c, n };
  }
  return best;
}

const KIND_ROLE: Record<string, string> = {
  ingest: 'Admits and timestamps events so everything downstream sees one consistent decision time.',
  feature: 'Supplies the point-in-time context the model needs, from state that can be read within budget.',
  retrieve: 'Narrows the world to the few candidates or passages worth scoring, so the expensive step stays affordable.',
  model: 'Turns evidence into a score, label or draft that the rest of the system can act on.',
  rules: 'Holds the policy and limits, so a model score never becomes an action without business rules around it.',
  human: 'Gives a person the final say on uncertain or high-impact cases and turns their decisions into labels.',
  sink: 'Keeps the durable record of inputs, decisions and outcomes that audit, retraining and debugging depend on.',
  other: 'Performs a domain step that the neighbouring stages depend on.',
};

export function buildNarrative(
  raw: RawUseCase,
  domain: Domain,
  paradigms: Paradigm[],
  latency: LatencySLA,
  stages: Stage[],
  scale: ScaleResult,
  loss: { variables: { symbol: string; meaning: string }[] },
): Narrative {
  const sync = stages.filter((s) => !s.async);
  const asyncS = stages.filter((s) => s.async);
  const sn0 = raw.sn[0]!;
  const sn1 = raw.sn[1] ?? raw.sn[0]!;
  const guard = raw.on[1] ?? raw.on[0]!;
  const baseReason = /because (.*)$/i.exec(nodot(raw.base))?.[1];
  const baseCore = nodot(raw.base).replace(/,?\s*because .*$/i, '');
  const prodCore = nodot(raw.prod);

  const problemStatement = {
    situation: `${dot(raw.obj)} The system has to run ${LATENCY_PHRASE[latency]}, inside these limits: ${list(raw.con.slice(0, 3))}.`,
    whyHard: `The obvious approach is ${lc(nodot(sn0[2]!))}, and it fails because ${lc(nodot(sn0[3]!))}. The second trap is in "${sn1[0]}": the real signal is ${lc(nodot(sn1[1]!))}, while teams usually reach for ${lc(nodot(sn1[2]!))}.`,
    scaleAndStakes: `At 10 million users this is about ${fmtN(scale.eventsPerDay)} model-touching events a day, ${fmtN(scale.avgQps)} requests per second on average and ${fmtN(scale.peakQps)} at peak, at an estimated ${usd(scale.monthlyTotalUSD)} a month. A mistake is expensive in the way ${lc(nodot(raw.on[1] ?? raw.on[0]!))} measures it.`,
    successLooksLike: `Offline: ${list(raw.off)}. Online: ${list(raw.on)}. The launch is judged on "${raw.on[0]}" while "${guard}" must not get worse.`,
    risks: [
      ...raw.gap.slice(0, 2).map((g) => `Evaluation trap: ${nodot(g)}.`),
      ...raw.edge.slice(0, 2).map((e) => `${e[0]}: ${lc(nodot(e[1]!))}.`),
    ],
  };

  const topSig = raw.sig.slice(0, 3);
  const loss0 = loss.variables.find((v) => v.symbol !== '\\mathcal{L}' && v.symbol !== 'L');
  const solutionApproach = {
    thesis: `Start with ${lc(baseCore)}${baseReason ? `, because ${lc(baseReason)}` : ''}. Then earn the move to ${lc(prodCore)}, and only if it beats the baseline on ${list(raw.off.slice(0, 2))} after variance.`,
    moves: [
      ...topSig.map((s, i) => ({
        move: i === 0 ? `Build the model around ${s[0]}` : `Add ${s[0]}`,
        detail: `${up(nodot(s[1]!))}. ${up(nodot(s[2]!))}. Guard against: ${lc(nodot(s[3]!))}.`,
      })),
      {
        move: 'Run it as one pipeline',
        detail: `${list(sync.map((s) => `${s.label} (${s.tech})`))}${asyncS.length ? `, with ${list(asyncS.map((s) => s.label))} off the critical path` : ''}.`,
      },
      {
        move: 'Optimise the right thing',
        detail: loss0 ? `The objective weighs ${lc(nodot(loss0.meaning))}, so the model is trained on the cost of the decision and not on a generic score.` : 'Train on the cost of the decision, then calibrate.',
      },
      {
        move: `Handle ${lc(raw.edge[0]![0]!)}`,
        detail: `${up(nodot(raw.edge[0]![2]!))}.`,
      },
    ],
    deliberatelyNot: raw.noise.map((n) => `${n[0]}: ${nodot(n[1]!)}.`),
    proof: `Prove it offline on ${list(raw.off)} using time-ordered splits, then online on "${raw.on[0]}" with "${guard}" as the guardrail. Watch for: ${list(raw.gap.map(nodot))}.`,
  };

  const architectureRationale = stages.map((s) => {
    const m = bestMatch(s, raw);
    let carries: string;
    if (m) carries = `The ${m.kind} that lands here: ${nodot(m.text.replace(/\s+/g, ' '))}.`;
    else if (s.kind === 'model') carries = `It carries the objective: ${nodot(raw.obj)}.`;
    else if (s.kind === 'feature' || s.kind === 'retrieve') carries = `It serves ${list(topSig.map((t) => t[0]!))}.`;
    else if (s.kind === 'rules') carries = `It enforces: ${list(raw.con.slice(0, 2))}.`;
    else if (s.kind === 'human') carries = `It handles ${lc(raw.edge[0]![0]!)}: ${nodot(raw.edge[0]![2]!)}.`;
    else if (s.kind === 'sink') carries = `It keeps the evidence behind "${raw.on[0]}" and the cases behind ${lc(nodot(raw.gap[0] ?? 'the evaluation trap'))}.`;
    else carries = `It supports ${lc(nodot(raw.obj))}.`;
    const budget = s.async ? 'off the critical path' : TOTAL_BUDGET_MS[latency] === null ? 'inside the run window' : `${s.budgetMs} ms of ${TOTAL_BUDGET_MS[latency]} ms`;
    const fail = s.kind === 'model' ? `If it fails or is late, fall back to ${lc(baseCore)}.` : s.kind === 'feature' || s.kind === 'retrieve' ? 'If it fails or is late, score with the last good snapshot and mark the decision as degraded.' : s.kind === 'rules' ? 'If it fails, fail closed on risky actions and open on the safe ones, as the policy states.' : s.kind === 'human' ? 'If the queue backs up, shed lowest-priority items first and page the owner.' : s.async ? 'If it lags, decisions are unaffected; alert on the backlog.' : 'If it fails, shed load with a clear error rather than queue past the deadline.';
    return { stage: s.label, tech: s.tech, role: s.kind === 'other' ? `The ${lc(s.label)} step that the neighbouring stages in this pipeline depend on.` : KIND_ROLE[s.kind]!, carries, budget, onFailure: fail };
  });

  return { problemStatement, solutionApproach, architectureRationale };
}

export function buildE2E(
  raw: RawUseCase,
  domain: Domain,
  pattern: PatternId,
  stages: Stage[],
  scale: ScaleResult,
  features: string[],
  latency: LatencySLA,
  explained: { variables: { symbol: string; meaning: string }[] },
) {
  const sync = stages.filter((s) => !s.async);
  const asyncS = stages.filter((s) => s.async);
  const top3 = raw.sig.slice(0, 3);
  const budget = TOTAL_BUDGET_MS[latency];
  const monthly = usd(scale.monthlyTotalUSD);
  const per1k = usd(scale.costPer1kUSD);
  const north = raw.on[0] ?? 'the north-star metric';
  const guard = raw.on[1] ?? 'the guardrail metric';
  const v = VOICE[pattern];
  const baseCore = nodot(raw.base).replace(/,?\s*because .*$/i, '');
  const prodCore = nodot(raw.prod);
  const heavy = sync.find((s) => s.kind === 'model') ?? sync[sync.length - 1]!;
  const rules = [...stages].reverse().find((s) => s.kind === 'rules');
  const days = SHADOW_DAYS[latency];
  const maturity = /delay|late|matur|chargeback|mature|ultimate|claims?|outcome/i.test(raw.gap.join(' ') + raw.sn.flat().join(' ')) ? '30' : latency === 'batch' ? '7' : '14';
  const lossTerms = explained.variables.filter((x) => x.symbol !== '\\mathcal{L}' && x.symbol !== 'L').slice(0, 2);
  const owners = DOMAIN_OWNER[domain];
  const shadowText = `${days} ${SHADOW_UNIT[latency]}`;

  return [
    {
      phase: 1,
      title: 'Frame the decision and the success contract',
      steps: [
        `Business objective: ${raw.obj}`,
        `Name the actor and the action space — who or what consumes the output, what each wrong answer costs, and the envelope: ${LATENCY_LABEL[latency]}; ${raw.con.slice(0, 2).join('; ')}.`,
        `Write the launch contract before modelling: north-star "${north}", guardrail "${guard}", and the kill criteria that auto-revert the launch.`,
      ],
      deliverable: `Decision spec for ${raw.title}: owner (${owners}), cost matrix, ${LATENCY_LABEL[latency]} SLA, and launch and kill criteria on "${guard}".`,
    },
    {
      phase: 2,
      title: 'Data contracts, labels and point-in-time truth',
      steps: [
        `Inventory the sources that feed ${top3.map((s) => `“${s[0]}”`).join(', ')}; each gets an owner, schema contract and freshness SLO.`,
        `Define the label exactly. ${v.labels(raw)} The first trap to design around: ${raw.gap[0] ?? 'delayed and biased labels'}.`,
        `Build training rows with as-of joins so “${top3[0]![0]}” and “${top3[1]?.[0] ?? top3[0]![0]}” use only what was known at decision time. The leakage to test for: ${lc(nodot(top3[0]![3]!))}.`,
        `${DOMAIN_DATA[domain]}; keep data for the retention period the policy sets and record the lawful basis for each field used by ${raw.title}.`,
      ],
      deliverable: `Versioned dataset snapshot for ${raw.title} with data-quality tests on ${list(top3.map((s) => s[0]!))}.`,
    },
    {
      phase: 3,
      title: 'Engineer signal, delete noise',
      steps: [
        ...top3.map((s) => `${s[0]} — ${s[1]} (${s[2]})`),
        `Leakage review for each feature before it ships; highest-risk here: ${top3[0]?.[3] ?? 'target leakage via post-event fields'}.`,
        `Delete on purpose: ${raw.noise.map((n) => n[0]).join(', ')}. Fewer, stronger features also shrink the feature-store bill.`,
        `Register ${list(features.slice(0, 4).map((f) => `“${f}”`))}${features.length > 4 ? ` and ${features.length - 4} more` : ''} once; the same transform code runs in training and serving, and a skew test on ${features[0]} runs in CI.`,
      ],
      deliverable: `Feature spec for ${raw.title} with owners, as-of semantics, a backfill job and a skew test.`,
    },
    {
      phase: 4,
      title: 'Baseline first, then the production model',
      steps: [
        `Baseline: ${raw.base}`,
        `Production: ${raw.prod}`,
        lossTerms.length
          ? `The objective weighs ${lossTerms.map((t) => lc(nodot(t.meaning))).join(' against ')}; train on that decision cost, then calibrate so the output can be read as a probability or cost for “${north}”.`
          : `Train on the decision cost, then calibrate so the output can be read as a probability or cost for “${north}”.`,
        `Ship ${lc(baseCore)} to shadow first; ${lc(prodCore.split(',')[0]!)} must beat it on ${raw.off[0]} after variance, not on a leaderboard.`,
      ],
      deliverable: `Champion (${lc(baseCore.slice(0, 60))}) and challenger artifacts in the registry with model cards for ${raw.title}.`,
    },
    {
      phase: 5,
      title: 'Offline evaluation that predicts online reality',
      steps: [
        `Primary offline metrics: ${raw.off.join('; ')}.`,
        `Split by time, never at random, because ${lc(nodot(raw.gap[1] ?? raw.gap[0] ?? 'the model is judged on the future it will face'))}.`,
        `Known offline/online gaps to neutralise: ${raw.gap.join('; ')}.`,
        `Slice results by the cases that matter most here — “${raw.edge[0]![0]}” and “${raw.edge[1]?.[0] ?? raw.edge[0]![0]}” — and by cold-start status; a model that wins on average and loses those slices does not ship.`,
      ],
      deliverable: `Evaluation report for ${raw.title} with intervals on ${raw.off[0]}, slice analysis and calibration plots.`,
    },
    {
      phase: 6,
      title: 'Serving architecture and latency budget',
      steps: [
        ...sync.slice(0, 5).map((s) => `${s.id} ${s.label} on ${s.tech} — ${budget === null ? 'inside the run window' : `${s.budgetMs} ms of ${budget} ms`}.`),
        ...(asyncS.length ? [`Off the critical path: ${asyncS.map((s) => `${s.label} (${s.tech})`).join('; ')}.`] : []),
        `Degradation ladder: if ${heavy.label} misses its budget, fall back to ${lc(baseCore)}${rules ? `, and let ${rules.label} decide how much risk the fallback may take` : ''}; prove each rung in a game-day, not in an incident.`,
      ],
      deliverable: `Service design for ${raw.title}, a load test at 1.5× provisioned peak, and a runbook for the ${heavy.label} fallback.`,
    },
    {
      phase: 7,
      title: 'Shadow, canary, ramp',
      steps: [
        `Shadow for ${shadowText}: score live traffic with the challenger and log it beside the champion. ${v.shadow(raw)}`,
        `Canary 1% → 5% → 25% → 100% with automatic rollback on guardrail "${guard}"; read north-star "${north}" against a persistent holdout. ${v.rollout(raw)}`,
        `Kill switch: one command returns ${rules ? `${rules.label} to its rules-only setting` : 'the system to the previous champion'} and ${lc(baseCore)} takes over.`,
      ],
      deliverable: `Launch review for ${raw.title}: measured change in "${north}", status of "${guard}", and sign-off from ${owners}, risk and SRE.`,
    },
    {
      phase: 8,
      title: 'Monitoring, drift and the failure catalogue',
      steps: [
        ...raw.edge.slice(0, 3).map((e) => `${e[0]} → watch for ${e[1].toLowerCase()}; response: ${e[2]}`),
        `Track input drift (PSI or KS) on ${list(features.slice(0, 3).map((f) => `“${f}”`))}, prediction drift and performance on matured labels. ${v.labels(raw)}`,
        `Page on burn rate of "${guard}" and on cost per 1,000 decisions (${per1k}), not on raw error counts.`,
      ],
      deliverable: `Dashboards and alerts for ${raw.title} covering ${raw.edge[0]![0]}, an on-call runbook and a quarterly game-day.`,
    },
    {
      phase: 9,
      title: 'Scale to 10 million users',
      steps: [
        `Load for ${raw.title}: ${fmtN(scale.eventsPerDay)} model-touching events/day → ${fmtN(scale.avgQps)} req/s average, ${fmtN(scale.peakQps)} req/s peak, ${fmtN(scale.provisionedQps)} req/s provisioned.`,
        `Compute for ${heavy.label} (${heavy.tech}): ${scale.nodes.toLocaleString('en-US')} ${scale.nodeUnit} (${scale.nodeCapacity}).`,
        `Data plane (${features.slice(0, 2).map((f) => `“${f}”`).join(' and ')} state, decision log): ${scale.kafkaPartitions} Kafka partitions at ${scale.peakMBps.toFixed(1)} MB/s peak, ${scale.redisShards} feature-store shards, ${scale.rawGBPerDay.toFixed(1)} GB/day raw growth.`,
        `First bottleneck to attack in ${raw.title}: ${bottlenecksFor(scale.computeClass, scale.mode)[0]} The stage most exposed is ${heavy.label}.`,
      ],
      deliverable: `Capacity plan for ${raw.title} with load-test evidence at ${fmtN(scale.provisionedQps)} req/s, an autoscaling policy and a regional failover drill.`,
    },
    {
      phase: 10,
      title: 'Run it: cost, ROI and the iteration loop',
      steps: [
        `Estimated run cost ${monthly}/month → ${per1k} per 1,000 decisions. ${raw.title} pays for itself while the value of one correct decision times the lift on "${north}" exceeds that unit cost.`,
        `${v.retrain(raw, maturity)} Automate promotion only when "${guard}" and every other guardrail are green.`,
        `Ownership: ${owners} owns the business metric, with named owners for data, model and serving; every postmortem adds a case like “${raw.edge[1]?.[0] ?? raw.edge[0]![0]}” to the evaluation set.`,
        `Next upgrade trigger: ${v.limit(raw)}`,
      ],
      deliverable: `Quarterly review for ${raw.title}: lift on "${north}", cost per 1,000 decisions, incidents and the next experiment.`,
    },
  ];
}
