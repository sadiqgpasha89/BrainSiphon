# Grading Triage & Teacher Workload Optimisation: use-case brief

> Generated from the blueprint `edtech/grading-triage-for-teacher-workload` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grading Triage & Teacher Workload Optimisation · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality. The system has to run as a scheduled batch job, inside these limits: Quality assurance sampling, Teacher trust and Student appeals.

**Why it is hard.** The obvious approach is auto-grade everything, and it fails because unchecked errors compound. The second trap is in "Audit": the real signal is random audits of auto-graded items, while teams usually reach for trust model confidence.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way appeal rate measures it.

**What success looks like.** Offline: Grading error vs experts at routing thresholds and Calibration. Online: Teacher hours saved and Appeal rate. The launch is judged on "Teacher hours saved" while "Appeal rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality.

**Training objective.** `\min\;\text{manual hours}\ \text{s.t. grading error}\le\epsilon`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \text{manual hours} | Hours teachers spend grading by hand, which the system tries to minimise. |
| \epsilon | The maximum acceptable grading error. |

**Hard constraints**

- Quality assurance sampling
- Teacher trust
- Student appeals
- Edge cases flagged

## The approach in one paragraph

Start with teachers grade everything manually. Then earn the move to calibrated multi-grader ensemble with risk-tiered routing and random audit sampling, teacher dashboards for overrides, and only if it beats the baseline on Grading error vs experts at routing thresholds and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Grader confidence | Calibrated confidence. Routing. Guard against: calibration. |
| Add Item type risk | Stakes of the assessment. Policy. Guard against: metadata. |
| Add Disagreement across graders | Ensemble disagreement. Flag. Guard against: models. |
| Run it as one pipeline | Submissions (LMS), Auto-graders (rubric models), Confidence calibrator (isotonic), Routing policy (risk tiers) and Grade publication (SIS), with Teacher queue and Audit sampler off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle model drifts on new question types | Audit sampling alarms and per-type calibration. |

**Deliberately not doing**

- Student name: bias.
- Submission time: weak.

**How the approach is proven**

Prove it offline on Grading error vs experts at routing thresholds and Calibration using time-ordered splits, then online on "Teacher hours saved" with "Appeal rate" as the guardrail. Watch for: Evaluating on easy items and Auditing only flagged items.

## Baseline and production design

- **Baseline (build this first):** Teachers grade everything manually.
- **Production design:** Calibrated multi-grader ensemble with risk-tiered routing and random audit sampling, teacher dashboards for overrides.

## Why AI, and why this kind

**Why AI.** Prioritise which student work teachers should grade manually and which can be auto-graded or sampled, reducing workload without hurting quality. The evidence that separates good from bad outcomes (Grader confidence, Item type risk, Disagreement across graders) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "auto-grade everything" are what teams reach for first, and they fail because unchecked errors compound. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Calibrated multi-grader ensemble with risk-tiered routing and random audit sampling, teacher dashboards for overrides.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Grader confidence, Item type risk, Disagreement across graders and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Teachers grade everything manually | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated multi-grader ensemble with risk-tiered routing and random audit sampling, teacher dashboards for overrides | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Teacher hours saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on easy items.
- Evaluation trap: Auditing only flagged items.
- Model drifts on new question types: auto grades silently worse.
- High-stakes exam items: must be human-graded.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
