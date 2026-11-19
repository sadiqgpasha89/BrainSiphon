# Money Mule Account Detection: use-case brief

> Generated from the blueprint `fintech/mule-account-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Money Mule Account Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals. The system has to run as a scheduled batch job, inside these limits: Case disposition within 48h, Customer-friendly account holds and Fair treatment of students and new migrants.

**Why it is hard.** The obvious approach is total monthly volume, and it fails because mules have modest volume with unusual dwell time. The second trap is in "Cohort": the real signal is new-account behaviour in first 14 days, while teams usually reach for long-run history.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 104 at peak, at an estimated $1.8K a month. A mistake is expensive in the way false hold rate measures it.

**What success looks like.** Offline: PR-AUC at fixed review capacity and Detection lead time before cash-out. Online: Mule accounts closed before cash-out and False hold rate. The launch is judged on "Mule accounts closed before cash-out" while "False hold rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphSmoothness}(p,G)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The predicted mule probability of an account. |
| y | The label: 1 if the account is a mule. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphSmoothness} | Penalty when connected accounts get very different mule scores. |
| G | The graph of account transfers. |

**Hard constraints**

- Case disposition within 48h
- Customer-friendly account holds
- Fair treatment of students and new migrants
- Daily scoring

## The approach in one paragraph

Start with rules on inbound-outbound ratio in first 30 days. Then earn the move to bipartite GNN over payer-payee flows with temporal edges plus GBDT on account-level features; scored daily with fast re-score on risky events, and only if it beats the baseline on PR-AUC at fixed review capacity and Detection lead time before cash-out after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Dwell time of funds | Median seconds between credit and debit. Mules pass funds through. Guard against: compute on settled transactions. |
| Add Sender diversity | Distinct unrelated senders to the account in 7 days. Collection point pattern. Guard against: exclude known family/household links. |
| Add Beneficiary fan-out | New payees added in the first 30 days. Cash-out routes. Guard against: count payees before the alert. |
| Run it as one pipeline | Payment event stream (Kafka), Flow feature builder (Flink), Account graph (temporal graph store), Mule scorer (GNN plus GBDT), Hold policy (friction rules) and Confirmed mule labels (bank consortium), with Investigation queue off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle genuine marketplace seller receives many payments | Seller verification feature and merchant-like profile. |

**Deliberately not doing**

- Account balance snapshot: mules keep balance near zero by design.
- Age of customer: weak and risks bias.

**How the approach is proven**

Prove it offline on PR-AUC at fixed review capacity and Detection lead time before cash-out using time-ordered splits, then online on "Mule accounts closed before cash-out" with "False hold rate" as the guardrail. Watch for: Positives only from accounts already investigated and Features computed after the account was closed.

## Baseline and production design

- **Baseline (build this first):** Rules on inbound-outbound ratio in first 30 days.
- **Production design:** Bipartite GNN over payer-payee flows with temporal edges plus GBDT on account-level features; scored daily with fast re-score on risky events.

## Why AI, and why this kind

**Why AI.** Identify accounts used to move proceeds of fraud (mules) before cash-out, using flow shape and onboarding signals. The evidence that separates good from bad outcomes (Dwell time of funds, Sender diversity, Beneficiary fan-out) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total monthly volume" are what teams reach for first, and they fail because mules have modest volume with unusual dwell time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Bipartite GNN over payer-payee flows with temporal edges plus GBDT on account-level features; scored daily with fast re-score on risky events.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Dwell time of funds, Sender diversity, Beneficiary fan-out and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules on inbound-outbound ratio in first 30 days | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bipartite GNN over payer-payee flows with temporal edges plus GBDT on account-level features; scored daily with fast re-score on risky events | chosen | Meets the run-window envelope at $0.0068 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mule accounts closed before cash-out) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positives only from accounts already investigated.
- Evaluation trap: Features computed after the account was closed.
- Genuine marketplace seller receives many payments: flagged as mule.
- Mule accounts rotate after first alert: behavioural drift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
