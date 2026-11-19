# DLP Content Classification: use-case brief

> Generated from the blueprint `cybersecurity/dlp-content-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DLP Content Classification · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives. The system has to run in under 100 milliseconds, inside these limits: Inline latency, Multilingual and Images and scans.

**Why it is hard.** The obvious approach is regex pattern matching, and it fails because regex flags every 16-digit number. The second trap is in "Adaptation": the real signal is per-tenant tuning from feedback, while teams usually reach for global rules.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $235.8K a month. A mistake is expensive in the way user override rate measures it.

**What success looks like.** Offline: Precision and recall per data type and Latency overhead. Online: Prevented leaks and User override rate. The launch is judged on "Prevented leaks" while "User override rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives.

**Training objective.** `\mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_k | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per class or label k) |
| p_k | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per class or label k) |

**Hard constraints**

- Inline latency
- Multilingual
- Images and scans
- Policy explainability for users

## The approach in one paragraph

Start with regex and dictionary DLP policies. Then earn the move to validated pattern detectors plus document-type and NER models with policy engine considering user, destination and data type, and only if it beats the baseline on Precision and recall per data type and Latency overhead after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pattern with validation | Luhn-valid card numbers, IBAN checksums. Precision. Guard against: validators. |
| Add Document type classifier | Contract, resume, source code. Sensitivity. Guard against: taxonomy. |
| Add Destination risk | External or personal cloud. Exfiltration. Guard against: policy. |
| Run it as one pipeline | Content capture (endpoint or CASB), OCR and extraction (document parser), Detectors (validators plus NER), Document classifier (transformer), Policy engine (rules) and User prompt or block (UI), with Incident feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle test data in staging environments triggers incidents | Environment context and synthetic-data tagging. |

**Deliberately not doing**

- Document author: weak.
- Last modified time: weak.

**How the approach is proven**

Prove it offline on Precision and recall per data type and Latency overhead using time-ordered splits, then online on "Prevented leaks" with "User override rate" as the guardrail. Watch for: Training on synthetic PII and Ignoring image-based content.

## Baseline and production design

- **Baseline (build this first):** Regex and dictionary DLP policies.
- **Production design:** Validated pattern detectors plus document-type and NER models with policy engine considering user, destination and data type.

## Why AI, and why this kind

**Why AI.** Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives. The evidence that separates good from bad outcomes (Pattern with validation, Document type classifier, Destination risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regex pattern matching" are what teams reach for first, and they fail because regex flags every 16-digit number. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Validated pattern detectors plus document-type and NER models with policy engine considering user, destination and data type.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pattern with validation, Document type classifier, Destination risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex and dictionary DLP policies | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Validated pattern detectors plus document-type and NER models with policy engine considering user, destination and data type | chosen | Meets the 80 ms envelope at $0.087 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Prevented leaks) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on synthetic PII.
- Evaluation trap: Ignoring image-based content.
- Test data in staging environments triggers incidents: realistic test data in staging triggers a flood of incidents that are not real leaks.
- Scanned documents with poor OCR: sensitive content missed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
