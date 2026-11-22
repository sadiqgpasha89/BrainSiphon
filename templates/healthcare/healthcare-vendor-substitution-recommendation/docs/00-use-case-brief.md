# Healthcare Vendor Substitution Recommendation: use-case brief

> Generated from the blueprint `healthcare/healthcare-vendor-substitution-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Vendor Substitution Recommendation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. The system has to run as a scheduled batch job, inside these limits: Clinical equivalence is a hard gate from the approved register and never a learned similarity score, Substitution needs clinical, biomedical and procurement approval before use and Rankings show evidence and the approval status of each option.

**Why it is hard.** The obvious approach is embedding similarity, and it fails because similar descriptions can be clinically different. The second trap is in "Hard gate": the real signal is only approved candidates are ranked, while teams usually reach for ranked list of everything similar.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way substitution acceptance rate measures it.

**What success looks like.** Offline: NDCG@3 against approved substitution decisions, Share of recommended items that are approved-equivalent and Hit rate of the accepted option in the top three. Online: Time to resolve a shortage, Substitution acceptance rate and Cost impact of substitutions. The launch is judged on "Time to resolve a shortage" while "Substitution acceptance rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent.

**Training objective.** `\mathcal{L}=-\sum_{(i,j)}\log\frac{e^{s(i,j)/\tau}}{\sum_{k}e^{s(i,k)/\tau}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(i,j)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| e^{s(i,j)/\tau} | Euler's number (about 2.718), the base of the exponential function. |

**Hard constraints**

- Clinical equivalence is a hard gate from the approved register and never a learned similarity score
- Substitution needs clinical, biomedical and procurement approval before use
- Rankings show evidence and the approval status of each option
- Recall data triggers urgent re-ranking
- Serves a worklist for 30K item shortages per year
- Substitution never changes what a clinician orders without approval

## The approach in one paragraph

Start with a buyer searches the catalogue manually for alternatives. Then earn the move to a two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option, and only if it beats the baseline on NDCG@3 against approved substitution decisions and Share of recommended items that are approved-equivalent after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Approved-equivalence status | Status in the clinical equivalence register. Gate for eligibility. Guard against: register version. |
| Add Supply risk of the alternative | Availability and lead time of the candidate. Practical feasibility. Guard against: latest feed. |
| Add Price delta | Candidate price relative to current price after tier and contract. Cost impact. Guard against: contract status. |
| Run it as one pipeline | Shortage or risk event intake (inventory and recall feeds), Equivalence filter (approved register rules), Candidate retriever (item and supplier index), Substitution ranker (gradient-boosted ranking), Evidence and approval status builder (rules), Clinical and procurement approval (human) and Decision and outcome log (lakehouse). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle no approved alternative | Escalate to value analysis with a request for evaluation. |

**Deliberately not doing**

- Brand popularity: not equivalence.
- Catalogue description text: marketing.
- Rep recommendation: commercial interest.

**How the approach is proven**

Prove it offline on NDCG@3 against approved substitution decisions, Share of recommended items that are approved-equivalent and Hit rate of the accepted option in the top three using time-ordered splits, then online on "Time to resolve a shortage" with "Substitution acceptance rate" as the guardrail. Watch for: Using embedding similarity for equivalence, Training on emergency swaps and Recommending unapproved items.

## Baseline and production design

- **Baseline (build this first):** A buyer searches the catalogue manually for alternatives.
- **Production design:** A two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option.

## Why AI, and why this kind

**Why AI.** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. The evidence that separates good from bad outcomes (Approved-equivalence status, Supply risk of the alternative, Price delta) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "embedding similarity" are what teams reach for first, and they fail because similar descriptions can be clinically different. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: A two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Approved-equivalence status, Supply risk of the alternative, Price delta and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A buyer searches the catalogue manually for alternatives | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to resolve a shortage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using embedding similarity for equivalence.
- Evaluation trap: Training on emergency swaps.
- No approved alternative: the list is empty.
- Register out of date: an item is wrongly approved.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
