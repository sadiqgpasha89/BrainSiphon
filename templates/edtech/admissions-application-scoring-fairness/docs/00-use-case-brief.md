# Admissions Application Scoring with Fairness Controls: use-case brief

> Generated from the blueprint `edtech/admissions-application-scoring-fairness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Admissions Application Scoring with Fairness Controls · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions. The system has to run as a scheduled batch job, inside these limits: Legal compliance on protected attributes, Human decision-making and Transparency to applicants.

**Why it is hard.** The obvious approach is automated admit/reject, and it fails because automated decisions have legal and ethical risk. The second trap is in "Bias": the real signal is audit and mitigate proxy bias in features, while teams usually reach for remove protected attributes only.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way diversity of admitted class measures it.

**What success looks like.** Offline: Reviewer agreement and time saved and Subgroup selection-rate audits. Online: Reviewer throughput and Diversity of admitted class. The launch is judged on "Reviewer throughput" while "Diversity of admitted class" must not get worse.

## Objective, loss and constraints

**Business objective.** Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions.

**Training objective.** `\mathcal{L}=\mathrm{CE}+\lambda\,\mathrm{DemographicParity}+\mu\,\mathrm{EqualisedOdds}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Weight on the demographic-parity fairness penalty: how strongly it counts against the main objective. |
| \mathrm{DemographicParity} | Demographic parity penalty: grows when positive prediction rates differ between groups. |
| \mu | Weight on the equalised-odds fairness penalty: how strongly it counts against the main objective. |
| \mathrm{EqualisedOdds} | Equalised odds penalty: grows when true-positive and false-positive rates differ between groups. |

**Hard constraints**

- Legal compliance on protected attributes
- Human decision-making
- Transparency to applicants
- Audit trail

## The approach in one paragraph

Start with manual review with rubrics. Then earn the move to lLM-based evidence summarisation with human review, fairness audits of features, and reviewer calibration dashboards, and only if it beats the baseline on Reviewer agreement and time saved and Subgroup selection-rate audits after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Structured evidence summary | Extracted achievements and context. Reviewer efficiency. Guard against: extraction accuracy. |
| Add Context-adjusted achievement | Achievement relative to opportunity. Fairness. Guard against: context data. |
| Add Inter-reviewer agreement | Reviewer consistency. Quality. Guard against: review data. |
| Run it as one pipeline | Application ingest (portal), Document parser (OCR and NLP), Evidence extractor (LLM), Calibration analytics (BI) and Outcomes (enrolment), with Fairness audit and Reviewer workspace off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle historical admits encode past bias | Do not train on historical decisions; use rubric-based evidence only. |

**Deliberately not doing**

- Essay prestige phrases: privilege proxy.
- Extracurricular counts: privilege proxy.

**How the approach is proven**

Prove it offline on Reviewer agreement and time saved and Subgroup selection-rate audits using time-ordered splits, then online on "Reviewer throughput" with "Diversity of admitted class" as the guardrail. Watch for: Training on past admissions decisions and Fairness measured only on a single attribute.

## Baseline and production design

- **Baseline (build this first):** Manual review with rubrics.
- **Production design:** LLM-based evidence summarisation with human review, fairness audits of features, and reviewer calibration dashboards.

## Why AI, and why this kind

**Why AI.** Support holistic review by summarising applications and flagging evidence, with strict fairness controls and no automated decisions. The evidence that separates good from bad outcomes (Structured evidence summary, Context-adjusted achievement, Inter-reviewer agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "automated admit/reject" are what teams reach for first, and they fail because automated decisions have legal and ethical risk. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: LLM-based evidence summarisation with human review, fairness audits of features, and reviewer calibration dashboards.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Structured evidence summary, Context-adjusted achievement, Inter-reviewer agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual review with rubrics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LLM-based evidence summarisation with human review, fairness audits of features, and reviewer calibration dashboards | chosen | Meets the run-window envelope at $20.59 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reviewer throughput) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on past admissions decisions.
- Evaluation trap: Fairness measured only on a single attribute.
- Historical admits encode past bias: model replicates bias.
- Applicants attempt to game with AI-written essays: summaries inflated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
