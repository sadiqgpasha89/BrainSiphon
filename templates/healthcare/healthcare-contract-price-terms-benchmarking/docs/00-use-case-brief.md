# Healthcare Contract Price & Terms Benchmarking: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-price-terms-benchmarking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Price & Terms Benchmarking · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. The system has to run as a scheduled batch job, inside these limits: Legal and procurement validate comparability and the right to use each benchmark source, Comparisons show cohort definition, sample size and confidence and Prices are normalised for unit, tier, geography and term.

**Why it is hard.** The obvious approach is all contracts for the item, and it fails because mismatched cohorts mislead. The second trap is in "Normalisation": the real signal is unit and term normalised before comparison, while teams usually reach for raw price.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way share of reviews using the benchmark measures it.

**What success looks like.** Offline: Median absolute error of normalised price against held-out contracts, Cohort comparability rating by reviewers and Interval coverage. Online: Savings found from benchmark gaps, Share of reviews using the benchmark and Unfavourable terms renegotiated. The launch is judged on "Savings found from benchmark gaps" while "Share of reviews using the benchmark" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- Legal and procurement validate comparability and the right to use each benchmark source
- Comparisons show cohort definition, sample size and confidence
- Prices are normalised for unit, tier, geography and term
- Extracted terms keep clause provenance
- Runs on 60K contracts quarterly
- No benchmark is shown without its source and licence

## The approach in one paragraph

Start with manual comparison against the group purchasing organisation price file. Then earn the move to clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records, and only if it beats the baseline on Median absolute error of normalised price against held-out contracts and Cohort comparability rating by reviewers after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Normalised price percentile | Position of the price within the comparable cohort. The main benchmark. Guard against: cohort at the contract date. |
| Add Term favourability | Score of payment, liability and termination terms against the cohort. Value beyond price. Guard against: extracted with provenance. |
| Add Cohort size and dispersion | Number of comparables and spread. Sets confidence. Guard against: at analysis time. |
| Run it as one pipeline | Contract and benchmark intake (extracts and licensed files), Term extractor and normaliser (document AI and unit rules), Cohort builder (taxonomy and tier rules), Benchmark model (robust regression with quantiles) and Unfavourable-term flagger (rules), with Legal and procurement review and Report and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle few comparables | Minimum cohort size and a low-confidence label. |

**Deliberately not doing**

- Supplier prestige: not a benchmark.
- Contract negotiation date alone: confounds with market trends.
- Account manager: personal.

**How the approach is proven**

Prove it offline on Median absolute error of normalised price against held-out contracts, Cohort comparability rating by reviewers and Interval coverage using time-ordered splits, then online on "Savings found from benchmark gaps" with "Share of reviews using the benchmark" as the guardrail. Watch for: Comparing unnormalised units, Using unlicensed benchmark data and Reporting medians from tiny cohorts.

## Baseline and production design

- **Baseline (build this first):** Manual comparison against the group purchasing organisation price file.
- **Production design:** Clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records.

## Why AI, and why this kind

**Why AI.** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. The evidence that separates good from bad outcomes (Normalised price percentile, Term favourability, Cohort size and dispersion) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "all contracts for the item" are what teams reach for first, and they fail because mismatched cohorts mislead. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Normalised price percentile, Term favourability, Cohort size and dispersion and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual comparison against the group purchasing organisation price file | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Savings found from benchmark gaps) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Comparing unnormalised units.
- Evaluation trap: Using unlicensed benchmark data.
- Few comparables: the benchmark is unreliable.
- Bundled contracts: prices are not separable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
