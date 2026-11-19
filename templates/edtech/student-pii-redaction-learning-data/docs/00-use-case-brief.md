# Student PII Redaction in Learning Data: use-case brief

> Generated from the blueprint `edtech/student-pii-redaction-learning-data` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Student PII Redaction in Learning Data · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training. The system has to run as a scheduled batch job, inside these limits: FERPA / GDPR compliance, Recall over 99% on direct identifiers and Consistent pseudonyms.

**Why it is hard.** The obvious approach is balanced F1, and it fails because a missed name is a privacy breach. The second trap is in "Utility": the real signal is consistent pseudonyms, while teams usually reach for replacing with tags.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way data availability for analytics measures it.

**What success looks like.** Offline: Entity recall by type and Re-identification risk estimates. Online: PII leaks in audits and Data availability for analytics. The launch is judged on "PII leaks in audits" while "Data availability for analytics" must not get worse.

## Objective, loss and constraints

**Business objective.** Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{RecallBoost}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{NER}} | Cross-entropy for recognising personal information (names, ids) in text. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RecallBoost} | Penalty for missing a personal detail, set so that recall is favoured over precision. |

**Hard constraints**

- FERPA / GDPR compliance
- Recall over 99% on direct identifiers
- Consistent pseudonyms
- Multilingual

## The approach in one paragraph

Start with regex and dictionary scrubbing. Then earn the move to transformer NER ensemble with roster-based matching, consistent pseudonymisation and sampled human audits, and only if it beats the baseline on Entity recall by type and Re-identification risk estimates after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around NER entity probabilities | Token confidence. Recall tuning. Guard against: calibration. |
| Add Student roster match | Names from the class roster. High-precision catch. Guard against: roster freshness. |
| Add Contextual identifiers | School, teacher and location mentions. Re-identification. Guard against: rules. |
| Run it as one pipeline | Data export (LMS), Normaliser (cleaning), NER ensemble (transformer), Roster matcher (lookup), Pseudonymiser (consistent mapping) and Analytics release (data warehouse), with Audit sampler off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for recognising personal information (names, ids) in text, so the model is trained on the cost of the decision and not on a generic score. |
| Handle common-word names (Rose, Hope) | Roster priors and context-aware NER. |

**Deliberately not doing**

- Text length: weak.
- Language: weak.

**How the approach is proven**

Prove it offline on Entity recall by type and Re-identification risk estimates using time-ordered splits, then online on "PII leaks in audits" with "Data availability for analytics" as the guardrail. Watch for: Evaluation on synthetic names and Ignoring quasi-identifiers.

## Baseline and production design

- **Baseline (build this first):** Regex and dictionary scrubbing.
- **Production design:** Transformer NER ensemble with roster-based matching, consistent pseudonymisation and sampled human audits.

## Why AI, and why this kind

**Why AI.** Remove or pseudonymise student PII in submissions, chats and transcripts before using them for analytics or model training. The evidence that separates good from bad outcomes (NER entity probabilities, Student roster match, Contextual identifiers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "balanced F1" are what teams reach for first, and they fail because A missed name is a privacy breach. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Transformer NER ensemble with roster-based matching, consistent pseudonymisation and sampled human audits.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among NER entity probabilities, Student roster match, Contextual identifiers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex and dictionary scrubbing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Transformer NER ensemble with roster-based matching, consistent pseudonymisation and sampled human audits | chosen | Meets the run-window envelope at $0.208 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (PII leaks in audits) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on synthetic names.
- Evaluation trap: Ignoring quasi-identifiers.
- Common-word names (Rose, Hope): missed or over-redacted.
- Indirect identifiers combine into re-identification: combinations of school, class and event details allow re-identification of a student.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
