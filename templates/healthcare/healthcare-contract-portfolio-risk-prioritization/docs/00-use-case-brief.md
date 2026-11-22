# Healthcare Contract Portfolio Risk Prioritization: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-portfolio-risk-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Portfolio Risk Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. The system has to run as a scheduled batch job, inside these limits: Risk owners set weights and approve escalations, Scores are explainable by dimension with evidence and Graph relationships show shared-supplier and dependency exposure.

**Why it is hard.** The obvious approach is one opaque score, and it fails because different owners act on different dimensions. The second trap is in "Dependencies": the real signal is shared-supplier and service dependency graph, while teams usually reach for contract-by-contract view.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.6K a month. A mistake is expensive in the way risk reduced after remediation measures it.

**What success looks like.** Offline: Precision at the review capacity for high-exposure agreements, Rank stability under weight changes and Calibration of risk tiers against realised incidents. Online: High-exposure agreements reviewed, Risk reduced after remediation and Time from flag to action. The launch is judged on "High-exposure agreements reviewed" while "Risk reduced after remediation" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most.

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

- Risk owners set weights and approve escalations
- Scores are explainable by dimension with evidence
- Graph relationships show shared-supplier and dependency exposure
- Scenario analysis states its assumptions
- Scores 30K agreements weekly
- Weights and criteria are versioned

## The approach in one paragraph

Start with ranking by contract value and expiry date. Then earn the move to a transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension, and only if it beats the baseline on Precision at the review capacity for high-exposure agreements and Rank stability under weight changes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dimension exposure scores | Normalised exposure for each risk dimension from verified inputs. The core components. Guard against: input snapshots. |
| Add Dependency concentration | Number of critical services depending on one supplier. Continuity risk. Guard against: graph at scoring time. |
| Add Open obligations and incidents | Overdue obligations and recent incidents linked to the contract. Operational risk. Guard against: earlier periods. |
| Run it as one pipeline | Contract and risk intake (warehouse extracts), Dimension score builder (normalised metrics), Dependency graph builder (graph store), Portfolio risk scorer (weighted scoring with gradient boosting) and Scenario engine (what-if simulator), with Risk owner review and Decision and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing data for a dimension | Show missing data and a lower-confidence label. |

**Deliberately not doing**

- Contract title: not risk.
- Counterparty size alone: not exposure.
- Owner seniority: not risk.

**How the approach is proven**

Prove it offline on Precision at the review capacity for high-exposure agreements, Rank stability under weight changes and Calibration of risk tiers against realised incidents using time-ordered splits, then online on "High-exposure agreements reviewed" with "Risk reduced after remediation" as the guardrail. Watch for: Hiding weights from owners, Ignoring shared-supplier concentration and Scoring contracts as independent.

## Baseline and production design

- **Baseline (build this first):** Ranking by contract value and expiry date.
- **Production design:** A transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension.

## Why AI, and why this kind

**Why AI.** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. The evidence that separates good from bad outcomes (Dimension exposure scores, Dependency concentration, Open obligations and incidents) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one opaque score" are what teams reach for first, and they fail because different owners act on different dimensions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dimension exposure scores, Dependency concentration, Open obligations and incidents and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ranking by contract value and expiry date | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension | chosen | Meets the run-window envelope at $0.181 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (High-exposure agreements reviewed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Hiding weights from owners.
- Evaluation trap: Ignoring shared-supplier concentration.
- Missing data for a dimension: the score is understated.
- Supplier failure: multiple contracts are affected.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
