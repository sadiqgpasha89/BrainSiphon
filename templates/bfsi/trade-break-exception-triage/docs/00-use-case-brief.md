# Trade Break & Reconciliation Exception Triage: use-case brief

> Generated from the blueprint `bfsi/trade-break-exception-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Trade Break & Reconciliation Exception Triage · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix. The system has to run interactively, within a few seconds, inside these limits: Auto-resolve only breaks with a reversible fix, Four-eyes check on any ledger change and Break ageing targets by type.

**Why it is hard.** The obvious approach is break amount only, and it fails because amount does not tell who must act. The second trap is in "Auto-fix": the real signal is safe, reversible resolutions, while teams usually reach for auto-fix by confidence.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $12.7K a month. A mistake is expensive in the way operator touches per break measures it.

**What success looks like.** Offline: Cause accuracy and Safe auto-fix precision. Online: Breaks aged beyond SLA and Operator touches per break. The launch is judged on "Breaks aged beyond SLA" while "Operator touches per break" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{auto}})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Auto-resolve only breaks with a reversible fix
- Four-eyes check on any ledger change
- Break ageing targets by type
- Full audit trail

## The approach in one paragraph

Start with rule-based matching with manual assignment, because it is the current practice. Then earn the move to a multi-class cause classifier on mismatch patterns with next-action suggestions, a safe auto-resolution policy and a prioritised worklist, and only if it beats the baseline on Cause accuracy and Safe auto-fix precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field mismatch pattern | Which fields differ between sides. Identifies cause. Guard against: needs normalisation. |
| Add Counterparty history | Past break types for the counterparty. Predicts cause. Guard against: changes with systems. |
| Add Amount and tolerance | Difference relative to tolerance. Rounding vs real. Guard against: currency conversions. |
| Run it as one pipeline | Reconciliation engine (matching platform), Break feature builder (stream processor), Cause classifier (gradient boosting), Action recommender (rules and ranker), Worklist (operations tool), Four-eyes approval (workflow) and Outcome log (warehouse). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle systemic mismatch | Cluster detection and one root-cause ticket. |

**Deliberately not doing**

- Operator initials: irrelevant.
- Break ID: arbitrary.
- Free-text comments: inconsistent.

**How the approach is proven**

Prove it offline on Cause accuracy and Safe auto-fix precision using time-ordered splits, then online on "Breaks aged beyond SLA" with "Operator touches per break" as the guardrail. Watch for: Labels from past manual assignment and Auto-fix feedback loop hides errors.

## Baseline and production design

- **Baseline (build this first):** Rule-based matching with manual assignment, because it is the current practice.
- **Production design:** A multi-class cause classifier on mismatch patterns with next-action suggestions, a safe auto-resolution policy and a prioritised worklist.

## Why AI, and why this kind

**Why AI.** Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix. The evidence that separates good from bad outcomes (Field mismatch pattern, Counterparty history, Amount and tolerance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "break amount only" are what teams reach for first, and they fail because amount does not tell who must act. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A multi-class cause classifier on mismatch patterns with next-action suggestions, a safe auto-resolution policy and a prioritised worklist.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field mismatch pattern, Counterparty history, Amount and tolerance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based matching with manual assignment, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-class cause classifier on mismatch patterns with next-action suggestions, a safe auto-resolution policy and a prioritised worklist | chosen | Meets the 2500 ms envelope at $0.070 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Breaks aged beyond SLA) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels from past manual assignment.
- Evaluation trap: Auto-fix feedback loop hides errors.
- Systemic mismatch: a static data error creates thousands of breaks.
- Late counterparty confirmation: a break closes by itself when the counterparty confirms late and the team has already chased it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
