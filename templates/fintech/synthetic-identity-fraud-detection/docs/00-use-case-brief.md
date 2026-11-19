# Synthetic Identity Fraud Detection: use-case brief

> Generated from the blueprint `fintech/synthetic-identity-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Synthetic Identity Fraud Detection · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines. The system has to run in under 100 milliseconds, inside these limits: Decision within 80 ms at application, FCRA adverse-action reasons and Consortium data usage limits.

**Why it is hard.** The obvious approach is single-application attribute plausibility, and it fails because each synthetic looks plausible alone, the cluster is the tell. The second trap is in "Time": the real signal is credit-file age versus claimed age and tradeline seeding patterns, while teams usually reach for bureau score level.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $3.6K a month. A mistake is expensive in the way thin-file approval rate measures it.

**What success looks like.** Offline: PR-AUC at fixed review rate and Detection rate by identity cluster. Online: Bust-out loss per originated dollar and Thin-file approval rate. The launch is judged on "Bust-out loss per originated dollar" while "Thin-file approval rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{focal}}+\lambda\sum_{(u,v)\in E}\|z_u-z_v\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{focal}} | Focal loss on whether an identity is synthetic. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \sum_{(u,v)\in E} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| z_u | The learned embedding of a node (identity): z_u for identity u. |

**Hard constraints**

- Decision within 80 ms at application
- FCRA adverse-action reasons
- Consortium data usage limits
- Low false-reject for thin-file genuine applicants

## The approach in one paragraph

Start with rules over attribute-sharing counts and bureau-file-age mismatches. Then earn the move to application-time GNN over an identity-attribute bipartite graph plus GBDT on tabular features; scores cached by identity cluster, and only if it beats the baseline on PR-AUC at fixed review rate and Detection rate by identity cluster after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Attribute sharing degree | Number of distinct applicants sharing each identity attribute. Rings reuse components. Guard against: count only applicants before the current one. |
| Add Identity age mismatch | Claimed DOB age minus credit-file age. Fresh files on adult identities. Guard against: needs file-open date from bureau as-of time. |
| Add Email and phone tenure | First-seen date of the contact point in a data consortium. Real people have long-lived contacts. Guard against: consortium lookback must not include future sightings. |
| Run it as one pipeline | Application gateway (API), Identity attribute lookup (graph store), Cluster embedding (GraphSAGE inference), Risk scorer (LightGBM), Decision engine (policy rules) and Bust-out labels (charge-off feed), with Manual review off the critical path. |
| Optimise the right thing | The objective weighs focal loss on whether an identity is synthetic, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate family sharing address and phone | Household detection and relationship-type edge weights. |

**Deliberately not doing**

- Credit score at application: gameable via authorised-user tradelines.
- Applicant income stated: self-reported and unverified.

**How the approach is proven**

Prove it offline on PR-AUC at fixed review rate and Detection rate by identity cluster using time-ordered splits, then online on "Bust-out loss per originated dollar" with "Thin-file approval rate" as the guardrail. Watch for: Cluster members split across train and test leak the ring and Labels only from charged-off accounts miss undetected synthetics.

## Baseline and production design

- **Baseline (build this first):** Rules over attribute-sharing counts and bureau-file-age mismatches.
- **Production design:** Application-time GNN over an identity-attribute bipartite graph plus GBDT on tabular features; scores cached by identity cluster.

## Why AI, and why this kind

**Why AI.** Catch fabricated identities built from real and fake attributes at application time, before they bust out on credit lines. The evidence that separates good from bad outcomes (Attribute sharing degree, Identity age mismatch, Email and phone tenure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single-application attribute plausibility" are what teams reach for first, and they fail because each synthetic looks plausible alone, the cluster is the tell. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Application-time GNN over an identity-attribute bipartite graph plus GBDT on tabular features; scores cached by identity cluster.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Attribute sharing degree, Identity age mismatch, Email and phone tenure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules over attribute-sharing counts and bureau-file-age mismatches | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Application-time GNN over an identity-attribute bipartite graph plus GBDT on tabular features; scores cached by identity cluster | chosen | Meets the 80 ms envelope at $0.135 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bust-out loss per originated dollar) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Cluster members split across train and test leak the ring.
- Evaluation trap: Labels only from charged-off accounts miss undetected synthetics.
- Legitimate family sharing address and phone: cluster looks like a ring.
- Labels arrive 12-24 months late: model trains on stale fraud patterns.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
