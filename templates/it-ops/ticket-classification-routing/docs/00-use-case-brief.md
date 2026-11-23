# Ticket Classification and Routing: use-case brief

> Generated from the blueprint `it-ops/ticket-classification-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ticket Classification and Routing · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify incoming tickets by category, priority and owning team and suggest the first response so tickets reach the right resolver without manual sorting. The system has to run interactively, within a few seconds, inside these limits: Suggestions shown with confidence, Security and outage tickets routed to specialists at once and Agents can override.

**Why it is hard.** The obvious approach is the category chosen at creation, and it fails because requesters choose wrongly. The second trap is in "Safety": the real signal is rules for security and outage keywords, while teams usually reach for model only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to first touch measures it.

**What success looks like.** Offline: Routing accuracy on resolver labels, Urgent recall and Calibration. Online: Reassignment rate, Time to first touch and Resolution time. The launch is judged on "Reassignment rate" while "Time to first touch" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify incoming tickets by category, priority and owning team and suggest the first response so tickets reach the right resolver without manual sorting.

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

- Suggestions shown with confidence
- Security and outage tickets routed to specialists at once
- Agents can override
- Classification within 5 s
- 500K tickets per year

## The approach in one paragraph

Start with requesters choosing a category from a menu and dispatchers reassigning, because it is the usual flow. Then earn the move to a text classifier with a rule layer for urgent cases, resolver-based labels, confidence thresholds and an override loop for agents, and only if it beats the baseline on Routing accuracy on resolver labels and Urgent recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Ticket text | Description and subject. Core. Guard against: from the ticket. |
| Add Requester context | Department and location. Routing. Guard against: from the directory. |
| Add Affected configuration item | The item named or detected. Routing. Guard against: from the CMDB. |
| Run it as one pipeline | Ticket intake (ITSM), Text parsing (NLP), Category and team classifier (transformer), Urgency rules (rules), Routing (ITSM) and Agent override (console), with Accuracy review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle multiple issues | Suggest splitting the ticket. |

**Deliberately not doing**

- Requester name: personal data.
- Ticket number: an identifier.
- Channel alone: weak link.

**How the approach is proven**

Prove it offline on Routing accuracy on resolver labels, Urgent recall and Calibration using time-ordered splits, then online on "Reassignment rate" with "Time to first touch" as the guardrail. Watch for: Requester category as truth, Model-only urgency and Accuracy without reassignment.

## Baseline and production design

- **Baseline (build this first):** Requesters choosing a category from a menu and dispatchers reassigning, because it is the usual flow.
- **Production design:** A text classifier with a rule layer for urgent cases, resolver-based labels, confidence thresholds and an override loop for agents.

## Why AI, and why this kind

**Why AI.** Classify incoming tickets by category, priority and owning team and suggest the first response so tickets reach the right resolver without manual sorting. The evidence that separates good from bad outcomes (Ticket text, Requester context, Affected configuration item) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the category chosen at creation" are what teams reach for first, and they fail because requesters choose wrongly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A text classifier with a rule layer for urgent cases, resolver-based labels, confidence thresholds and an override loop for agents.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Ticket text, Requester context, Affected configuration item and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Requesters choosing a category from a menu and dispatchers reassigning, because it is the usual flow | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A text classifier with a rule layer for urgent cases, resolver-based labels, confidence thresholds and an override loop for agents | chosen | Meets the 2500 ms envelope at $0.680 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reassignment rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Requester category as truth.
- Evaluation trap: Model-only urgency.
- Multiple issues: one ticket describes several problems.
- Vague ticket: the text has little detail.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
