# Healthcare Procurement Spend Anomaly Detection: use-case brief

> Generated from the blueprint `healthcare/healthcare-procurement-spend-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Procurement Spend Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it. The system has to run as a scheduled batch job, inside these limits: Rules and robust anomaly models rank exceptions and procurement or finance reviews before any hold or supplier action, Units of measure, currencies, tax and item equivalence are normalised before comparison and Every exception shows the expected value, the actual value and the evidence.

**Why it is hard.** The obvious approach is raw line prices, and it fails because a case of 100 and a box of 10 look like a price anomaly. The second trap is in "Baseline": the real signal is item-level and category-level seasonal baselines, while teams usually reach for one global threshold.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to resolve an exception measures it.

**What success looks like.** Offline: Precision at the review capacity and recall on seeded and confirmed exceptions, Variance-estimate error against resolved cases and Alert acknowledgement rate. Online: Recovered or avoided spend, Time to resolve an exception and False-alert share. The launch is judged on "Recovered or avoided spend" while "Time to resolve an exception" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Rules and robust anomaly models rank exceptions and procurement or finance reviews before any hold or supplier action
- Units of measure, currencies, tax and item equivalence are normalised before comparison
- Every exception shows the expected value, the actual value and the evidence
- Alert budget per analyst per week
- Scores 4M purchase and invoice records nightly
- No individual is named in an alert

## The approach in one paragraph

Start with a report of invoices above a fixed price or quantity threshold. Then earn the move to normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow, and only if it beats the baseline on Precision at the review capacity and recall on seeded and confirmed exceptions and Variance-estimate error against resolved cases after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unit-price deviation | Invoiced unit price versus contract or trailing median price. The core price anomaly. Guard against: use normalised units and the price at the order date. |
| Add Order-frequency change | Change in order frequency for the item and cost centre. Detects fragmentation and surges. Guard against: trailing windows. |
| Add Supplier-concentration shift | Share of category spend moving between suppliers. Reveals off-contract buying. Guard against: contract status as at purchase. |
| Run it as one pipeline | Purchase and invoice intake (ERP extracts), Unit and item normaliser (item crosswalk rules), Business rule checks (procurement policy rules), Spend anomaly detector (robust baseline with isolation forest) and Exposure ranker and evidence builder (variance calculator), with Procurement and finance review and Case outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unit-of-measure change | Unit conversion tables with change detection. |

**Deliberately not doing**

- Supplier name spelling: resolved by the master.
- Invoice number: identifier not signal.
- Cost-centre manager identity: personal and not a driver.

**How the approach is proven**

Prove it offline on Precision at the review capacity and recall on seeded and confirmed exceptions, Variance-estimate error against resolved cases and Alert acknowledgement rate using time-ordered splits, then online on "Recovered or avoided spend" with "Time to resolve an exception" as the guardrail. Watch for: Comparing unnormalised units, Training on already-resolved cases and Auto-holding suppliers on a score.

## Baseline and production design

- **Baseline (build this first):** A report of invoices above a fixed price or quantity threshold.
- **Production design:** Normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow.

## Why AI, and why this kind

**Why AI.** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it. The evidence that separates good from bad outcomes (Unit-price deviation, Order-frequency change, Supplier-concentration shift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw line prices" are what teams reach for first, and they fail because A case of 100 and a box of 10 look like a price anomaly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unit-price deviation, Order-frequency change, Supplier-concentration shift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A report of invoices above a fixed price or quantity threshold | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovered or avoided spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Comparing unnormalised units.
- Evaluation trap: Training on already-resolved cases.
- Unit-of-measure change: a price jumps tenfold.
- New item: no baseline.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
