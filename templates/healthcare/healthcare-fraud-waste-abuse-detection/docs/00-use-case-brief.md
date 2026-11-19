# Healthcare Fraud, Waste & Abuse Detection: use-case brief

> Generated from the blueprint `healthcare/healthcare-fraud-waste-abuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Fraud, Waste & Abuse Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits. The system has to run as a scheduled batch job, inside these limits: Due-process for providers, Audit evidence and Peer-group comparisons.

**Why it is hard.** The obvious approach is absolute billing volume, and it fails because large legitimate practices bill more. The second trap is in "Network": the real signal is referral and billing network structures, while teams usually reach for provider-level features only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.7K a month. A mistake is expensive in the way audit hit rate measures it.

**What success looks like.** Offline: Precision at audit capacity and Recovery per audit hour. Online: Improper payments recovered and Audit hit rate. The launch is judged on "Improper payments recovered" while "Audit hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Due-process for providers
- Audit evidence
- Peer-group comparisons
- Monthly scoring of 1B claim lines

## The approach in one paragraph

Start with statistical outlier reports versus peer averages. Then earn the move to peer-adjusted anomaly scores, GNN over referral networks and a GBDT stacker, with auditor-facing evidence packs, and only if it beats the baseline on Precision at audit capacity and Recovery per audit hour after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around E/M code distribution skew | Share of high-level visit codes vs peers. Upcoding. Guard against: peer baseline per specialty. |
| Add Impossible services per day | Hours of services billed per provider-day. Phantom billing. Guard against: time models per code. |
| Add Referral concentration | Share of referrals to a single entity. Kickback. Guard against: referral graph snapshot. |
| Run it as one pipeline | Claims lake (warehouse), Peer-group builder (clustering), Anomaly features (Spark), Network model (GNN), Risk stacker (GBDT) and Recovery outcomes (audit results), with Audit selection off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new billing guidance changes code norms | Guidance-aware re-baselining and effective-date flags. |

**Deliberately not doing**

- Patient volume alone: size effect.
- Provider age: none.

**How the approach is proven**

Prove it offline on Precision at audit capacity and Recovery per audit hour using time-ordered splits, then online on "Improper payments recovered" with "Audit hit rate" as the guardrail. Watch for: Positives only from audited providers and Time leakage via post-audit data.

## Baseline and production design

- **Baseline (build this first):** Statistical outlier reports versus peer averages.
- **Production design:** Peer-adjusted anomaly scores, GNN over referral networks and a GBDT stacker, with auditor-facing evidence packs.

## Why AI, and why this kind

**Why AI.** Detect upcoding, phantom billing and kickback networks in provider claims to reduce improper payments and focus audits. The evidence that separates good from bad outcomes (E/M code distribution skew, Impossible services per day, Referral concentration) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "absolute billing volume" are what teams reach for first, and they fail because large legitimate practices bill more. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Peer-adjusted anomaly scores, GNN over referral networks and a GBDT stacker, with auditor-facing evidence packs.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among E/M code distribution skew, Impossible services per day, Referral concentration and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Statistical outlier reports versus peer averages | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Peer-adjusted anomaly scores, GNN over referral networks and a GBDT stacker, with auditor-facing evidence packs | chosen | Meets the run-window envelope at $0.372 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Improper payments recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positives only from audited providers.
- Evaluation trap: Time leakage via post-audit data.
- New billing guidance changes code norms: peer baselines shift.
- Specialty mix of small group practice: outlier false flags.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
