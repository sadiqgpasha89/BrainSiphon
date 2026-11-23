# Access Recertification Recommendations: use-case brief

> Generated from the blueprint `it-ops/access-recertification-recommendations` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Access Recertification Recommendations · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping. The system has to run as a scheduled batch job, inside these limits: Reviewers make every decision, High-risk entitlements always shown and Each recommendation shows its evidence.

**Why it is hard.** The obvious approach is approval rates, and it fails because many reviewers approve everything. The second trap is in "Role": the real signal is a recommendation, while teams usually reach for an automatic revoke.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way review completion time measures it.

**What success looks like.** Offline: Agreement with auditor findings, Recommendation precision and Reviewer override rate. Online: Excess access removed, Review completion time and Audit findings. The launch is judged on "Excess access removed" while "Review completion time" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Reviewers make every decision
- High-risk entitlements always shown
- Each recommendation shows its evidence
- Reviews completed in 14 days
- 1M entitlements per cycle

## The approach in one paragraph

Start with spreadsheet-based reviews where managers approve lists, because it is the common process. Then earn the move to a recommendation service that ranks entitlements by risk and usage with peer evidence, supports reviewers in a workflow and tracks revoke outcomes, and only if it beats the baseline on Agreement with auditor findings and Recommendation precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Last used date | Days since the entitlement was used. Core. Guard against: from system logs. |
| Add Peer group coverage | Share of peers holding the access. Core. Guard against: from identity data. |
| Add Entitlement sensitivity | Risk class of the access. Priority. Guard against: from the catalogue. |
| Run it as one pipeline | Entitlement extraction (identity governance), Usage and peer analysis (analytics), Recommendation ranking (learned ranker), Revocation (identity provider) and Outcome tracking (BI), with Reviewer workflow and Quality audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal access | Seasonal usage windows. |

**Deliberately not doing**

- Employee name: personal data.
- Manager name: personal data.
- Entitlement description: weak link.

**How the approach is proven**

Prove it offline on Agreement with auditor findings, Recommendation precision and Reviewer override rate using time-ordered splits, then online on "Excess access removed" with "Review completion time" as the guardrail. Watch for: Approval rates as signals, Automatic revokes and Equal weight for all access.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet-based reviews where managers approve lists, because it is the common process.
- **Production design:** A recommendation service that ranks entitlements by risk and usage with peer evidence, supports reviewers in a workflow and tracks revoke outcomes.

## Why AI, and why this kind

**Why AI.** Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping. The evidence that separates good from bad outcomes (Last used date, Peer group coverage, Entitlement sensitivity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "approval rates" are what teams reach for first, and they fail because many reviewers approve everything. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A recommendation service that ranks entitlements by risk and usage with peer evidence, supports reviewers in a workflow and tracks revoke outcomes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Last used date, Peer group coverage, Entitlement sensitivity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet-based reviews where managers approve lists, because it is the common process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A recommendation service that ranks entitlements by risk and usage with peer evidence, supports reviewers in a workflow and tracks revoke outcomes | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Excess access removed) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Approval rates as signals.
- Evaluation trap: Automatic revokes.
- Seasonal access: people use access once a year.
- New role: the new role has no peer group to compare against.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
