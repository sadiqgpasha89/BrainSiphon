# Payment & Ledger Reconciliation Matching: use-case brief

> Generated from the blueprint `fintech/reconciliation-matching-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment & Ledger Reconciliation Matching · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions. The system has to run as a scheduled batch job, inside these limits: Auditable matches, Day-end close deadline and Handle one-to-many and many-to-many.

**Why it is hard.** The obvious approach is all-pairs comparison, and it fails because n-squared comparison cannot finish before close. The second trap is in "Groups": the real signal is many-to-many subset-sum matching with tolerance, while teams usually reach for strict one-to-one amount equality.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $2.2K a month. A mistake is expensive in the way manual touches per 1000 entries measures it.

**What success looks like.** Offline: Auto-match precision at 98% recall and Group match accuracy. Online: Days to close and Manual touches per 1000 entries. The launch is judged on "Days to close" while "Manual touches per 1000 entries" must not get worse.

## Objective, loss and constraints

**Business objective.** Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{ManyToManyConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ManyToManyConsistency} | Penalty when matches are inconsistent in many-to-many cases, such as one payment covering several invoices that are not all matched. |

**Hard constraints**

- Auditable matches
- Day-end close deadline
- Handle one-to-many and many-to-many
- Tolerate rounding and FX

## The approach in one paragraph

Start with deterministic rules on amount and reference equality. Then earn the move to blocking, GBDT pair scorer, subset-sum solver for groups, and an active-learning loop from accountant corrections, and only if it beats the baseline on Auto-match precision at 98% recall and Group match accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Amount delta within tolerance | Absolute and relative difference net of fees. Primary match feature. Guard against: fee tables as-of settlement date. |
| Add Reference token overlap | Normalised reference and narrative token similarity. Human-visible link. Guard against: strip bank-injected prefixes. |
| Add Date proximity | Value date vs booking date gap. Timing alignment. Guard against: business-day calendars per currency. |
| Run it as one pipeline | Source ingestion (SFTP and APIs), Normaliser (schema mapping), Candidate blocking (key buckets), Pair scorer (GBDT) and Group matcher (subset-sum solver), with Exception queue and Correction feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cut-off timing differences at month-end | Period-boundary aware matching windows. |

**Deliberately not doing**

- Free-text customer notes: rarely consistent between systems.
- Entry sequence number: arbitrary and system-specific.

**How the approach is proven**

Prove it offline on Auto-match precision at 98% recall and Group match accuracy using time-ordered splits, then online on "Days to close" with "Manual touches per 1000 entries" as the guardrail. Watch for: Training on already-reconciled easy matches and Evaluating on one bank format.

## Baseline and production design

- **Baseline (build this first):** Deterministic rules on amount and reference equality.
- **Production design:** Blocking, GBDT pair scorer, subset-sum solver for groups, and an active-learning loop from accountant corrections.

## Why AI, and why this kind

**Why AI.** Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions. The evidence that separates good from bad outcomes (Amount delta within tolerance, Reference token overlap, Date proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "all-pairs comparison" are what teams reach for first, and they fail because N-squared comparison cannot finish before close. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Blocking, GBDT pair scorer, subset-sum solver for groups, and an active-learning loop from accountant corrections.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Amount delta within tolerance, Reference token overlap, Date proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Deterministic rules on amount and reference equality | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Blocking, GBDT pair scorer, subset-sum solver for groups, and an active-learning loop from accountant corrections | chosen | Meets the run-window envelope at $0.012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Days to close) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on already-reconciled easy matches.
- Evaluation trap: Evaluating on one bank format.
- Cut-off timing differences at month-end: many items unmatched.
- Duplicate provider files: double-counted settlements.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
