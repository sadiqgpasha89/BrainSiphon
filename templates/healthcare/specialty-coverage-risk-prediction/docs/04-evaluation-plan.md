# Specialty Coverage Risk Prediction: evaluation plan

> Generated from the blueprint `healthcare/specialty-coverage-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Specialty Coverage Risk Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

What has to be proven before launch, how, with what thresholds, and what keeps being measured afterwards.

## Offline metrics

- PR-AUC and precision at the review capacity
- Lead time of correct gap warnings
- Calibration of gap probabilities

## Online business metrics

- Gaps avoided or mitigated
- Locum and overtime spend
- Hours of uncovered service

## Offline-to-online gaps to watch

- Predicting shortfalls that rules show
- Random splits
- Contacting physicians from a score

## Question and estimand

**Question.** Does Specialty Coverage Risk Prediction improve "Gaps avoided or mitigated" without worsening "Locum and overtime spend", compared with coverage gaps are discovered by the scheduling office as they appear?

**Estimand.** The average causal effect of acting on the system's output on "Gaps avoided or mitigated", per entity (customer, over the evaluation window, with "Locum and overtime spend" as a non-inferiority guardrail.

## Experiment design

- **Type:** shadow-then-holdout
- **Unit:** Entity (customer, account, asset), with a stable holdout across runs
- **Why:** A challenger scores in shadow beside the champion for several runs; a persistent holdout of entities that never receive the new action then measures incremental effect instead of correlation with the score.
- **Interference:** Actions on one entity can affect its neighbours (households, networks, shared capacity). Randomise at the cluster level where that is true.

**Primary metric.** "Gaps avoided or mitigated". Offline model metric "PR-AUC and precision at the review capacity" is a screening step and not a success criterion.

**Guardrails**

- "Locum and overtime spend"
- Latency and error rate within the SLOs in the operations section
- Fairness gap across the slices below no worse than the control

**Offline-online gap.** Known trap: predicting shortfalls that rules show.

## Power and duration

- **alpha:** 0.05 · **power:** 0.8
- **Minimum detectable effect:** Set from the business case before running: the smallest change in "Gaps avoided or mitigated" that pays for the cost of the change. If it cannot be stated, the experiment is not ready.
- **Sample size rule:** Per arm, n ≈ 16·σ²/δ² for a continuous metric, or n ≈ 16·p(1−p)/δ² for a rate p, at α = 0.05 (two-sided) and 80% power, where δ is the minimum detectable effect. Use the baseline variance from your own data, reduce it with pre-experiment covariates (CUPED), and inflate n by the design effect when units are clustered.
- **Duration:** Whole weekly cycles (at least two) and long enough for the label delay below; never stop on the first significant day.

**Your numbers.** Baseline rate: ______ · MDE: ______ · n per arm: ______ · weeks: ______

## Labels

- **Maturity:** Clinical outcomes lag the prediction by hours to months, and treatment given in response contaminates the label.
- **Quality:** Estimate label noise with an expert re-label of a random sample; report agreement. Noisy labels cap the achievable metric and bias comparisons between models.
- **Selection bias:** Check whether outcomes are observed for every unit or only for those that were acted on or reached; if only some, treat it as selection bias and weight or model it explicitly.

## Sampling, slices, uncertainty, causal method

- **Sampling:** Evaluate on out-of-time splits, never random splits, for any metric that will be used forward in time. Stratify by the slices below and by period and cohort; keep one untouched final test period for the release decision and do not tune on it.
- **Uncertainty:** Report confidence intervals (bootstrap by cluster) on every headline metric and on each slice, and use calibrated probabilities or conformal sets where a decision depends on how sure the model is.
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Counterfactual replay:** Re-score historical runs with the challenger and compare the cohort it would have selected against what the champion selected, using outcomes observed after both.
- **Causal method:** Randomised holdout with uplift modelling, or difference-in-differences when the action cannot be withheld (When the score is used to choose who to treat, since predicting risk is not the same as predicting benefit from action)

**Slices to report**

- Age, sex, ethnicity and language
- Site and device (case mix, equipment differences)
- Comorbidity and acuity bands, including the sickest decile
- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance

**Data quality checks**

- Missingness by feature, segment and time: test whether it is missing at random or informative (for example a missing field that only occurs for one channel).
- Representativeness: compare the training population with current production traffic on the main features (population stability) before trusting any metric.
- Duplicates, leakage and look-ahead: confirm every feature is available at decision time and that no label-derived field is in the inputs.

## Stopping rules

- Fix the sample size or the sequential-testing plan (for example alpha spending) before launch; peeking at a fixed-horizon test inflates false positives.
- Stop early for harm: any guardrail breach, including "Locum and overtime spend", beyond its pre-agreed bound ends the experiment immediately.
- Stop for futility when the confidence interval excludes the minimum detectable effect; ship only when the interval clears it, not when it merely excludes zero.
- A result that depends on one slice, one day or one outlier is not a result: confirm with a replication or a longer holdout.

## Business value

| Metric | How |
|---|---|
| "Gaps avoided or mitigated" | Incremental effect versus the holdout or control, with an interval, converted to money using the unit economics in the operations section. |
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
| Gaps avoided or mitigated | outcome | Incremental effect on this outcome per patient encounter, measured against a persistent holdout or control (shadow-then-holdout), on matured labels. | Improvement over coverage gaps are discovered by the scheduling office as they appear of at least the minimum detectable effect fixed before launch (α = 0.05, power 80%). | Per run | Chief Medical Information Officer and clinical lead | Hold promotion; re-check label maturity and the holdout; roll back if the interval excludes the minimum effect. |
| Locum and overtime spend | guardrail | The harm the system must not cause while it chases the north star. Non-inferiority test against the control, not a point estimate. | No worse than control beyond the non-inferiority bound agreed up front. | Per run | Chief Medical Information Officer and clinical lead | Automatic halt of the canary and rollback to the previous champion; open an incident if production is affected. |
| Hours of uncovered service | outcome | Secondary business measure named in the specification, tracked beside the north star so a gain on one is not paid for on the other. | Reported with an interval; investigate any move that the north star does not explain. | Per run | Chief Medical Information Officer and clinical lead | Add to the weekly business review; escalate if it moves against the north star. |
| Net value after all-in cost | outcome | Incremental benefit in money minus the all-in run cost (compute, platform, storage, retraining, observability, transfer, backup and human review). | Positive and above the modelled all-in run cost of $1.6K per month (range $1.6K to $1.7K). | Monthly | Chief Medical Information Officer and clinical lead | Re-run the business case; narrow scope or retire the feature that costs more than it returns. |
| Durability of the effect | outcome | Effect size re-measured at 30 and 90 days against the launch measurement, to separate novelty and adversary or customer adaptation from real value. | Effect at 90 days still inside the launch interval. | At 30 and 90 days, then quarterly | Chief Medical Information Officer and clinical lead | Treat a decaying effect as drift: open a challenger and review the feature set. |
| Decision-ready lead time | leading | Time from the data cut-off to a published output that downstream teams can use, per run. | Inside the run window in the capacity model, with output published before the consumer's cut-off. | Per run | Chief Medical Information Officer and clinical lead | Check upstream freshness and the degradation ladder; widen coverage only with the guardrail intact. |

### Adoption, trust and experience

*A correct output nobody acts on, or acts on against their judgement, creates no value. These metrics show whether people use, trust and understand the output.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Acted-on rate | leading | Share of outputs that a person or downstream system actually uses to decide or act, as opposed to ignores, re-does or overrides, per patient encounter. | Rising for the first 90 days after launch, then stable; a sustained fall is the earliest sign of lost trust. | Weekly | Chief Medical Information Officer and clinical lead | Interview the users who ignore it; check explanation quality and false-alarm rate before touching the model. |
| Override rate and direction | diagnostic | Share of decisions a human or downstream rule reverses, split by direction: too strict (harm to locum and overtime spend) versus too lenient (leakage on gaps avoided or mitigated). Each override is logged as a labelled outcome. | Stable inside a band set from the first 30 days; every spike is explained within one working day. | Daily | Clinical Informatics model owner | Sample the overridden cases, feed them to the labelling queue and test whether a threshold or a feature is wrong. |
| Explanation usefulness | diagnostic | Share of users who open the reason codes and rate them useful, plus the share of decisions that carry one. | 100% of adverse or high-impact decisions carry an explanation; usefulness rated by a sampled panel. | Monthly | Clinical Informatics model owner | Revise the explanation text and the reason-code taxonomy with the people who read them. |
| Contest and complaint rate per 1,000 patient encounters | guardrail | Appeals, disputes and complaints that cite this system, per 1,000 patient encounters, with the overturn share and resolution time. | No worse than before launch; overturn share reviewed monthly. | Weekly | Chief Medical Information Officer and clinical lead | Route to the oversight owner; each overturned case becomes a labelled example in the next training set. |
| Consumer satisfaction | outcome | Short survey or thumbs signal from the people who depend on this output (Nurses and physicians at the point of care), reported by segment. | At least the level of the process it replaced, by segment. | Quarterly | Chief Medical Information Officer and clinical lead | Add the lowest-scoring segment to the next slice review. |

### Model quality

*Offline quality on matured labels and the slices that matter. It is a screening step: a gain here is not a result until the business layer agrees.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| PR-AUC and precision at the review capacity | leading | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat coverage gaps are discovered by the scheduling office as they appear by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| Lead time of correct gap warnings | diagnostic | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat coverage gaps are discovered by the scheduling office as they appear by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| Calibration of gap probabilities | diagnostic | Offline metric named in the specification, computed on an out-of-time split of matured labels and reported with a bootstrap interval, overall and per slice. | Beat coverage gaps are discovered by the scheduling office as they appear by more than its interval on the same split; no slice below its floor. | Every training run, then weekly on matured labels | Data scientist | Block promotion; compare against the champion on the frozen golden set before changing anything. |
| Lift and precision at review or action capacity | leading | Precision, recall and lift in the top-k that the downstream team can actually act on. | Above the baseline at the real capacity, not at an arbitrary cut-off. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Score and rank stability across runs | diagnostic | Rank correlation of consecutive runs for stable entities, and share of entities that change band without a data change. | Stable unless inputs changed; churn explained. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Cumulative capture of the target outcome | leading | Share of eventual positives found within the top deciles, matured over the label horizon. | Above the champion on the same matured cohort. | Every training run and weekly on matured labels | Data scientist | Do not promote; diagnose on the slice or horizon where it fell. |
| Worst-slice performance: Age, sex, ethnicity and language | guardrail | Primary metric on each slice (Age, sex, ethnicity and language; Site and device (case mix, equipment differences)) against the overall result. | Every slice above its floor; a breach is a release blocker. | Every training run and weekly | Data scientist | Do not promote; add slice-aware features or data, or restrict the policy for that slice. |
| Lift over the baseline | diagnostic | Gain of the production model over coverage gaps are discovered by the scheduling office as they appear on the primary offline metric, divided by the extra run cost it brings. | Lift is worth its extra cost: if it falls under the cost of complexity, the baseline wins. | Per release | Clinical Informatics model owner | Fall back to the baseline rung of the degradation ladder and re-open the model choice. |
| Calibration error (ECE) and reliability | guardrail | Gap between predicted and observed rates in equal-mass bins, overall and per slice. Thresholds and costs act on the probability, not the rank. | ECE at or below 0.02 overall and 0.05 on each slice (starting thresholds). | Weekly on matured labels | Data scientist | Recalibrate (isotonic or Platt) per segment; do not move thresholds on a miscalibrated score. |
| Champion versus challenger gap | diagnostic | Difference between the live model and the best challenger on the same matured window, with an interval. | Challenger inside the champion interval; a clear, repeated lead triggers promotion review. | Weekly | Clinical Informatics model owner | Start the promotion gates in the MLOps section for the challenger. |

### Data and features

*Most production incidents begin as a data change. These metrics catch stale, missing, skewed or leaking inputs before the model does anything wrong with them.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Freshness and leakage guard: Coverage depth | guardrail | Event-to-feature delay and null rate for this input (daily partition (CDC snapshot or file drop) with a manifest and row counts). Automated point-in-time test that fails when: roster snapshot. | Freshness inside the data contract; zero point-in-time violations in the training set. | Per run | Clinical operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Freshness and leakage guard: Demand-to-capacity ratio | guardrail | Event-to-feature delay and null rate for this input (daily partition (CDC snapshot or file drop) with a manifest and row counts). Automated point-in-time test that fails when: forecast snapshot. | Freshness inside the data contract; zero point-in-time violations in the training set. | Per run | Clinical operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Freshness and leakage guard: Credential and privilege expiry | guardrail | Event-to-feature delay and null rate for this input (daily partition (CDC snapshot or file drop) with a manifest and row counts). Automated point-in-time test that fails when: credential records. | Freshness inside the data contract; zero point-in-time violations in the training set. | Per run | Clinical operations | Quarantine the partition and serve the last good value flagged stale; fix the producer or the join. |
| Training-serving skew | diagnostic | Distribution distance (PSI or KS) between each served feature (starting with Coverage depth, Demand-to-capacity ratio, Credential and privilege expiry) and the same feature in the training snapshot, plus a row-level parity check on a sampled request replay. | PSI under 0.1 per feature; investigate between 0.1 and 0.2; act above 0.2 (starting thresholds). Replay parity above 99.9%. | Per run | Clinical operations | Find the feature whose online and offline code paths differ; ship one implementation to both. |
| Population drift | leading | Input distribution on production traffic versus the training window, plus prediction-score drift. outcomes such as 30-day readmission or mortality that arrive after discharge | No sustained drift above 0.2 PSI on a top feature without a matching quality drop being ruled out. | Daily | Data scientist | Open an investigation; retrain only on a confirmed matured-label drop (see MLOps triggers). |
| Label maturity and delay | diagnostic | Share of training rows whose label has matured, and the label delay at p50 and p90, per source. Rows whose labels are still arriving are censored, not negatives. | Training and evaluation use only matured windows; delay tracked against the horizon in the experimentation section. | Weekly | Clinical operations | Shorten the window or add a survival-aware label model; never train on unmatured negatives. |
| Contract violations and quarantine | guardrail | Records rejected or quarantined by the schema, range and uniqueness checks of the data contract, with the duplicate and late-event shares. | Duplicates below 0.01% and completeness at or above 99.9% on required fields, as in the contract example. | Continuous | Clinical operations | Notify the producer; apply the on_breach action in the contract (quarantine and serve stale). |
| Banned-feature check | guardrail | Automated test that none of the features the specification calls noise (Specialty name; Roster file format; Physician seniority) or any prohibited attribute enters the feature set. | Zero occurrences in the training set, feature store and serving path. | Every build | Clinical operations | Fail the pipeline; remove the feature and retrain. |

### System and reliability

*Whether the service answers inside its deadline, stays up, and degrades on purpose instead of by accident. Numbers come from the stage budgets and SLOs in this blueprint.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| End-to-end latency | guardrail | Duration of the run from trigger to atomic publish. | Run duration p95 within 70% of the window | Continuous | SRE | Page on burn rate; follow the degradation ladder before adding capacity. |
| Stage runtime: Roster, leave and demand intake | diagnostic | Wall-clock time of Roster, leave and demand intake (warehouse extracts) as a share of the run window. | No stage above 40% of the window; growth over 20% week on week is investigated. | Per run | ML platform | Profile the stage; add parallelism or move work off the critical path. |
| Stage runtime: Minimum coverage rules | diagnostic | Wall-clock time of Minimum coverage rules (deterministic checks) as a share of the run window. | No stage above 40% of the window; growth over 20% week on week is investigated. | Per run | ML platform | Profile the stage; add parallelism or move work off the critical path. |
| Stage runtime: Gap risk model | diagnostic | Wall-clock time of Gap risk model (gradient boosting with calibration) as a share of the run window. | No stage above 40% of the window; growth over 20% week on week is investigated. | Per run | ML platform | Profile the stage; add parallelism or move work off the critical path. |
| Stage runtime: Cause classifier | diagnostic | Wall-clock time of Cause classifier (rules and attribution) as a share of the run window. | No stage above 40% of the window; growth over 20% week on week is investigated. | Per run | ML platform | Profile the stage; add parallelism or move work off the critical path. |
| Share of valid requests answered inside the deadline | guardrail | Successful, deadline-respecting responses over valid requests. | Run completes inside the 2 hour window on 99% of days; error budget ≈ 7 late runs per year. | Continuous | SRE | Freeze risky releases when the budget burns faster than the multi-window alert. |
| Decisions served from a degraded path | guardrail | Share of decisions made below the full model path (fallback, stale features, baseline rung). | ≤ 1% of decisions below degradation level 1 | Continuous | ML platform | Treat a sustained rise as an incident in the dependency that triggered the fallback. |
| Saturation: 8-vCPU Spark executors | leading | 8-vCPU Spark executors utilisation, queue depth and queue wait against the remaining deadline. | 2 8-vCPU Spark executors provisioned for 300,000 rows per run (modelled utilisation 0.1%); the run finishes inside its window with headroom for a backfill. | Continuous | SRE | Autoscale on queue depth; shed background and retry traffic first. |
| Dependency health | diagnostic | Error, timeout and retry rate per dependency (Gap risk model), with breaker state. | Breaker closed; retries under 5% of calls (starting threshold). | Continuous | ML platform | Open the breaker, use cached or default values with a flag and page the owner. |
| Event-bus consumer lag | diagnostic | Lag of the decision-log and label consumers, which feed audit and retraining. | Zero lag at run close. | Continuous | Clinical operations | Scale consumers or partitions; replay from the log once healthy. |
| Detect, acknowledge, recover (SEV1) | guardrail | Time to detect, to acknowledge and to restore service for the highest severity, from the incident record. | Acknowledge in 15 minutes; recovery inside RTO 2 hours (one run window). | Per incident and quarterly game day | SRE | Run the blameless review; add the missing alert or runbook step. |

### Cost and sustainability

*A system that works but costs more than the value it creates is a failed system. Tracks unit cost against the capacity model, and the energy it burns.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Cost per 1,000 decisions | guardrail | Monthly run cost divided by monthly decisions, from billing tags. | ≤ $0.217; 20% over the modelled cost before FinOps review. | Monthly | FinOps | Review the largest cost line first; right-size before changing the model. |
| Cost per scored record | outcome | All-in monthly cost divided by business outcomes (scored records), including retraining, observability, transfer, backup and human review. | $0.00018 modelled at the published workload; alert above 120% of it. | Monthly | FinOps | Compare against value per outcome; if the margin is gone, cut tiers or scope. |
| Compute utilisation and idle spend | diagnostic | Used versus provisioned 8-vCPU Spark executors over the month, and spend on capacity that served nothing. | Measured use of the 2 provisioned 8-vCPU Spark executors stays near the modelled 0.1%; pools running under half of the modelled figure are flagged for right-sizing. | Weekly | FinOps | Right-size pools; schedule batch work into off-peak windows. |
| Retraining and evaluation spend | diagnostic | Compute and labelling cost per retraining cycle and per evaluation run, per month. | Inside the modelled share of the all-in cost; a cycle that cannot beat the champion is stopped early. | Per cycle | FinOps | Cut the schedule to the drift and label-maturity triggers; cache features between runs. |
| Energy and carbon per 1,000 decisions | diagnostic | Estimated kWh and gCO2e per 1,000 decisions from node-hours, utilisation and the region's grid intensity. | Tracked and falling or flat as traffic grows; reported with the cost figure. | Monthly | FinOps | Prefer lower-carbon regions for batch work, smaller models for easy cases and higher utilisation. |

### Responsible AI

*Fairness, explainability and human control, measured rather than asserted, at the strictness the risk tier requires.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Fairness gap across slices | guardrail | Difference in the primary error rate and in selection rate between slices (Age, sex, ethnicity and language; Site and device (case mix, equipment differences)), with intervals. | Gap within the tolerance agreed with risk and legal; selection-rate ratio at or above 0.8 where a four-fifths test applies (starting threshold). | Every release and monthly | Responsible AI lead | Release blocker; investigate features that proxy a protected class and re-run the slice report. |
| Explanation coverage and fidelity | guardrail | Share of decisions returned with reason codes or citations, and agreement of the stated reason with an independent attribution on a sample. | 100% coverage on adverse decisions; sampled fidelity reviewed monthly. | Monthly sample | Clinical Informatics model owner | Fix the reason-code mapping; stop returning codes that cannot be reproduced from the ledger. |
| Human oversight in practice | guardrail | Time to halt the system from the stop control, share of required reviews that happened inside their time limit, and override handling. | Stop drill succeeds inside the incident target; no required review skipped. | Quarterly drill | Risk owner | Treat a failed drill as a SEV2; fix authority, tooling or paging. |
| Appeal overturn rate and time to resolve | diagnostic | Share of contested decisions overturned, and median days to a final answer. | Resolution inside the policy window; overturn reasons reviewed for patterns. | Monthly | Risk owner | Add overturned patterns to the golden set and the slice report. |
| Model documentation currency | diagnostic | Share of production versions whose model card, intended-use statement and limitations are current and approved. | 100% of production versions; approval trail attached. | Per release | Clinical Informatics model owner | Block the release until the card is current. |

### Security, privacy and compliance

*Abuse, leakage and obligations, with the evidence an auditor would ask for tracked as a number with an owner and a cadence.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Abuse and probing: Adversarial inputs that evade the model | guardrail | Callers or sessions flagged for the behaviour behind this threat, and the share blocked or throttled. Control in place: rate-limit and monitor probing, randomise thresholds near the boundary and keep rules and a challenger as a s…. | Flagged sessions triaged inside a working day; no successful evasion in the red-team replay. | Continuous | Security | Throttle or block the caller, rotate thresholds near the boundary and add the pattern to the red-team set. |
| Sensitive data in logs, caches and features | guardrail | Count of unredacted sensitive fields (restricted: identifiable clinical data (PHI); Confidential: de-identi…) found by scanning sampled logs, traces, caches and training snapshots. | Zero unredacted sensitive fields in any sampled log, trace, cache or snapshot. | Weekly scan | Security | Purge, fix the redaction rule, and review who could read it. |
| Artifact provenance | guardrail | Share of production models, datasets and containers that are signed, scanned and present in the ML bill of materials. | 100% of production artifacts signed, scanned and listed in the bill of materials. | Per release | Security | Block deployment; investigate any unsigned artifact as a supply-chain event. |
| Deletion and retention propagation | guardrail | Time from a deletion request or retention expiry to removal from features, embeddings, caches and training snapshots. | Inside the statutory or contractual window for this domain. | Monthly sample | Privacy officer | Fix the lineage gap that kept the data; re-run the deletion. |
| Decision-ledger completeness and replay | guardrail | Share of decisions with a complete ledger entry (inputs hash, model version, policy version, output), and the share of a sampled set that replays to the same output. | 100% complete; sampled replay reproduces the output. | Daily and monthly sample | Clinical Informatics model owner | Stop promotion until the ledger path is fixed; an incomplete ledger is an audit finding. |
| Evidence freshness: Health-data protection (HIPAA, GDPR, ABDM) | diagnostic | Age of the evidence for this obligation: access-audit sample, data-flow diagram and de-identification risk report. | Evidence refreshed quarterly. | Quarterly | Privacy and security officer | Escalate to the control owner before the evidence goes stale; record the exception. |
| Evidence freshness: Software-as-medical-device classification and clinical validation | diagnostic | Age of the evidence for this obligation: validation study, locked-version manifest and change records. | Evidence refreshed per release and annually. | Per release and annually | Clinical safety officer | Escalate to the control owner before the evidence goes stale; record the exception. |
| Evidence freshness: Clinical safety case and alert governance | diagnostic | Age of the evidence for this obligation: hazard log, alert-burden report and subgroup performance dashboard. | Evidence refreshed monthly. | Monthly | Patient safety committee | Escalate to the control owner before the evidence goes stale; record the exception. |
| Cross-border access to regulated state | guardrail | Reads or writes of pinned records from outside their jurisdiction, from the access log. | Zero outside the approved token and derived-feature paths. | Continuous | Platform engineering | Block the path and open a compliance incident. |

### MLOps and delivery

*How safely and quickly the model changes: retraining freshness, promotion gates, rollback and reproducibility.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Model age against its label horizon | leading | Days since the champion was trained on a fully matured window. Retraining trigger: quality on matured labels falls below the guardrail (Gaps avoided or mitigated) for two consecutive windows. | Younger than the scheduled refresh; never older than the label horizon. | Daily | MLOps engineer | Start the retraining pipeline; if it fails, keep the champion and freeze promotion. |
| Retraining pipeline reliability | guardrail | Success rate and duration of scheduled training runs, and the time from trigger to a registered candidate. | Two consecutive failures page the owner; duration inside the retraining window. | Per run | MLOps engineer | Re-run from the last good dataset snapshot; add a contract or resource test for the failing step. |
| Promotion gate pass rate and shadow disagreement | diagnostic | Share of candidates that pass all release gates, and the disagreement rate between challenger and champion in shadow. | Gates unchanged by hand; shadow disagreement explained before canary. | Per candidate | MLOps engineer | Hold the candidate; add the disagreeing cases to the golden set. |
| Time to roll back | guardrail | Time from a decision to roll back to traffic fully on the previous version. One-step revert to the previous registry version and serving revision, with backward-compatible schema migrations only; rollback…. | Rehearsed every quarter and inside the incident acknowledgement target. | Quarterly rehearsal | MLOps engineer | Fix the slowest step; a rollback that has never been rehearsed is assumed broken. |
| Change failure rate and lead time | diagnostic | Share of model or pipeline changes that cause a rollback or incident, and time from merge to production. | Change failure rate falling; lead time short enough that fixes are not batched. | Monthly | MLOps engineer | Reduce batch size of changes; strengthen the gate that missed it. |
| Reproducibility | guardrail | Share of registry versions that can be rebuilt from recorded code, data snapshot and config with metrics inside tolerance. | 100% of production versions. | Per release and quarterly sample | MLOps engineer | Freeze the version until its inputs are recorded. |
| Regression test for the offline-online trap | guardrail | A test in the regression suite for the known trap: predicting shortfalls that rules show. | Passing on every candidate; the trap is checked, not assumed away. | Every candidate | Data scientist | Fail the candidate and fix the split, label or feature that causes the gap. |

### Experimentation health

*Whether the experiments that justify the system can be trusted: assignment, power, and agreement between offline and online results.*

| Metric | Kind | Definition | Target | Cadence | Owner | On breach |
|---|---|---|---|---|---|---|
| Sample ratio mismatch | guardrail | Chi-square test of actual versus intended arm sizes for every experiment. | p-value above 0.001; a smaller value invalidates the readout (standard practice). | Per experiment, daily | Experimentation lead | Stop the readout; find the assignment, logging or filtering bug before analysing. |
| Realised power and minimum detectable effect | diagnostic | Power achieved at the observed variance against the minimum effect that pays for the change. Design: shadow-then-holdout. | Power at least 80% at the planned minimum effect; duration covers whole weekly cycles and the label delay. | Per experiment | Experimentation lead | Extend the test or reduce variance (CUPED); do not read an underpowered test. |
| Offline-online agreement | leading | Share of past launches where the sign and rough size of the offline gain on "PR-AUC and precision at the review capacity" matched the online effect on "Gaps avoided or mitigated". | Agreement tracked across launches; a falling rate means the offline set no longer represents production. | Per launch | Data scientist | Rebuild the offline evaluation set from recent production and re-check the known trap. |
| Holdout health | diagnostic | Size, stability and contamination of the persistent holdout, and the share of the randomised slice that is observed. | Holdout never receives the new policy; exploration slice logged with its propensity. | Monthly | Experimentation lead | Refresh the holdout and re-estimate propensities. |

## Metrics that can be gamed

| Metric | Risk | Counter |
|---|---|---|
| Gaps avoided or mitigated | Moves when the measured population or the label window changes, not only when the system improves; novelty and adaptation inflate early readings. | Locum and overtime spend, read at 90 days against the holdout |
| PR-AUC and precision at the review capacity | Optimising it breaks on a known trap: predicting shortfalls that rules show. | Gaps avoided or mitigated on the holdout; the offline-online agreement rate |
| Coverage | Raised by deciding easy cases only, which leaves the hard ones on the old path. | Metric on the hardest decile and on the cold-start slice |
| End-to-end latency | Met by dropping or defaulting the hardest requests, so the percentile looks good while quality falls. | Degraded-path share and the primary metric on the fallback path |
| Any single offline score | A second known trap: random splits. | The matured-label metric by slice and the champion-challenger gap |

## Release gate record

| Gate | Threshold | Measured | Interval | Pass | Date | Approver |
|---|---|---|---|---|---|---|
| Offline primary | | | | | | |
| Calibration | | | | | | |
| Slice parity | | | | | | |
| Shadow agreement | | | | | | |
| Guardrails | | | | | | |
