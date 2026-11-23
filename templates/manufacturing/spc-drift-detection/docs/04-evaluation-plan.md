# Statistical Process Control Drift Detection: evaluation plan

> Generated from the blueprint `manufacturing/spc-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Statistical Process Control Drift Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

What has to be proven before launch, how, with what thresholds, and what keeps being measured afterwards.

## Offline metrics

- Average run length to detect a seeded shift
- False alarms per stream per month
- Alarm precision

## Online business metrics

- Time from drift onset to action
- Out-of-spec output
- Operator alarm acknowledgement rate

## Offline-to-online gaps to watch

- One limit for mixed populations
- Alarms with no response plan
- Ignoring gauge error

## Question and estimand

**Question.** Does Statistical Process Control Drift Detection improve "Time from drift onset to action" without worsening "Out-of-spec output", compared with shewhart x-bar and r charts with standard run rules, because they are the quality standard?

**Estimand.** The average causal effect of acting on the system's output on "Time from drift onset to action", per decision (entity and time), over the evaluation window, with "Out-of-spec output" as a non-inferiority guardrail.

## Experiment design

- **Type:** shadow-then-holdout
- **Unit:** Decision (entity and time), with a stable entity-level holdout
- **Why:** Shadow mode shows what the model would have done without acting. A small randomised holdout then provides unbiased outcomes for the cases the old policy would have blocked or passed, which is the only way to measure "Time from drift onset to action" without the policy shaping its own labels.
- **Interference:** Adversaries and customers adapt to the policy. Keep the holdout small and persistent, watch for displacement to other channels, and measure over a window long enough for behaviour to settle.

**Primary metric.** "Time from drift onset to action". Offline model metric "Average run length to detect a seeded shift" is a screening step and not a success criterion.

**Guardrails**

- "Out-of-spec output"
- Latency and error rate within the SLOs in the operations section
- Fairness gap across the slices below no worse than the control

**Offline-online gap.** Known trap: one limit for mixed populations.

## Power and duration

- **alpha:** 0.05 · **power:** 0.8
- **Minimum detectable effect:** Set from the business case before running: the smallest change in "Time from drift onset to action" that pays for the cost of the change. If it cannot be stated, the experiment is not ready.
- **Sample size rule:** Per arm, n ≈ 16·σ²/δ² for a continuous metric, or n ≈ 16·p(1−p)/δ² for a rate p, at α = 0.05 (two-sided) and 80% power, where δ is the minimum detectable effect. Use the baseline variance from your own data, reduce it with pre-experiment covariates (CUPED), and inflate n by the design effect when units are clustered.
- **Duration:** Whole weekly cycles (at least two) and long enough for the label delay below; never stop on the first significant day.

**Your numbers.** Baseline rate: ______ · MDE: ______ · n per arm: ______ · weeks: ______

## Labels

- **Maturity:** Field failures and warranty claims arrive months after the lot ships; scrap labels depend on inspection coverage.
- **Quality:** Estimate label noise with an expert re-label of a random sample; report agreement. Noisy labels cap the achievable metric and bias comparisons between models.
- **Selection bias:** Outcomes are observed mainly for cases the previous policy or a reviewer touched. Reserve a small randomised slice that is observed regardless, log its propensity, and use it to correct training and evaluation.

## Sampling, slices, uncertainty, causal method

- **Sampling:** Evaluate on out-of-time splits, never random splits, for any metric that will be used forward in time. Stratify by the slices below and by period and cohort; keep one untouched final test period for the release decision and do not tune on it.
- **Uncertainty:** Report confidence intervals (bootstrap by cluster) on every headline metric and on each slice, and use calibrated probabilities or conformal sets where a decision depends on how sure the model is.
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Counterfactual replay:** Replay a week of logged traffic through the challenger with the production thresholds and compute the cost-weighted outcome, weighting the exploration slice by its logged propensity.
- **Causal method:** Reject inference and inverse-propensity weighting using the logged exploration slice (When labels exist only for cases the previous policy let through (selective labels))

**Slices to report**

- Line, shift and plant
- Product variant and material lot
- Machine age, tooling and supplier batch
- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance

**Data quality checks**

- Missingness by feature, segment and time: test whether it is missing at random or informative (for example a missing field that only occurs for one channel).
- Representativeness: compare the training population with current production traffic on the main features (population stability) before trusting any metric.
- Duplicates, leakage and look-ahead: confirm every feature is available at decision time and that no label-derived field is in the inputs.

## Stopping rules

- Fix the sample size or the sequential-testing plan (for example alpha spending) before launch; peeking at a fixed-horizon test inflates false positives.
- Stop early for harm: any guardrail breach, including "Out-of-spec output", beyond its pre-agreed bound ends the experiment immediately.
- Stop for futility when the confidence interval excludes the minimum detectable effect; ship only when the interval clears it, not when it merely excludes zero.
- A result that depends on one slice, one day or one outlier is not a result: confirm with a replication or a longer holdout.

## Business value

| Metric | How |
|---|---|
| "Time from drift onset to action" | Incremental effect versus the holdout or control, with an interval, converted to money using the unit economics in the operations section. |
| Net value after cost | Incremental benefit minus the all-in run cost from the capacity model and the human-review cost; report the payback period. |
| Durability | Re-measure the effect at 30 and 90 days; novelty effects and adversary or customer adaptation often decay a first result. |

## Experiment pitfalls

- Declaring success on the offline metric: the improvement does not transfer when the offline set is not the production distribution.
- Measuring a correlation with the score instead of the effect of acting on it.
- Randomising a unit that interferes with its neighbours, then reading the difference as a treatment effect.
- Stopping when the p-value first dips below 0.05.

## Metrics catalogue

### Business and value

*The only layer that says the system is worth running. Everything below is a reason to believe this layer will move, or a warning that it is about to stop.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Time from drift onset to action | outcome | Incremental effect on this outcome per machine or production lot, measured against a persistent holdout or control (shadow-then-holdout), on matured labels. | Improvement over shewhart X-bar and R charts with standard run rules of at least the minimum detectable effect fixed before launch (α = 0.05, power 80%). | Weekly on matured labels, daily on proxies | Plant manager and operations director | Hold promotion; re-check label maturity and the holdout; roll back if the interval excludes the minimum effect. |
| Out-of-spec output | guardrail | The harm the system must not cause while it chases the north star. Non-inferiority test against the control, not a point estimate. | No worse than control beyond the non-inferiority bound agreed up front. | Daily, with a live burn-rate alert | Plant manager and operations director | Automatic halt of the canary and rollback to the previous champion; open an incident if production is affected. |
| Operator alarm acknowledgement rate | outcome | Secondary business measure named in the specification, tracked beside the north star so a gain on one is not paid for on the other. | Reported with an interval; investigate any move that the north star does not explain. | Weekly on matured labels, daily on proxies | Plant manager and operations director | Add to the weekly business review; escalate if it moves against the north star. |
| Net value after all-in cost | outcome | Incremental benefit in money minus the all-in run cost (compute, platform, storage, retraining, observability, transfer, backup and human review). | Positive and above the modelled all-in run cost of $108.01M per month (range $86.41M to $162.01M). | Monthly | Plant manager and operations director | Re-run the business case; narrow scope or retire the feature that costs more than it returns. |
| Durability of the effect | outcome | Effect size re-measured at 30 and 90 days against the launch measurement, to separate novelty and adversary or customer adaptation from real value. | Effect at 90 days still inside the launch interval. | At 30 and 90 days, then quarterly | Plant manager and operations director | Treat a decaying effect as drift: open a challenger and review the feature set. |
| Decision coverage | leading | Share of eligible machine or production lots that receive a model decision rather than a default or a manual path. | Coverage above the level assumed in the business case; falls are investigated as incidents. | Daily | Plant manager and operations director | Check upstream freshness and the degradation ladder; widen coverage only with the guardrail intact. |

### Adoption, trust and experience

*A correct output nobody acts on, or acts on against their judgement, creates no value. These metrics show whether people use, trust and understand the output.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Acted-on rate | leading | Share of outputs that a person or downstream system actually uses to decide or act, as opposed to ignores, re-does or overrides, per machine or production lot. | Rising for the first 90 days after launch, then stable; a sustained fall is the earliest sign of lost trust. | Weekly | Plant manager and operations director | Interview the users who ignore it; check explanation quality and false-alarm rate before touching the model. |
| Override rate and direction | diagnostic | Share of decisions a human or downstream rule reverses, split by direction: too strict (harm to out-of-spec output) versus too lenient (leakage on time from drift onset to action). Each override is logged as a labelled outcome. | Stable inside a band set from the first 30 days; every spike is explained within one working day. | Daily | Manufacturing AI model owner | Sample the overridden cases, feed them to the labelling queue and test whether a threshold or a feature is wrong. |
| Explanation usefulness | diagnostic | Share of users who open the explanation and rate them useful, plus the share of decisions that carry one. | Explanation present on the decisions that need one; usefulness tracked by a sampled panel. | Monthly | Manufacturing AI model owner | Revise the explanation text and the reason-code taxonomy with the people who read them. |
| Contest and complaint rate per 1,000 machine or production lots | guardrail | Appeals, disputes and complaints that cite this system, per 1,000 machine or production lots, with the overturn share and resolution time. | No worse than before launch; overturn share reviewed monthly. | Weekly | Plant manager and operations director | Route to the oversight owner; each overturned case becomes a labelled example in the next training set. |
| Task satisfaction | outcome | Short survey or thumbs signal from the people who depend on this output (Quality and process engineers), reported by segment. | At least the level of the process it replaced, by segment. | Quarterly | Plant manager and operations director | Add the lowest-scoring segment to the next slice review. |

### Model quality

*Offline quality on matured labels and the slices that matter. It is a screening step: a gain here is not a result until the business layer agrees.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Average run length to detect a seeded shift | leading | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat shewhart X-bar and R charts with standard run rules by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| False alarms per stream per month | diagnostic | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat shewhart X-bar and R charts with standard run rules by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| Alarm precision | diagnostic | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat shewhart X-bar and R charts with standard run rules by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| PR-AUC and recall at a fixed false-positive rate | leading | Ranking quality in the operating region, not over all thresholds. ROC-AUC alone hides a useless operating region on rare positives. | Above the baseline at the same false-positive rate, with an interval. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Action mix and threshold stability | diagnostic | Share of decisions per action (for example allow, step up, block) and how it shifts after a model or threshold change. | Action mix moves only by decision; any unexplained shift is investigated before promotion. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Cost-weighted error | leading | Expected cost of false positives and false negatives per 1,000 machine or production lots using the business cost matrix. | Lower than the champion at the production thresholds. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Graph freshness and coverage | diagnostic | Age of the graph snapshot the scores use, and the share of entities present in it. | Snapshot age inside the contract; coverage of active entities near complete. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Worst-slice performance: Line, shift and plant | guardrail | Primary metric on each slice (Line, shift and plant; Product variant and material lot) against the overall result. | Every slice above its floor; a breach is a release blocker. | Every training run and weekly | Data scientist | Do not promote; add slice-aware features or data, or restrict the policy for that slice. |
| Lift over the baseline | diagnostic | Gain of the production model over shewhart X-bar and R charts with standard run rules on the primary offline metric, divided by the extra run cost it brings. | Lift is worth its extra cost: if it falls under the cost of complexity, the baseline wins. | Per release | Manufacturing AI model owner | Fall back to the baseline rung of the degradation ladder and re-open the model choice. |
| Calibration error (ECE) and reliability | guardrail | Gap between predicted and observed rates in equal-mass bins, overall and per slice. Thresholds and costs act on the probability, not the rank. | ECE at or below 0.05 overall (starting threshold). | Weekly on matured labels | Data scientist | Recalibrate (isotonic or Platt) per segment; do not move thresholds on a miscalibrated score. |
| Champion versus challenger gap | diagnostic | Difference between the live model and the best challenger on the same matured window, with an interval. | Challenger inside the champion interval; a clear, repeated lead triggers promotion review. | Weekly | Manufacturing AI model owner | Start the promotion gates in the MLOps section for the challenger. |

### Data and features

*Most production incidents begin as a data change. These metrics catch stale, missing, skewed or leaking inputs before the model does anything wrong with them.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Freshness and leakage guard: CUSUM statistic | guardrail | Event-to-feature delay and null rate for this input (CDC or event stream (Kafka) with 60 seconds freshness at p95). Automated point-in-time test that fails when: reset after corrective action. | Delay inside the contract stated above; zero point-in-time violations in the training set. | Continuous, alert on a missed window | Plant operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Freshness and leakage guard: EWMA residual | guardrail | Event-to-feature delay and null rate for this input (API lookup with a cached snapshot and a stale-with-flag fallback). Automated point-in-time test that fails when: tune the weight per process. | Freshness inside the data contract; zero point-in-time violations in the training set. | Continuous, alert on a missed window | Plant operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Freshness and leakage guard: Run-rule violations | guardrail | Event-to-feature delay and null rate for this input (CDC or event stream (Kafka) with 60 seconds freshness at p95). Automated point-in-time test that fails when: combine with the model score. | Delay inside the contract stated above; zero point-in-time violations in the training set. | Continuous, alert on a missed window | Plant operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Training-serving skew | diagnostic | Distribution distance (PSI or KS) between each served feature (starting with CUSUM statistic, EWMA residual, Run-rule violations) and the same feature in the training snapshot, plus a row-level parity check on a sampled request replay. | PSI under 0.1 per feature; investigate between 0.1 and 0.2; act above 0.2 (starting thresholds). Replay parity above 99.9%. | Hourly | Plant operations | Find the feature whose online and offline code paths differ; ship one implementation to both. |
| Population drift | leading | Input distribution on production traffic versus the training window, plus prediction-score drift. field failures and warranty claims that appear months after shipment, and quality escapes found at the customer | No sustained drift above 0.2 PSI on a top feature without a matching quality drop being ruled out. | Daily | Data scientist | Open an investigation; retrain only on a confirmed matured-label drop (see MLOps triggers). |
| Label maturity and delay | diagnostic | Share of training rows whose label has matured, and the label delay at p50 and p90, per source. Rows whose labels are still arriving are censored, not negatives. | Training and evaluation use only matured windows; delay tracked against the horizon in the experimentation section. | Weekly | Plant operations | Shorten the window or add a survival-aware label model; never train on unmatured negatives. |
| Contract violations and quarantine | guardrail | Records rejected or quarantined by the schema, range and uniqueness checks of the data contract, with the duplicate and late-event shares. | Duplicates below 0.01% and completeness at or above 99.9% on required fields, as in the contract example. | Continuous | Plant operations | Notify the producer; apply the on_breach action in the contract (quarantine and serve stale). |
| Banned-feature check | guardrail | Automated test that none of the features the specification calls noise (Operator name; Measurement timestamp precision; Product colour) or any prohibited attribute enters the feature set. | Zero occurrences in the training set, feature store and serving path. | Every build | Plant operations | Fail the pipeline; remove the feature and retrain. |

### System and reliability

*Whether the service answers inside its deadline, stays up, and degrades on purpose instead of by accident. Numbers come from the stage budgets and SLOs in this blueprint.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| End-to-end latency | guardrail | Server-side latency from request to decision, per region, as a histogram. | p50 ≤ 875 ms, p95 ≤ 1750 ms, p99 ≤ 2500 ms | Continuous | SRE | Page on burn rate; follow the degradation ladder before adding capacity. |
| Stage latency: Measurement ingestion | leading | p99 latency of Measurement ingestion (historian), as a histogram from the stage's own span. | p99 at or below 144 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Stage latency: Stream segmentation by tool and product | leading | p99 latency of Stream segmentation by tool and product (stream processor), as a histogram from the stage's own span. | p99 at or below 574 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Stage latency: Drift detectors | leading | p99 latency of Drift detectors (CUSUM EWMA change-point), as a histogram from the stage's own span. | p99 at or below 574 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Stage latency: Alarm scoring | leading | p99 latency of Alarm scoring (gradient boosting), as a histogram from the stage's own span. | p99 at or below 574 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Stage latency: Response plan lookup | leading | p99 latency of Response plan lookup (quality system), as a histogram from the stage's own span. | p99 at or below 215 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Stage latency: Operator acknowledgement | leading | p99 latency of Operator acknowledgement (HMI), as a histogram from the stage's own span. | p99 at or below 144 ms (its slice of the budget in the HLD). | Continuous, burn-rate alert | ML platform | Shed optional work first; tune this stage before widening the end-to-end budget. |
| Share of valid requests answered inside the deadline | guardrail | Successful, deadline-respecting responses over valid requests. | 99.95% over 30 days; error budget 21.6 minutes of unavailability per 30 days. | Continuous | SRE | Freeze risky releases when the budget burns faster than the multi-window alert. |
| Decisions served from a degraded path | guardrail | Share of decisions made below the full model path (fallback, stale features, baseline rung). | ≤ 1% of decisions below degradation level 1 | Continuous | ML platform | Treat a sustained rise as an incident in the dependency that triggered the fallback. |
| Saturation: 8-vCPU pods | leading | 8-vCPU pods utilisation, queue depth and queue wait against the remaining deadline. | Planned peak utilisation 93.8% on 8 8-vCPU pods for 18,750 req/s; queue wait under 30% of the deadline. | Continuous | SRE | Autoscale on queue depth; shed background and retry traffic first. |
| Dependency health | diagnostic | Error, timeout and retry rate per dependency (Stream segmentation by tool and product), with breaker state. | Breaker closed; retries under 5% of calls (starting threshold). | Continuous | ML platform | Open the breaker, use cached or default values with a flag and page the owner. |
| Event-bus consumer lag | diagnostic | Lag of the decision-log and label consumers, which feed audit and retraining. | Lag inside the freshness target of the downstream feature and label jobs. | Continuous | Plant operations | Scale consumers or partitions; replay from the log once healthy. |
| Detect, acknowledge, recover (SEV1) | guardrail | Time to detect, to acknowledge and to restore service for the highest severity, from the incident record. | Acknowledge in 15 minutes; recovery inside RTO 5 minutes (region evacuation), under 60 seconds for request routing. | Per incident and quarterly game day | SRE | Run the blameless review; add the missing alert or runbook step. |
| Exception queue size and age | guardrail | Items waiting in Limit review for a person, with the age of the oldest. | Oldest item younger than the review SLA in the Human review layer. | Continuous | Manufacturing AI model owner | Add reviewers or route low-risk items to a faster tier. |

### Cost and sustainability

*A system that works but costs more than the value it creates is a failed system. Tracks unit cost against the capacity model, and the energy it burns.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Cost per 1,000 decisions | guardrail | Monthly run cost divided by monthly decisions, from billing tags. | ≤ $0.0015; 20% over the modelled cost before FinOps review. | Monthly | FinOps | Review the largest cost line first; right-size before changing the model. |
| Cost per decision | outcome | All-in monthly cost divided by business outcomes (decisions), including retraining, observability, transfer, backup and human review. | $0.020 modelled at the published workload; alert above 120% of it. | Monthly | FinOps | Compare against value per outcome; if the margin is gone, cut tiers or scope. |
| Compute utilisation and idle spend | diagnostic | Used versus provisioned 8-vCPU pods over the month, and spend on capacity that served nothing. | Measured use of the 8 provisioned 8-vCPU pods stays near the modelled 93.8%; pools running under half of the modelled figure are flagged for right-sizing. | Weekly | FinOps | Right-size pools; schedule batch work into off-peak windows. |
| Retraining and evaluation spend | diagnostic | Compute and labelling cost per retraining cycle and per evaluation run, per month. | Inside the modelled share of the all-in cost; a cycle that cannot beat the champion is stopped early. | Per cycle | FinOps | Cut the schedule to the drift and label-maturity triggers; cache features between runs. |
| Energy and carbon per 1,000 decisions | diagnostic | Estimated kWh and gCO2e per 1,000 decisions from node-hours, utilisation and the region's grid intensity. | Tracked and falling or flat as traffic grows; reported with the cost figure. | Monthly | FinOps | Prefer lower-carbon regions for batch work, smaller models for easy cases and higher utilisation. |
| Human review cost share | diagnostic | Reviewer hours times loaded rate as a share of the all-in cost, and cost per reviewed item. | Falling as precision of the queue improves; share inside the modelled review rate. | Monthly | FinOps | Raise the auto-decision band only with the guardrail intact. |
| Token spend share | diagnostic | Provider or GPU cost of input and output tokens as a share of the all-in cost, per model tier. | Inside budget per request; cached and small-model shares tracked. | Weekly | FinOps | Add caching, shorten context, route easy requests to the small tier. |

### Responsible AI

*Fairness, explainability and human control, measured rather than asserted, at the strictness the risk tier requires.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Fairness gap across slices | guardrail | Difference in the primary error rate and in selection rate between slices (Line, shift and plant; Product variant and material lot), with intervals. | Gap no worse than the control, with the tolerance written down. | Every release and monthly | Responsible AI lead | Release blocker; investigate features that proxy a protected class and re-run the slice report. |
| Explanation coverage and fidelity | guardrail | Share of decisions returned with reason codes or citations, and agreement of the stated reason with an independent attribution on a sample. | Coverage on the decisions that need an explanation. | Monthly sample | Manufacturing AI model owner | Fix the reason-code mapping; stop returning codes that cannot be reproduced from the ledger. |
| Human oversight in practice | guardrail | Time to halt the system from the stop control, share of required reviews that happened inside their time limit, and override handling. | Stop drill succeeds inside the incident target; no required review skipped. | Quarterly drill | Risk owner | Treat a failed drill as a SEV2; fix authority, tooling or paging. |
| Appeal overturn rate and time to resolve | diagnostic | Share of contested decisions overturned, and median days to a final answer. | Resolution inside the policy window; overturn reasons reviewed for patterns. | Monthly | Risk owner | Add overturned patterns to the golden set and the slice report. |
| Model documentation currency | diagnostic | Share of production versions whose model card, intended-use statement and limitations are current and approved. | 100% of production versions; approval trail attached. | Per release | Manufacturing AI model owner | Block the release until the card is current. |

### Security, privacy and compliance

*Abuse, leakage and obligations, with the evidence an auditor would ask for tracked as a number with an owner and a cadence.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Abuse and probing: Adversarial inputs that evade the model | guardrail | Callers or sessions flagged for the behaviour behind this threat, and the share blocked or throttled. Control in place: rate-limit and monitor probing, randomise thresholds near the boundary and keep rules and a challenger as a s…. | Flagged sessions triaged inside a working day; no successful evasion in the red-team replay. | Continuous | Security | Throttle or block the caller, rotate thresholds near the boundary and add the pattern to the red-team set. |
| Sensitive data in logs, caches and features | guardrail | Count of unredacted sensitive fields (confidential: process recipes, yields and product designs (trade secr…) found by scanning sampled logs, traces, caches and training snapshots. | Zero unredacted sensitive fields in any sampled log, trace, cache or snapshot. | Weekly scan | Security | Purge, fix the redaction rule, and review who could read it. |
| Artifact provenance | guardrail | Share of production models, datasets and containers that are signed, scanned and present in the ML bill of materials. | 100% of production artifacts signed, scanned and listed in the bill of materials. | Per release | Security | Block deployment; investigate any unsigned artifact as a supply-chain event. |
| Deletion and retention propagation | guardrail | Time from a deletion request or retention expiry to removal from features, embeddings, caches and training snapshots. | Inside the statutory or contractual window for this domain. | Monthly sample | Privacy officer | Fix the lineage gap that kept the data; re-run the deletion. |
| Decision-ledger completeness and replay | guardrail | Share of decisions with a complete ledger entry (inputs hash, model version, policy version, output), and the share of a sampled set that replays to the same output. | 100% complete; sampled replay reproduces the output. | Daily and monthly sample | Manufacturing AI model owner | Stop promotion until the ledger path is fixed; an incomplete ledger is an audit finding. |
| Evidence freshness: Machine and functional safety (ISO 13849, IEC 61508, OSHA) | diagnostic | Age of the evidence for this obligation: safety case and interlock test record. | Evidence refreshed per release. | Per release | EHS and controls engineering | Escalate to the control owner before the evidence goes stale; record the exception. |
| Evidence freshness: Quality management and traceability (ISO 9001, IATF 16949, GxP where… | diagnostic | Age of the evidence for this obligation: lot genealogy with model decision record. | Evidence refreshed per lot and quarterly review. | Per lot and quarterly review | Quality assurance | Escalate to the control owner before the evidence goes stale; record the exception. |
| Evidence freshness: Worker data and works-council agreements | diagnostic | Age of the evidence for this obligation: data-use register and works-council sign-off. | Evidence refreshed annual. | Annual | HR and legal | Escalate to the control owner before the evidence goes stale; record the exception. |

### MLOps and delivery

*How safely and quickly the model changes: retraining freshness, promotion gates, rollback and reproducibility.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Model age against its label horizon | leading | Days since the champion was trained on a fully matured window. Retraining trigger: quality on matured labels falls below the guardrail (Time from drift onset to action) for two consecutive windows. | Younger than the scheduled refresh; never older than the label horizon. | Daily | MLOps engineer | Start the retraining pipeline; if it fails, keep the champion and freeze promotion. |
| Retraining pipeline reliability | guardrail | Success rate and duration of scheduled training runs, and the time from trigger to a registered candidate. | Two consecutive failures page the owner; duration inside the retraining window. | Per run | MLOps engineer | Re-run from the last good dataset snapshot; add a contract or resource test for the failing step. |
| Promotion gate pass rate and shadow disagreement | diagnostic | Share of candidates that pass all release gates, and the disagreement rate between challenger and champion in shadow. | Gates unchanged by hand; shadow disagreement explained before canary. | Per candidate | MLOps engineer | Hold the candidate; add the disagreeing cases to the golden set. |
| Time to roll back | guardrail | Time from a decision to roll back to traffic fully on the previous version. One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback…. | Rehearsed every quarter and inside the incident acknowledgement target. | Quarterly rehearsal | MLOps engineer | Fix the slowest step; a rollback that has never been rehearsed is assumed broken. |
| Change failure rate and lead time | diagnostic | Share of model or pipeline changes that cause a rollback or incident, and time from merge to production. | Change failure rate falling; lead time short enough that fixes are not batched. | Monthly | MLOps engineer | Reduce batch size of changes; strengthen the gate that missed it. |
| Reproducibility | guardrail | Share of registry versions that can be rebuilt from recorded code, data snapshot and config with metrics inside tolerance. | 100% of production versions. | Per release and quarterly sample | MLOps engineer | Freeze the version until its inputs are recorded. |
| Regression test for the offline-online trap | guardrail | A test in the regression suite for the known trap: one limit for mixed populations. | Passing on every candidate; the trap is checked, not assumed away. | Every candidate | Data scientist | Fail the candidate and fix the split, label or feature that causes the gap. |

### Experimentation health

*Whether the experiments that justify the system can be trusted: assignment, power, and agreement between offline and online results.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Sample ratio mismatch | guardrail | Chi-square test of actual versus intended arm sizes for every experiment. | p-value above 0.001; a smaller value invalidates the readout (standard practice). | Per experiment, daily | Experimentation lead | Stop the readout; find the assignment, logging or filtering bug before analysing. |
| Realised power and minimum detectable effect | diagnostic | Power achieved at the observed variance against the minimum effect that pays for the change. Design: shadow-then-holdout. | Power at least 80% at the planned minimum effect; duration covers whole weekly cycles and the label delay. | Per experiment | Experimentation lead | Extend the test or reduce variance (CUPED); do not read an underpowered test. |
| Offline-online agreement | leading | Share of past launches where the sign and rough size of the offline gain on "Average run length to detect a seeded shift" matched the online effect on "Time from drift onset to action". | Agreement tracked across launches; a falling rate means the offline set no longer represents production. | Per launch | Data scientist | Rebuild the offline evaluation set from recent production and re-check the known trap. |
| Holdout health | diagnostic | Size, stability and contamination of the persistent holdout, and the share of the randomised slice that is observed. | Holdout never receives the new policy; exploration slice logged with its propensity. | Monthly | Experimentation lead | Refresh the holdout and re-estimate propensities. |

### LLM serving and generation

*Language-model behaviour that conventional model metrics do not see: token economics, first-token latency, format validity, safety and provider drift.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Time to first token and inter-token latency | leading | Time from request to first streamed token, and mean gap between tokens, per model tier and region. | First token inside the stage budget for Stream segmentation by tool and product; inter-token gap under what a reader perceives as stalling. | Continuous | Inference engineer | Route to the smaller tier, lower the context length or add capacity. |
| Tokens per request and cost per request | guardrail | Input and output tokens per request and per step, and the resulting cost, per model tier. | Inside the per-step token budget in the capacity model; alert at 1.5× | Continuous | FinOps | Trim context, cache prefixes, cap output and route easy requests to the small tier. |
| Structured-output validity | guardrail | Share of responses that parse and validate against the required schema on the first attempt, and the retry rate. | At least 99% valid on first attempt; retries bounded (starting threshold). | Continuous | AI engineer | Use constrained decoding or a schema repair step; add the failures to the eval set. |
| Hallucination and unsupported-claim rate | guardrail | Share of sampled responses containing a claim not supported by the provided context or tool results, judge-scored and human-checked. | Below the champion on the golden set. | Weekly sample | AI engineer | Tighten grounding, require citations, or restrict the answer scope. |
| Prompt-injection and jailbreak resistance | guardrail | Attack success rate on a planted-instruction and jailbreak test set, and blocked attempts in production. | Zero successful attacks on the replay set; production attempts reviewed. | Every prompt, model or tool change; continuous | Security | Block the release; strengthen input isolation, the policy layer and output filters. |
| Safety, toxicity and PII in output | guardrail | Share of outputs flagged by the safety classifier or PII detector, and the false-block rate. | Flag rate stable; PII in output at zero after filtering. | Continuous | Security | Tune filters, review false blocks with the product owner. |
| Refusal and over-refusal rate | diagnostic | Share of requests the model refuses, split into correct refusals and refusals of legitimate requests. | Over-refusal under the level that hurts task success. | Weekly | AI engineer | Adjust the policy prompt and examples. |
| Provider drift and failover | guardrail | Change in golden-set scores after a provider model update, provider error rate, and failover success to the secondary. | No regression beyond tolerance after a provider change; failover tested in a game day. | On provider change; quarterly | AI platform on-call | Pin the model version; fail over and re-evaluate the secondary. |
| Judge calibration | diagnostic | Agreement between the LLM judge and human graders on a rolling sample. | Cohen’s κ at least 0.7 (starting threshold). | Monthly | AI engineer | Retrain or replace the judge; do not trust automated scores until restored. |

### Agents

*An agent is a loop with tools, so the unit of measure is the trajectory: did it finish, with valid evidence, inside its step, cost and permission budgets.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Task success rate | outcome | Share of resolution reviewer, ring investigator, graph quality sentinel tasks that finish with the correct disposition, on a frozen replay set and on audited production cases. | Targets for each autonomy level are in the Agentic section; promotion to the next level requires meeting them. | Per change; weekly sample | AI engineer | Hold the autonomy level; replay the failing trajectories. |
| Evidence validity | guardrail | Share of cited claims that point at a real record that supports them, checked against the record store. | At least 99%. | Weekly | AI engineer | Drop uncited claims from the output; fix the retrieval or tool that supplied the wrong record. |
| Tool-call accuracy and error rate | leading | Share of tool calls (read_stream_segmentation_by_tool, read_drift_detectors, read_alarm_scoring) with valid arguments, correct tool choice and a successful result, per tool. | Invalid-argument calls near zero; per-tool error rate inside the tool owner SLO. | Continuous | AI engineer | Tighten the tool schema and descriptions; add a validation layer before the call. |
| Steps, loops and retries per task | diagnostic | Median and p95 steps per task against the cap of 3, repeated identical calls, and retry rate. | p95 steps under the cap of 3; loop detections near zero. | Continuous | AI engineer | Add a loop breaker and a better stopping rule; review the planner prompt. |
| Escalation precision and recall | guardrail | Share of escalations that needed a person (precision), and share of cases needing a person that were escalated (recall), including cases with missing evidence. | No case with missing evidence decided anyway; precision above 80% so people are not flooded. | Weekly | AI engineer | Adjust the confidence threshold and the escalation rules. |
| Write-action safety: request_limit_review, write_case_note | guardrail | Write actions outside policy, actions that needed approval and did not get it, and compensating actions needed. | Exactly zero outside policy; every write has an approval or an idempotent reversal. | Continuous | AI platform on-call | Revoke the tool scope and drop the agent to read-only (L0). |
| Autonomy level and gate status | diagnostic | Current level per agent (Resolution reviewer: L1; Ring investigator: L1; Graph quality sentinel: L0), and whether the promotion gate evidence is current. | No agent above the level its latest evidence supports; demotion on any gate breach. | Weekly | Risk owner | Demote the agent one level and re-run the gate evidence. |
| Cost and time per task | guardrail | Tokens, tool calls and wall-clock time per completed task, and cost per resolved case. | Cheaper or faster than the human-only path for the same quality; budget cap enforced per task. | Daily | FinOps | Lower the step budget; cache tool results; use a smaller model for the easy steps. |
| Handoff success between agents | diagnostic | Share of handoffs (Resolution reviewer, Ring investigator, Graph quality sentinel) that carry the context the next agent needs, measured by task failures traced to lost context. | Near zero handoff-caused failures. | Weekly | AI engineer | Make the handoff payload a typed contract and validate it. |
| Trajectory regression | guardrail | Pass rate on stored trajectories (including tool outages and planted instructions) after any model, prompt or tool change. | 100% of safety trajectories; no drop on task trajectories beyond tolerance. | Every change | AI engineer | Block the release and add the new failure to the replay set. |

### Human review

*The review queue is part of the system. Its backlog, agreement and overturn rates decide the real accuracy, latency and label quality.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Review queue backlog and age | guardrail | Items waiting in Limit review (quarterly), age of the oldest and age at p95. | p95 age inside the review SLA; backlog does not grow for three days running. | Continuous | Manufacturing AI model owner | Add reviewers or tighten the routing band so only the ambiguous cases arrive. |
| Queue precision (hit rate) | leading | Share of reviewed items that were true positives or needed action. | Rising as the model improves; a fall means the queue is being fed noise. | Daily | Manufacturing AI model owner | Re-tune the routing thresholds; examine the new false-positive pattern. |
| Reviewer agreement | diagnostic | Cohen’s κ between reviewers on the same items, and between reviewers and the audit panel. | κ of at least 0.7 (starting threshold); disagreements adjudicated. | Monthly | Manufacturing AI model owner | Clarify the guideline and retrain reviewers; noisy labels cap model quality. |
| Model overturn rate | diagnostic | Share of model suggestions the reviewer changes, split by direction and by reviewer. | Stable band; reviewer-level outliers explained. | Weekly | Manufacturing AI model owner | Check for automation bias (too few overturns) or a model fault (too many). |
| Random audit coverage | guardrail | Share of auto-decided items sampled at random for human audit, and the error rate found. | A fixed sampling rate maintained; error rate in the audit sample inside the guardrail. | Weekly | Manufacturing AI model owner | Raise sampling; this slice is also the unbiased label source for training. |
| Label feedback latency | diagnostic | Time from a reviewer decision to the labelled outcome being available for training. | Inside the daily label job; no decision without a label record. | Daily | Plant operations | Fix the label-store path; unlabelled decisions cannot be learned from. |
| Handle time and throughput | diagnostic | Median time per item and items per reviewer-hour, with quality score on golden items. | Throughput up only while golden-item accuracy holds. | Weekly | Manufacturing AI model owner | Improve the case view before pushing throughput. |

## Metrics that can be gamed

| Metric | Risk | Counter |
|---|---|---|
| Time from drift onset to action | Moves when the measured population or the label window changes, not only when the system improves; novelty and adaptation inflate early readings. | Out-of-spec output, read at 90 days against the holdout |
| Average run length to detect a seeded shift | Optimising it breaks on a known trap: one limit for mixed populations. | Time from drift onset to action on the holdout; the offline-online agreement rate |
| Straight-through (auto-decision) rate | Raised by widening the auto-decision band, which hides errors that nobody reviews. | Random audit error rate and the guardrail |
| End-to-end latency | Met by dropping or defaulting the hardest requests, so the percentile looks good while quality falls. | Degraded-path share and the primary metric on the fallback path |
| Any single offline score | A second known trap: alarms with no response plan. | The matured-label metric by slice and the champion-challenger gap |

## Release gate record

| Gate | Threshold | Measured | Interval | Pass | Date | Approver |
|---|---|---|---|---|---|---|
| Offline primary | | | | | | |
| Calibration | | | | | | |
| Slice parity | | | | | | |
| Shadow agreement | | | | | | |
| Guardrails | | | | | | |
