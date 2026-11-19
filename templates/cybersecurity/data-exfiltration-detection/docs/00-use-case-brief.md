# Data Exfiltration Detection: use-case brief

> Generated from the blueprint `cybersecurity/data-exfiltration-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Exfiltration Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers. The system has to run as a scheduled batch job, inside these limits: Encrypted transfers, Cloud SaaS egress and Legitimate bulk transfers.

**Why it is hard.** The obvious approach is static byte thresholds, and it fails because roles have different normal volumes. The second trap is in "Destination": the real signal is new or rare destinations weight, while teams usually reach for total bytes only.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 1.7K at peak, at an estimated $5.5K a month. A mistake is expensive in the way data volume leaked before containment measures it.

**What success looks like.** Offline: Recall of simulated exfil at fixed alerts/day and Precision of top alerts. Online: Mean time to detect exfil and Data volume leaked before containment. The launch is judged on "Mean time to detect exfil" while "Data volume leaked before containment" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma_t | Standard deviation: the model's predicted spread, or uncertainty, around its mean prediction. (one value per time step or token t) |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| x_t | The input features describing one example (what the model sees). (one value per time step or token t) |
| \mu_t | The model's predicted mean (expected value) of the outcome. (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Encrypted transfers
- Cloud SaaS egress
- Legitimate bulk transfers
- Privacy

## The approach in one paragraph

Start with byte threshold alerts per host. Then earn the move to entity baselines with destination graph rarity and sensitive-source weighting, with timeline explanations for analysts, and only if it beats the baseline on Recall of simulated exfil at fixed alerts/day and Precision of top alerts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Volume z-score vs personal baseline | Outbound bytes vs 30-day baseline. Spike. Guard against: window. |
| Add Destination rarity | First-seen external destination. Unknown dropoff. Guard against: graph. |
| Add Sensitive-source ratio | Share of data from sensitive stores. Impact. Guard against: classification. |
| Run it as one pipeline | Egress logs (proxy and cloud audit), Entity baseline model (stream stats), Destination rarity graph (graph store), Exfil scorer (GBDT) and Sensitivity join (DLP tags), with Analyst triage and Case outcomes off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scheduled backup to a new cloud region | Change-management feed and approved destination registry. |

**Deliberately not doing**

- Protocol alone: weak.
- Time zone only: weak.

**How the approach is proven**

Prove it offline on Recall of simulated exfil at fixed alerts/day and Precision of top alerts using time-ordered splits, then online on "Mean time to detect exfil" with "Data volume leaked before containment" as the guardrail. Watch for: Synthetic exfil unlike real incidents and Baselines contaminated by earlier exfil.

## Baseline and production design

- **Baseline (build this first):** Byte threshold alerts per host.
- **Production design:** Entity baselines with destination graph rarity and sensitive-source weighting, with timeline explanations for analysts.

## Why AI, and why this kind

**Why AI.** Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers. The evidence that separates good from bad outcomes (Volume z-score vs personal baseline, Destination rarity, Sensitive-source ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static byte thresholds" are what teams reach for first, and they fail because roles have different normal volumes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Entity baselines with destination graph rarity and sensitive-source weighting, with timeline explanations for analysts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Volume z-score vs personal baseline, Destination rarity, Sensitive-source ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Byte threshold alerts per host | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Entity baselines with destination graph rarity and sensitive-source weighting, with timeline explanations for analysts | chosen | Meets the run-window envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to detect exfil) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic exfil unlike real incidents.
- Evaluation trap: Baselines contaminated by earlier exfil.
- Scheduled backup to a new cloud region: flagged as exfiltration.
- Slow-drip exfiltration over weeks: below thresholds.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
