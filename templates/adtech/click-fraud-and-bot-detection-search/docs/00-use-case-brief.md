# Click Fraud Detection for Search Ads: use-case brief

> Generated from the blueprint `adtech/click-fraud-and-bot-detection-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Click Fraud Detection for Search Ads · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust. The system has to run in under 100 milliseconds, inside these limits: Real-time filtering within billing, Appeals and Low false positives for genuine users.

**Why it is hard.** The obvious approach is click count per IP, and it fails because click farms rotate IPs. The second trap is in "Value": the real signal is weight by cost per click, while teams usually reach for equal weighting.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.7K a month. A mistake is expensive in the way advertiser complaint rate measures it.

**What success looks like.** Offline: Precision at fixed recall of confirmed fraud and Spend saved. Online: Filtered spend share and Advertiser complaint rate. The launch is judged on "Filtered spend share" while "Advertiser complaint rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{CPC})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{CPC} | Cost per click, the price an advertiser pays for a click; w(CPC) makes expensive clicks count more in the loss. |

**Hard constraints**

- Real-time filtering within billing
- Appeals
- Low false positives for genuine users
- Advertiser reporting

## The approach in one paragraph

Start with iP-based click-count rules. Then earn the move to session-level model with post-click features and network-level clustering, plus advertiser-specific thresholds, and only if it beats the baseline on Precision at fixed recall of confirmed fraud and Spend saved after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Post-click dwell and bounce | Seconds on landing page. Intent. Guard against: consent. |
| Add Advertiser-competitor click pattern | Repeated clicks from rivals' networks. Malicious. Guard against: known competitors. |
| Add Session-level click sequence | Click timing patterns. Automation. Guard against: window. |
| Run it as one pipeline | Click stream (ad server), Session builder (Flink), Click-fraud model (GBDT), Network cluster detector (graph), Billing filter (refund logic) and Investigation (human), with Advertiser report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mobile carrier NAT aggregates many users | Device-level and session-level features instead of IP-only. |

**Deliberately not doing**

- Query text: not fraud signal.
- Advertiser industry: none.

**How the approach is proven**

Prove it offline on Precision at fixed recall of confirmed fraud and Spend saved using time-ordered splits, then online on "Filtered spend share" with "Advertiser complaint rate" as the guardrail. Watch for: Confirmed fraud sample biased to obvious cases and Features computed after billing.

## Baseline and production design

- **Baseline (build this first):** IP-based click-count rules.
- **Production design:** Session-level model with post-click features and network-level clustering, plus advertiser-specific thresholds.

## Why AI, and why this kind

**Why AI.** Detect competitor clicking and click farms on paid search to protect advertisers' budgets and keep trust. The evidence that separates good from bad outcomes (Post-click dwell and bounce, Advertiser-competitor click pattern, Session-level click sequence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "click count per IP" are what teams reach for first, and they fail because click farms rotate IPs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Session-level model with post-click features and network-level clustering, plus advertiser-specific thresholds.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Post-click dwell and bounce, Advertiser-competitor click pattern, Session-level click sequence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: IP-based click-count rules | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Session-level model with post-click features and network-level clustering, plus advertiser-specific thresholds | chosen | Meets the 80 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Filtered spend share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Confirmed fraud sample biased to obvious cases.
- Evaluation trap: Features computed after billing.
- Mobile carrier NAT aggregates many users: iP-based false positives.
- Advertisers dispute filtered clicks: advertisers dispute why clicks were filtered, eroding trust without clear evidence.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
