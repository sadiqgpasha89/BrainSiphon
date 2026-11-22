# Provider Directory Accuracy & Drift Detection: use-case brief

> Generated from the blueprint `healthcare/provider-directory-accuracy-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy & Drift Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. The system has to run as a scheduled batch job, inside these limits: A data steward or the provider confirms a correction before publication and the tool never edits the live directory, Authoritative sources outrank inferred signals and every flag shows its source and age and Claims and encounter signals are used only where lawful and only in aggregate for the flag.

**Why it is hard.** The obvious approach is record-level score, and it fails because different fields change at different rates. The second trap is in "Sources": the real signal is authoritative and inferred sources ranked, while teams usually reach for all sources equal.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to correct a stale field measures it.

**What success looks like.** Offline: Drift precision and recall on verified samples, Field-level confirmation rate of flagged items and Lead time between real change and detection. Online: Directory accuracy on audited samples, Time to correct a stale field and Member complaints about wrong directory data. The launch is judged on "Directory accuracy on audited samples" while "Time to correct a stale field" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- A data steward or the provider confirms a correction before publication and the tool never edits the live directory
- Authoritative sources outrank inferred signals and every flag shows its source and age
- Claims and encounter signals are used only where lawful and only in aggregate for the flag
- Drift is flagged by field and not as a verdict on the provider
- Scans 600K directory records weekly
- No provider is penalised from a drift score

## The approach in one paragraph

Start with an annual call campaign verifies a sample of directory records. Then earn the move to field-level comparison of directory values with authoritative, attested and inferred sources, a temporal model of change likelihood by field and a ranked correction queue with provenance and confidence, and only if it beats the baseline on Drift precision and recall on verified samples and Field-level confirmation rate of flagged items after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Source disagreement | Difference between the directory value and an authoritative or attested value. Direct drift signal. Guard against: source snapshots. |
| Add Record age since last verification | Days since the field was confirmed. Staleness risk. Guard against: verification log. |
| Add Change-event volume | Updates in related systems for the same provider. Hints at change. Guard against: event feeds. |
| Run it as one pipeline | Directory and source intake (warehouse extracts), Source reconciler (identifier and attribute rules), Field drift scorer (gradient boosting with temporal features), Provenance and confidence builder (rules) and Data steward or provider confirmation (human), with Correction queue ranker and Correction outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle provider with several locations | Location-level records. |

**Deliberately not doing**

- Directory sort order: artefact.
- Practice marketing text: not data.
- Record creation date alone: not drift.

**How the approach is proven**

Prove it offline on Drift precision and recall on verified samples, Field-level confirmation rate of flagged items and Lead time between real change and detection using time-ordered splits, then online on "Directory accuracy on audited samples" with "Time to correct a stale field" as the guardrail. Watch for: Letting inferred signals override authoritative sources, Auto-publishing corrections and Scoring providers.

## Baseline and production design

- **Baseline (build this first):** An annual call campaign verifies a sample of directory records.
- **Production design:** Field-level comparison of directory values with authoritative, attested and inferred sources, a temporal model of change likelihood by field and a ranked correction queue with provenance and confidence.

## Why AI, and why this kind

**Why AI.** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. The evidence that separates good from bad outcomes (Source disagreement, Record age since last verification, Change-event volume) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "record-level score" are what teams reach for first, and they fail because different fields change at different rates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Field-level comparison of directory values with authoritative, attested and inferred sources, a temporal model of change likelihood by field and a ranked correction queue with provenance and confidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Source disagreement, Record age since last verification, Change-event volume and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: An annual call campaign verifies a sample of directory records | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Field-level comparison of directory values with authoritative, attested and inferred sources, a temporal model of change likelihood by field and a ranked correction queue with provenance and confidence | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Directory accuracy on audited samples) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting inferred signals override authoritative sources.
- Evaluation trap: Auto-publishing corrections.
- Provider with several locations: one location changes.
- Source outage: the signal vanishes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
