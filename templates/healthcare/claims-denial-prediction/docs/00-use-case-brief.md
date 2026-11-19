# Claims Denial Prediction & Prevention: use-case brief

> Generated from the blueprint `healthcare/claims-denial-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Claims Denial Prediction & Prevention · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate. The system has to run as a scheduled batch job, inside these limits: Payer-specific rules, Explainable edits for billers and Daily claim volume.

**Why it is hard.** The obvious approach is binary denial flag, and it fails because different reasons need different fixes. The second trap is in "Payer": the real signal is payer-specific models or interactions, while teams usually reach for one global model.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.7K a month. A mistake is expensive in the way denial write-offs measures it.

**What success looks like.** Offline: AUC by payer and Precision of top-fix suggestions. Online: Clean claim rate and Denial write-offs. The launch is judged on "Clean claim rate" while "Denial write-offs" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{claim value})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{claim value} | The money value of the claim; w grows with it. |

**Hard constraints**

- Payer-specific rules
- Explainable edits for billers
- Daily claim volume
- Real-time pre-submission checks

## The approach in one paragraph

Start with claim scrubber rules. Then earn the move to reason-aware GBDT per payer cluster with SHAP-based fix suggestions and an edit-prioritisation queue, and only if it beats the baseline on AUC by payer and Precision of top-fix suggestions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payer-code historical denial rate | Denial rate for payer and procedure code. Payer behaviour. Guard against: matured claims. |
| Add Eligibility verification state | Eligibility check result recency. Common denial. Guard against: verified before submission. |
| Add Documentation completeness | Required attachments present. Rule compliance. Guard against: checklist. |
| Run it as one pipeline | Claim draft (billing system), Scrubber rules (pre-checks), Denial model (LightGBM per payer), Fix recommender (SHAP and rules), Biller worklist (human) and Submission gateway (clearinghouse), with Remittance feedback off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle payer silently changes policy | Payer-change detector on remittance patterns. |

**Deliberately not doing**

- Biller ID: personal habits.
- Claim line order: none.

**How the approach is proven**

Prove it offline on AUC by payer and Precision of top-fix suggestions using time-ordered splits, then online on "Clean claim rate" with "Denial write-offs" as the guardrail. Watch for: Mature labels only after 60 days and Training across payers with changed rules.

## Baseline and production design

- **Baseline (build this first):** Claim scrubber rules.
- **Production design:** Reason-aware GBDT per payer cluster with SHAP-based fix suggestions and an edit-prioritisation queue.

## Why AI, and why this kind

**Why AI.** Predict which claims will be denied before submission and fix root causes (coding, eligibility, documentation) to raise clean-claim rate. The evidence that separates good from bad outcomes (Payer-code historical denial rate, Eligibility verification state, Documentation completeness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "binary denial flag" are what teams reach for first, and they fail because different reasons need different fixes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Reason-aware GBDT per payer cluster with SHAP-based fix suggestions and an edit-prioritisation queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payer-code historical denial rate, Eligibility verification state, Documentation completeness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Claim scrubber rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Reason-aware GBDT per payer cluster with SHAP-based fix suggestions and an edit-prioritisation queue | chosen | Meets the run-window envelope at $0.188 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Clean claim rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Mature labels only after 60 days.
- Evaluation trap: Training across payers with changed rules.
- Payer silently changes policy: model overpredicts denials.
- Underpayments not recorded as denials: partial payments are labelled as accepted so the model never learns underpayment patterns.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
