# Insider Trading & Market Abuse Surveillance: use-case brief

> Generated from the blueprint `fintech/insider-trading-surveillance` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insider Trading & Market Abuse Surveillance · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. The system has to run as a scheduled batch job, inside these limits: Records retention per MiFID II / SEC rules, Chinese-wall boundaries and Alert volume under compliance capacity.

**Why it is hard.** The obvious approach is absolute trade size, and it fails because large benign trades are common; timing relative to news is the signal. The second trap is in "Linkage": the real signal is communications or relationship links between trader and insider, while teams usually reach for trade pattern alone.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $2.5K a month. A mistake is expensive in the way review time per alert measures it.

**What success looks like.** Offline: Precision at analyst capacity and Recall on historical enforcement cases. Online: Alerts per confirmed case and Review time per alert. The launch is judged on "Alerts per confirmed case" while "Review time per alert" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review.

**Training objective.** `\mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Calibration}+\mu\,\mathrm{AlertBudgetPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy on whether a trading pattern is suspicious. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |
| \mu | Weight on the alert-budget penalty: how strongly it counts against the main objective. |
| \mathrm{AlertBudgetPenalty} | Penalty when the model raises more alerts than the compliance team can review. |

**Hard constraints**

- Records retention per MiFID II / SEC rules
- Chinese-wall boundaries
- Alert volume under compliance capacity
- Explainable timeline per alert

## The approach in one paragraph

Start with threshold rules on volume and price moves before news. Then earn the move to event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts, and only if it beats the baseline on Precision at analyst capacity and Recall on historical enforcement cases after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pre-announcement abnormal return | Cumulative abnormal return relative to a market model. Informed trading shows before news. Guard against: event dates must be public timestamps. |
| Add Position change vs baseline | Deviation from the trader's historical position in the name. Unusual conviction. Guard against: baseline excludes the window. |
| Add Communication proximity | Graph distance and message volume to insiders. Information channel. Guard against: respect chinese-wall data scoping. |
| Run it as one pipeline | Trade and news ingestion (Kafka), Event-study feature job (Spark), Relationship graph (comms metadata), Abuse scorer (GBDT), Timeline summariser (LLM with citations) and Disposition labels (feedback), with Compliance analyst review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy on whether a trading pattern is suspicious, so the model is trained on the cost of the decision and not on a generic score. |
| Handle earnings season floods alerts | Per-event alert budget with ranking and sampling. |

**Deliberately not doing**

- P&L of the trade: outcome-based, not the cause.
- Number of trades per day: dominated by market makers.

**How the approach is proven**

Prove it offline on Precision at analyst capacity and Recall on historical enforcement cases using time-ordered splits, then online on "Alerts per confirmed case" with "Review time per alert" as the guardrail. Watch for: Enforcement cases are a tiny biased positive set and News timestamps not point-in-time.

## Baseline and production design

- **Baseline (build this first):** Threshold rules on volume and price moves before news.
- **Production design:** Event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts.

## Why AI, and why this kind

**Why AI.** Detect suspicious trading ahead of material news by linking trader activity, communications and corporate events for compliance review. The evidence that separates good from bad outcomes (Pre-announcement abnormal return, Position change vs baseline, Communication proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute trade size" are what teams reach for first, and they fail because large benign trades are common; timing relative to news is the signal. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pre-announcement abnormal return, Position change vs baseline, Communication proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Threshold rules on volume and price moves before news | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Event-study features feeding a GBDT, graph features from comms metadata, and an LLM timeline summariser for compliance analysts | chosen | Meets the run-window envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alerts per confirmed case) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Enforcement cases are a tiny biased positive set.
- Evaluation trap: News timestamps not point-in-time.
- Earnings season floods alerts: review queue overflows and genuine cases age out.
- Rumour-driven moves with no inside source: analysts chase alerts that have no information channel.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
