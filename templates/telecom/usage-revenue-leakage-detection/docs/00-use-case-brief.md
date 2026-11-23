# Usage & Rating Revenue Leakage Detection: use-case brief

> Generated from the blueprint `telecom/usage-revenue-leakage-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Usage & Rating Revenue Leakage Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause. The system has to run as a scheduled batch job, inside these limits: Reconciliation across network, mediation and billing counts, Findings linked to a process step for root cause and Evidence pack for finance sign-off.

**Why it is hard.** The obvious approach is final bill totals only, and it fails because leakage hides in the middle steps. The second trap is in "Baseline": the real signal is expected volume by service and period, while teams usually reach for fixed tolerance.

**Scale and stakes.** At 10 million users this is about 72.0M model-touching events a day, 833 requests per second on average and 833 at peak, at an estimated $4.4K a month. A mistake is expensive in the way time from leak to fix measures it.

**What success looks like.** Offline: Recall of seeded leaks, Root-cause accuracy and Value-weighted precision. Online: Revenue recovered, Time from leak to fix and Leaks found by customers. The launch is judged on "Revenue recovered" while "Time from leak to fix" must not get worse.

## Objective, loss and constraints

**Business objective.** Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause.

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

- Reconciliation across network, mediation and billing counts
- Findings linked to a process step for root cause
- Evidence pack for finance sign-off
- Daily run over 3B usage records

## The approach in one paragraph

Start with daily reconciliation of record counts and values with fixed tolerance by service, because finance trusts it. Then earn the move to seasonal baselines per service and hop with anomaly scoring and a classifier of probable root cause, producing a ranked recovery list with an evidence pack, and only if it beats the baseline on Recall of seeded leaks and Root-cause accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Record count ratio between steps | Records in versus out per day and service. Loss at a hop. Guard against: align on the same period. |
| Add Rate plan assignment gaps | Usage without a matching rating rule. Common cause. Guard against: needs the catalogue history. |
| Add Unrated or zero-value share | Share of usage with zero charge by product. Leak signal. Guard against: per product. |
| Run it as one pipeline | Usage data extraction (lakehouse), Hop-level reconciliation (batch jobs), Baseline model (seasonal time-series), Anomaly scoring (gradient boosting), Root-cause classifier (rules and model), Recovery list (finance console) and Fix tracking (ticketing). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle product launch | Launch calendar and a looser baseline for new products. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Invoice number: an identifier.
- Region alone: weak link.

**How the approach is proven**

Prove it offline on Recall of seeded leaks, Root-cause accuracy and Value-weighted precision using time-ordered splits, then online on "Revenue recovered" with "Time from leak to fix" as the guardrail. Watch for: Using total bill checks only, Fixed tolerances and No link to root cause.

## Baseline and production design

- **Baseline (build this first):** Daily reconciliation of record counts and values with fixed tolerance by service, because finance trusts it.
- **Production design:** Seasonal baselines per service and hop with anomaly scoring and a classifier of probable root cause, producing a ranked recovery list with an evidence pack.

## Why AI, and why this kind

**Why AI.** Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause. The evidence that separates good from bad outcomes (Record count ratio between steps, Rate plan assignment gaps, Unrated or zero-value share) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "final bill totals only" are what teams reach for first, and they fail because leakage hides in the middle steps. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Seasonal baselines per service and hop with anomaly scoring and a classifier of probable root cause, producing a ranked recovery list with an evidence pack.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Record count ratio between steps, Rate plan assignment gaps, Unrated or zero-value share and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Daily reconciliation of record counts and values with fixed tolerance by service, because finance trusts it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Seasonal baselines per service and hop with anomaly scoring and a classifier of probable root cause, producing a ranked recovery list with an evidence pack | chosen | Meets the run-window envelope at $0.0020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using total bill checks only.
- Evaluation trap: Fixed tolerances.
- Product launch: volumes jump without history.
- Late-arriving usage: counts differ by timing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
