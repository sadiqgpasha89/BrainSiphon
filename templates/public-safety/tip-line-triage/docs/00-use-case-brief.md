# Public Tip Line Triage: use-case brief

> Generated from the blueprint `public-safety/tip-line-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Tip Line Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly. The system has to run interactively, within a few seconds, inside these limits: Possible imminent danger goes to a person at once, Recall of urgent tips above 99% and Anonymity of tipsters preserved.

**Why it is hard.** The obvious approach is topic only, and it fails because an urgent tip can be on any topic. The second trap is in "Privacy": the real signal is tipster anonymity protected, while teams usually reach for identifiable logs.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way unrouted tips measures it.

**What success looks like.** Offline: Urgent recall, Routing accuracy and Duplicate linking precision. Online: Time to urgent tip action, Unrouted tips and Tipster trust measures. The launch is judged on "Time to urgent tip action" while "Unrouted tips" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Possible imminent danger goes to a person at once
- Recall of urgent tips above 99%
- Anonymity of tipsters preserved
- No scoring of named people
- 500K tips per year

## The approach in one paragraph

Start with a human reading every tip in order of arrival, because it is the current practice. Then earn the move to a classifier with an urgent-first rule layer, anonymised text storage, topic routing and duplicate linking, with sampled human review of all classes, and only if it beats the baseline on Urgent recall and Routing accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Urgency cue score | Threats, locations and timing words. Escalation. Guard against: from text. |
| Add Topic class | Fraud, drugs, safety or other. Routing. Guard against: classified. |
| Add Specificity | Names, places and times given. Actionability. Guard against: from extraction. |
| Run it as one pipeline | Tip intake (web, app and phone), Identity removal (redaction), Urgency gate (rules and model), Topic routing (classifier) and Duplicate linking (similarity), with Unit queue and Review sample off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle coded language | Human sampling and lexicon updates. |

**Deliberately not doing**

- Tipster name: personal data.
- Channel: weak link.
- Message length: weak link.

**How the approach is proven**

Prove it offline on Urgent recall, Routing accuracy and Duplicate linking precision using time-ordered splits, then online on "Time to urgent tip action" with "Unrouted tips" as the guardrail. Watch for: Scoring named people, Identifiable logs and Topic-only routing.

## Baseline and production design

- **Baseline (build this first):** A human reading every tip in order of arrival, because it is the current practice.
- **Production design:** A classifier with an urgent-first rule layer, anonymised text storage, topic routing and duplicate linking, with sampled human review of all classes.

## Why AI, and why this kind

**Why AI.** Classify and route tips and reports from the public by topic and urgency so urgent safety information reaches a person immediately and the rest is queued sensibly. The evidence that separates good from bad outcomes (Urgency cue score, Topic class, Specificity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "topic only" are what teams reach for first, and they fail because an urgent tip can be on any topic. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier with an urgent-first rule layer, anonymised text storage, topic routing and duplicate linking, with sampled human review of all classes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Urgency cue score, Topic class, Specificity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A human reading every tip in order of arrival, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier with an urgent-first rule layer, anonymised text storage, topic routing and duplicate linking, with sampled human review of all classes | chosen | Meets the 2500 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to urgent tip action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring named people.
- Evaluation trap: Identifiable logs.
- Coded language: threats are not obvious.
- Malicious tip: a tip targets an innocent person.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
