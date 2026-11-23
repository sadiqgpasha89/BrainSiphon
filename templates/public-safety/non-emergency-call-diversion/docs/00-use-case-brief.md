# Non-Emergency Call Diversion: use-case brief

> Generated from the blueprint `public-safety/non-emergency-call-diversion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Non-Emergency Call Diversion · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker. The system has to run interactively, within a few seconds, inside these limits: Any call that might be an emergency stays with a call taker, Recall of true emergencies above 99.9% and Diversion only with the caller's agreement.

**Why it is hard.** The obvious approach is average accuracy, and it fails because one missed emergency is unacceptable. The second trap is in "Choice": the real signal is the caller can always ask for a person, while teams usually reach for forced diversion.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way missed emergencies measures it.

**What success looks like.** Offline: Emergency recall, Diversion precision and Error parity by language. Online: Non-emergency calls to call takers, Missed emergencies and Caller satisfaction. The launch is judged on "Non-emergency calls to call takers" while "Missed emergencies" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Any call that might be an emergency stays with a call taker
- Recall of true emergencies above 99.9%
- Diversion only with the caller's agreement
- Equal treatment across languages
- 3M calls per year

## The approach in one paragraph

Start with a menu asking callers to press a key if it is not an emergency, because it is the usual approach. Then earn the move to a conservative classifier that diverts only high-confidence non-emergencies after consent, with immediate transfer on any doubt and a monitored miss-rate by language, and only if it beats the baseline on Emergency recall and Diversion precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Emergency keyword and cue score | Words and tones suggesting danger. Safety gate. Guard against: from speech and text. |
| Add Caller request type | Information, report or complaint. Route. Guard against: classified. |
| Add Service availability | Open alternative services. Option. Guard against: from directories. |
| Run it as one pipeline | Call intake (telephony), Speech recognition (ASR), Emergency cue gate (classifier), Diversion offer (voice assistant), Consent check (rules) and Alternative service handoff (directory), with Miss-rate review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle hidden emergency | Conservative thresholds and a person-first policy. |

**Deliberately not doing**

- Caller name: personal data.
- Time of day: weak link.
- Phone model: irrelevant.

**How the approach is proven**

Prove it offline on Emergency recall, Diversion precision and Error parity by language using time-ordered splits, then online on "Non-emergency calls to call takers" with "Missed emergencies" as the guardrail. Watch for: Forced diversion, Accuracy as the metric and English-only evaluation.

## Baseline and production design

- **Baseline (build this first):** A menu asking callers to press a key if it is not an emergency, because it is the usual approach.
- **Production design:** A conservative classifier that diverts only high-confidence non-emergencies after consent, with immediate transfer on any doubt and a monitored miss-rate by language.

## Why AI, and why this kind

**Why AI.** Identify calls that are not emergencies and offer other channels or services, while ensuring that any doubt goes to a call taker. The evidence that separates good from bad outcomes (Emergency keyword and cue score, Caller request type, Service availability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "average accuracy" are what teams reach for first, and they fail because one missed emergency is unacceptable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A conservative classifier that diverts only high-confidence non-emergencies after consent, with immediate transfer on any doubt and a monitored miss-rate by language.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Emergency keyword and cue score, Caller request type, Service availability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A menu asking callers to press a key if it is not an emergency, because it is the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A conservative classifier that diverts only high-confidence non-emergencies after consent, with immediate transfer on any doubt and a monitored miss-rate by language | chosen | Meets the 2500 ms envelope at $0.274 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Non-emergency calls to call takers) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Forced diversion.
- Evaluation trap: Accuracy as the metric.
- Hidden emergency: the caller understates the danger.
- Language gap: the model is weaker in some languages.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
