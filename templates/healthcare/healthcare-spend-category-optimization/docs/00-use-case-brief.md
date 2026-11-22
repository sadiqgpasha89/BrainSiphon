# Healthcare Spend Category Optimization: use-case brief

> Generated from the blueprint `healthcare/healthcare-spend-category-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Spend Category Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. The system has to run as a scheduled batch job, inside these limits: Clinical value analysis approves substitutions and standardisation and the model only proposes hypotheses, Clinical equivalence and availability are hard constraints and Savings are ranges with stated confidence and not commitments.

**Why it is hard.** The obvious approach is similarity of descriptions, and it fails because similar words do not mean clinical equivalence. The second trap is in "Savings": the real signal is range net of switching cost and risk, while teams usually reach for gross price difference.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way standardisation rate measures it.

**What success looks like.** Offline: Savings realised versus predicted savings range, Constraint violations in proposed plans and Hypothesis hit rate. Online: Realised savings net of switching cost, Standardisation rate and Clinician acceptance of proposals. The launch is judged on "Realised savings net of switching cost" while "Standardisation rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership.

**Training objective.** `\max\;\sum_g x_g\,(\text{saving}_g-\text{switch cost}_g)\quad\text{s.t. clinical equivalence, supply and capacity limits}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_g | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| x_g | Whether item group g is moved: 1 if the proposal is selected and 0 if it is not. |
| \text{saving}_g | The estimated annual saving from moving item group g to the proposed supplier or item, before switching costs. |
| \text{switch cost}_g | The one-off cost of switching item group g: re-contracting, clinical trials, training and inventory write-off. |

**Hard constraints**

- Clinical value analysis approves substitutions and standardisation and the model only proposes hypotheses
- Clinical equivalence and availability are hard constraints
- Savings are ranges with stated confidence and not commitments
- Switching and implementation costs are included
- Uses only licensed benchmark data
- Covers 60K item groups across 250 categories

## The approach in one paragraph

Start with annual top-spend category review with manual price comparison. Then earn the move to spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost, and only if it beats the baseline on Savings realised versus predicted savings range and Constraint violations in proposed plans after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Price dispersion | Spread of unit price for equivalent items across facilities. A savings signal. Guard against: after normalisation. |
| Add Volume concentration | Share of spend in few suppliers. Leverage and risk. Guard against: spend as at period end. |
| Add Standardisation gap | Number of equivalent items used in a category. Complexity and cost. Guard against: clinical approvals. |
| Run it as one pipeline | Spend and taxonomy intake (warehouse extracts), Spend segmentation (clustering and taxonomy rules), Price benchmarking (normalised unit prices), Category allocation optimizer (mixed-integer program) and Clinical equivalence and supply rules (approved equivalence table), with Value analysis review and Savings tracking and audit off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle taxonomy errors | Taxonomy validation and a review loop. |

**Deliberately not doing**

- Price list discounts not applied in practice: inflates savings.
- Brand preference alone: not clinical.
- Supplier relationship tenure: not a savings driver.

**How the approach is proven**

Prove it offline on Savings realised versus predicted savings range, Constraint violations in proposed plans and Hypothesis hit rate using time-ordered splits, then online on "Realised savings net of switching cost" with "Standardisation rate" as the guardrail. Watch for: Counting gross savings, Treating description similarity as equivalence and Ignoring supply risk.

## Baseline and production design

- **Baseline (build this first):** Annual top-spend category review with manual price comparison.
- **Production design:** Spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost.

## Why AI, and why this kind

**Why AI.** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. The evidence that separates good from bad outcomes (Price dispersion, Volume concentration, Standardisation gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "similarity of descriptions" are what teams reach for first, and they fail because similar words do not mean clinical equivalence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Price dispersion, Volume concentration, Standardisation gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual top-spend category review with manual price comparison | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Realised savings net of switching cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting gross savings.
- Evaluation trap: Treating description similarity as equivalence.
- Taxonomy errors: items land in the wrong category.
- Shortage of the preferred product: the plan is infeasible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
