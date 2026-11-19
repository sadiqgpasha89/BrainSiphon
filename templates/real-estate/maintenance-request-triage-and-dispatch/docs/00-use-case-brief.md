# Maintenance Request Triage & Dispatch: use-case brief

> Generated from the blueprint `real-estate/maintenance-request-triage-and-dispatch` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Request Triage & Dispatch · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. The system has to run interactively, within a few seconds, inside these limits: Emergencies receive a technician or a response within 1 hour, Safety and habitability cases always escalate to a person and Tenants get status updates at each step.

**Why it is hard.** The obvious approach is the tone of the message, and it fails because calm messages can describe a flood, and angry ones a dripping tap. The second trap is in "Trade": the real signal is the correct trade and the parts likely needed, while teams usually reach for a free-text category chosen by the tenant.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.4K a month. A mistake is expensive in the way emergency response time measures it.

**What success looks like.** Offline: Urgency recall and Trade accuracy. Online: First-visit fix rate and Emergency response time. The launch is judged on "First-visit fix rate" while "Emergency response time" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{OrdinalCE}(\hat{u},u)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{OrdinalCE} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |
| \hat{u} | The predicted urgency level of the request. |
| u | The true urgency level assigned by a maintenance supervisor. |

**Hard constraints**

- Emergencies receive a technician or a response within 1 hour
- Safety and habitability cases always escalate to a person
- Tenants get status updates at each step
- Every decision and dispatch is logged for audit

## The approach in one paragraph

Start with staff triage by phone, because it is the current process. Then earn the move to multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser, and only if it beats the baseline on Urgency recall and Trade accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Safety phrases | Presence of terms such as gas smell, flooding, no heating or sparks in the text. Triggers urgent escalation. Guard against: terms vary by language and dialect, so test on local phrasing. |
| Add Image classifier | Probability that the photo shows a leak, mould, broken glass or electrical damage. Adds evidence the text omits. Guard against: photo quality varies, so require a confidence margin. |
| Add Asset history | Number and type of repairs on the unit and the equipment in the last 24 months. Repeated faults point to root causes. Guard against: records are incomplete for older buildings. |
| Run it as one pipeline | Request intake (app and phone), Text and image classifier (multimodal model), Urgency rules (rules), Parts predictor (boosting), Dispatcher (optimiser), Tenant update (comms) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle emergency after hours | Route urgent categories to the on-call technician and page them automatically. |

**Deliberately not doing**

- Tenant name: Irrelevant to urgency or trade.
- Request length: A style that depends on the tenant and not on the severity.
- Time sent: Weakly related to urgency, and urgent problems occur at all hours.

**How the approach is proven**

Prove it offline on Urgency recall and Trade accuracy using time-ordered splits, then online on "First-visit fix rate" with "Emergency response time" as the guardrail. Watch for: Labels come from staff habits and may reflect past dispatch practice and not need and Missing photos for some requests make the evaluation optimistic about the multimodal model.

## Baseline and production design

- **Baseline (build this first):** Staff triage by phone, because it is the current process.
- **Production design:** Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser.

## Why AI, and why this kind

**Why AI.** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. The evidence that separates good from bad outcomes (Safety phrases, Image classifier, Asset history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the tone of the message" are what teams reach for first, and they fail because calm messages can describe a flood, and angry ones a dripping tap. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Safety phrases, Image classifier, Asset history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff triage by phone, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser | chosen | Meets the 2500 ms envelope at $0.461 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (First-visit fix rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels come from staff habits and may reflect past dispatch practice and not need.
- Evaluation trap: Missing photos for some requests make the evaluation optimistic about the multimodal model.
- Emergency after hours: an emergency arrives after hours when nobody reads the queue.
- Vague request: a request has too little detail to choose a trade or urgency.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
