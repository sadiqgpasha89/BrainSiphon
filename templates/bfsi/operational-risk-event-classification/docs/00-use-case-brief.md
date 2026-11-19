# Operational Risk Event Classification & Loss Forecasting: use-case brief

> Generated from the blueprint `bfsi/operational-risk-event-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Operational Risk Event Classification & Loss Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns. The system has to run as a scheduled batch job, inside these limits: Basel event types and business lines mapped, Reviewer sign-off on high-severity events and Reports retained under policy.

**Why it is hard.** The obvious approach is one free-text category, and it fails because without causes, remediation repeats. The second trap is in "Severity": the real signal is heavy-tailed loss distribution with the tail modelled separately, while teams usually reach for mean loss.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way share of events with a linked control action measures it.

**What success looks like.** Offline: Macro-F1 by event type and Tail quantile accuracy. Online: Reviewer time per report and Share of events with a linked control action. The launch is judged on "Reviewer time per report" while "Share of events with a linked control action" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Huber}(\log\hat{s},\log s)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{s} | The predicted loss severity of the event (the model works on its log). |
| s | The actual loss severity of the event. |

**Hard constraints**

- Basel event types and business lines mapped
- Reviewer sign-off on high-severity events
- Reports retained under policy
- Weekly taxonomy updates

## The approach in one paragraph

Start with manual classification by the operational risk team using the taxonomy, because it is the standard practice. Then earn the move to a multilingual encoder classifier with a heavy-tail loss model (lognormal body, generalised Pareto tail), review queues for high-severity items and drift monitoring, and only if it beats the baseline on Macro-F1 by event type and Tail quantile accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Text embedding of the report | Encoder over the narrative. Captures cause and impact. Guard against: reports vary in quality. |
| Add Control tested flag | Whether a related control failed in the last test. Links event to control. Guard against: control IDs can be stale. |
| Add Business line and process | Process owner and value chain. Narrows event type. Guard against: org changes alter mapping. |
| Run it as one pipeline | Incident intake (risk system), Text preprocessor (PII redaction), Event classifier (transformer), Severity model (tail model), Control linker (rules and retrieval) and Loss database (warehouse), with Reviewer queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle novel event type | Flag out-of-distribution events for review and propose a new taxonomy entry to the risk owner. |

**Deliberately not doing**

- Reporter name: arbitrary.
- Report length: style.
- Severity assigned by the reporter: not calibrated.

**How the approach is proven**

Prove it offline on Macro-F1 by event type and Tail quantile accuracy using time-ordered splits, then online on "Reviewer time per report" with "Share of events with a linked control action" as the guardrail. Watch for: Labels reflect the first classification, not the final one and Time leakage via prior-event retrieval.

## Baseline and production design

- **Baseline (build this first):** Manual classification by the operational risk team using the taxonomy, because it is the standard practice.
- **Production design:** A multilingual encoder classifier with a heavy-tail loss model (lognormal body, generalised Pareto tail), review queues for high-severity items and drift monitoring.

## Why AI, and why this kind

**Why AI.** Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns. The evidence that separates good from bad outcomes (Text embedding of the report, Control tested flag, Business line and process) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one free-text category" are what teams reach for first, and they fail because without causes, remediation repeats. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A multilingual encoder classifier with a heavy-tail loss model (lognormal body, generalised Pareto tail), review queues for high-severity items and drift monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Text embedding of the report, Control tested flag, Business line and process and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual classification by the operational risk team using the taxonomy, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multilingual encoder classifier with a heavy-tail loss model (lognormal body, generalised Pareto tail), review queues for high-severity items and drift monitoring | chosen | Meets the run-window envelope at $0.209 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reviewer time per report) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels reflect the first classification, not the final one.
- Evaluation trap: Time leakage via prior-event retrieval.
- Novel event type: a new kind of loss event does not fit the existing taxonomy and is forced into a wrong class.
- Duplicate reports: the same event reported by many.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
