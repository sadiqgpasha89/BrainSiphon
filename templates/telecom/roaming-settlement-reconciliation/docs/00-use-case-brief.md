# Roaming Settlement Reconciliation: use-case brief

> Generated from the blueprint `telecom/roaming-settlement-reconciliation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Roaming Settlement Reconciliation · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate. The system has to run as a scheduled batch job, inside these limits: Matching on record keys and tolerances agreed in partner contracts, Disputes backed by records and Currency and tax rules applied correctly.

**Why it is hard.** The obvious approach is fuzzy matching only, and it fails because settlement needs rule-based proof. The second trap is in "Exceptions": the real signal is ranked mismatch reasons, while teams usually reach for a raw difference total.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way days to close a period measures it.

**What success looks like.** Offline: Match rate against audited reconciliations, Dispute win rate and Value of mismatches found. Online: Settlement variance, Days to close a period and Disputed amount recovered. The launch is judged on "Settlement variance" while "Days to close a period" must not get worse.

## Objective, loss and constraints

**Business objective.** Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Matching on record keys and tolerances agreed in partner contracts
- Disputes backed by records
- Currency and tax rules applied correctly
- Monthly run over 2B records

## The approach in one paragraph

Start with exact-key matching with a fixed tolerance on duration and amount, because it follows the contract. Then earn the move to rule-based matching plus a model that proposes matches for broken keys and ranks mismatch reasons by value, with a dispute pack generator and partner-specific tolerances, and only if it beats the baseline on Match rate against audited reconciliations and Dispute win rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Unmatched record share | Share of records without a partner match by partner. Dispute signal. Guard against: per period. |
| Add Rate and tax mismatch | Difference between the billed and contract rate. Pricing disputes. Guard against: contract table needed. |
| Add Duplicate record flag | Repeated record keys. Double billing. Guard against: needs the record key. |
| Run it as one pipeline | Usage file ingestion (clearing house feeds), Exact matching (batch SQL), Near-match proposal (gradient boosting), Mismatch classification (rules and model), Dispute pack (report generator) and Partner submission (clearing API), with Finance review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle currency conversion differences | Use contract rates and record the source. |

**Deliberately not doing**

- Subscriber name: irrelevant and private.
- File name: an artefact.
- Region alone: weak link.

**How the approach is proven**

Prove it offline on Match rate against audited reconciliations, Dispute win rate and Value of mismatches found using time-ordered splits, then online on "Settlement variance" with "Days to close a period" as the guardrail. Watch for: Fuzzy matching without contract rules, Cut-off by file date and Ignoring partner behaviour.

## Baseline and production design

- **Baseline (build this first):** Exact-key matching with a fixed tolerance on duration and amount, because it follows the contract.
- **Production design:** Rule-based matching plus a model that proposes matches for broken keys and ranks mismatch reasons by value, with a dispute pack generator and partner-specific tolerances.

## Why AI, and why this kind

**Why AI.** Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate. The evidence that separates good from bad outcomes (Unmatched record share, Rate and tax mismatch, Duplicate record flag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fuzzy matching only" are what teams reach for first, and they fail because settlement needs rule-based proof. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Rule-based matching plus a model that proposes matches for broken keys and ranks mismatch reasons by value, with a dispute pack generator and partner-specific tolerances.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Unmatched record share, Rate and tax mismatch, Duplicate record flag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact-key matching with a fixed tolerance on duration and amount, because it follows the contract | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Rule-based matching plus a model that proposes matches for broken keys and ranks mismatch reasons by value, with a dispute pack generator and partner-specific tolerances | chosen | Meets the run-window envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Settlement variance) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fuzzy matching without contract rules.
- Evaluation trap: Cut-off by file date.
- Currency conversion differences: totals differ by rate source.
- Duplicate files: the same file arrives twice.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
