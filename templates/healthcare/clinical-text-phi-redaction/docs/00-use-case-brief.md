# Clinical Text PHI Redaction: use-case brief

> Generated from the blueprint `healthcare/clinical-text-phi-redaction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Text PHI Redaction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training. The system has to run as a scheduled batch job, inside these limits: Recall over 99.5%, Consistent pseudonyms for longitudinal linking and Names, dates, IDs, locations.

**Why it is hard.** The obvious approach is balanced F1, and it fails because missing one MRN violates policy. The second trap is in "Utility": the real signal is consistent date shifting and entity pseudonyms, while teams usually reach for replacing with tags.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way data availability for research measures it.

**What success looks like.** Offline: Entity-level recall by type and Re-identification risk assessment. Online: PHI leaks found in audits and Data availability for research. The launch is judged on "PHI leaks found in audits" while "Data availability for research" must not get worse.

## Objective, loss and constraints

**Business objective.** Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{RecallBoost}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{token}} | Cross-entropy for labelling each token as personal health information or not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RecallBoost} | Penalty for missing personal information, set so recall is favoured over precision. |

**Hard constraints**

- Recall over 99.5%
- Consistent pseudonyms for longitudinal linking
- Names, dates, IDs, locations
- HIPAA Safe Harbor / Expert determination

## The approach in one paragraph

Start with regex plus name dictionary. Then earn the move to transformer NER ensemble with regex and dictionary backstops, consistent pseudonymisation service and sampled human audit, and only if it beats the baseline on Entity-level recall by type and Re-identification risk assessment after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around NER entity confidence | Token-level probabilities. Recall tuning. Guard against: calibrated. |
| Add Pattern-matched IDs | Regex for MRN, phone. Backstop. Guard against: local formats. |
| Add Dictionary hit for names | Name lists and clinician rosters. Backstop. Guard against: updated lists. |
| Run it as one pipeline | Note export (EHR), Section parser (cleaning), NER ensemble (clinical transformer), Rule backstops (regex and lists), Pseudonymiser (date shift and surrogate) and Research data release (approved), with Audit sampler off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for labelling each token as personal health information or not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle names that are common words (Hope, Rose) | Context-aware NER and dictionary of ambiguous names. |

**Deliberately not doing**

- Note length: none.
- Clinician specialty: none.

**How the approach is proven**

Prove it offline on Entity-level recall by type and Re-identification risk assessment using time-ordered splits, then online on "PHI leaks found in audits" with "Data availability for research" as the guardrail. Watch for: Evaluation on synthetic or clean notes and Ignoring rare identifier types.

## Baseline and production design

- **Baseline (build this first):** Regex plus name dictionary.
- **Production design:** Transformer NER ensemble with regex and dictionary backstops, consistent pseudonymisation service and sampled human audit.

## Why AI, and why this kind

**Why AI.** Redact or pseudonymise PHI in clinical notes consistently so notes can be used for research and model training. The evidence that separates good from bad outcomes (NER entity confidence, Pattern-matched IDs, Dictionary hit for names) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "balanced F1" are what teams reach for first, and they fail because missing one MRN violates policy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Transformer NER ensemble with regex and dictionary backstops, consistent pseudonymisation service and sampled human audit.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among NER entity confidence, Pattern-matched IDs, Dictionary hit for names and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex plus name dictionary | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Transformer NER ensemble with regex and dictionary backstops, consistent pseudonymisation service and sampled human audit | chosen | Meets the run-window envelope at $0.209 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (PHI leaks found in audits) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on synthetic or clean notes.
- Evaluation trap: Ignoring rare identifier types.
- Names that are common words (Hope, Rose): missed or over-redacted.
- OCR noise in scanned notes: missed identifiers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
