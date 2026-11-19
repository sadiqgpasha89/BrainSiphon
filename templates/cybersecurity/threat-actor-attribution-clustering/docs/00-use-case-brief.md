# Threat Actor Attribution & Campaign Clustering: use-case brief

> Generated from the blueprint `cybersecurity/threat-actor-attribution-clustering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Threat Actor Attribution & Campaign Clustering · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels. The system has to run as a scheduled batch job, inside these limits: Evidence-based confidence statements, False-flag awareness and Analyst review.

**Why it is hard.** The obvious approach is single-indicator attribution, and it fails because single indicators are often shared or planted. The second trap is in "Confidence": the real signal is graded confidence with alternative hypotheses, while teams usually reach for one-name attribution.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way attribution reviews with revised outcomes measures it.

**What success looks like.** Offline: Cluster purity on analyst-vetted campaigns and Calibration of confidence labels. Online: Analyst time saved and Attribution reviews with revised outcomes. The launch is judged on "Analyst time saved" while "Attribution reviews with revised outcomes" must not get worse.

## Objective, loss and constraints

**Business objective.** Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels.

**Training objective.** `\mathcal{L}=\mathrm{Contrastive}(\text{same campaign})+\lambda\,\mathrm{ClusterCompactness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |
| \text{same campaign} | The pairing label: 1 if two incidents belong to the same attacker campaign, 0 if not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClusterCompactness} | Penalty that keeps incidents of one campaign tightly grouped in embedding space. |

**Hard constraints**

- Evidence-based confidence statements
- False-flag awareness
- Analyst review
- Slow-changing ground truth

## The approach in one paragraph

Start with manual analyst clustering in spreadsheets. Then earn the move to heterogeneous evidence graph with learned edge weights, constrained clustering and confidence-graded analyst workflow, and only if it beats the baseline on Cluster purity on analyst-vetted campaigns and Calibration of confidence labels after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Infrastructure overlap | Shared IPs, certificates and registrants. Campaign link. Guard against: time-bounded. |
| Add Code and tooling similarity | Binary and script similarity. Toolset reuse. Guard against: library reuse. |
| Add TTP sequence similarity | ATT&CK technique ordering. Behaviour. Guard against: mapping. |
| Run it as one pipeline | Incident and CTI data (platform), Evidence extraction (parsers), Evidence graph (property graph), Link scorer (GBDT) and Constrained clustering (community detection), with Analyst assessment and Peer review off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shared offensive tooling across unrelated actors | Tool-sharing priors and discounting of common frameworks. |

**Deliberately not doing**

- Language strings in malware: easily planted.
- Compile timestamps: forgeable.

**How the approach is proven**

Prove it offline on Cluster purity on analyst-vetted campaigns and Calibration of confidence labels using time-ordered splits, then online on "Analyst time saved" with "Attribution reviews with revised outcomes" as the guardrail. Watch for: Ground truth is analyst opinion and Ignoring deception.

## Baseline and production design

- **Baseline (build this first):** Manual analyst clustering in spreadsheets.
- **Production design:** Heterogeneous evidence graph with learned edge weights, constrained clustering and confidence-graded analyst workflow.

## Why AI, and why this kind

**Why AI.** Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels. The evidence that separates good from bad outcomes (Infrastructure overlap, Code and tooling similarity, TTP sequence similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single-indicator attribution" are what teams reach for first, and they fail because single indicators are often shared or planted. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Heterogeneous evidence graph with learned edge weights, constrained clustering and confidence-graded analyst workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Infrastructure overlap, Code and tooling similarity, TTP sequence similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual analyst clustering in spreadsheets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Heterogeneous evidence graph with learned edge weights, constrained clustering and confidence-graded analyst workflow | chosen | Meets the run-window envelope at $2.07 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ground truth is analyst opinion.
- Evaluation trap: Ignoring deception.
- Shared offensive tooling across unrelated actors: shared offensive tooling merges unrelated actors into one cluster and creates a false attribution.
- False-flag artefacts: wrong attribution.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
