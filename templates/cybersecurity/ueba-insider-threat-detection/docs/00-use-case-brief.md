# UEBA: Insider Threat Detection: use-case brief

> Generated from the blueprint `cybersecurity/ueba-insider-threat-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** UEBA: Insider Threat Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts. The system has to run as a scheduled batch job, inside these limits: Privacy and works-council constraints, Explainability for investigators and Peer-group baselines.

**Why it is hard.** The obvious approach is global thresholds, and it fails because roles differ enormously in normal behaviour. The second trap is in "Aggregation": the real signal is risk accumulation over time with decay, while teams usually reach for single-event alerts.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 1.7K at peak, at an estimated $5.5K a month. A mistake is expensive in the way time to detection measures it.

**What success looks like.** Offline: Recall of known insider cases and Precision at investigator capacity. Online: Investigated cases with findings and Time to detection. The launch is judged on "Investigated cases with findings" while "Time to detection" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts.

**Training objective.** `\mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]`

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

**Hard constraints**

- Privacy and works-council constraints
- Explainability for investigators
- Peer-group baselines
- Few true insiders

## The approach in one paragraph

Start with rule-based DLP and access alerts. Then earn the move to personalised baselines (Bayesian) with peer-group models, entity risk accumulation and analyst-facing timeline explanations, and only if it beats the baseline on Recall of known insider cases and Precision at investigator capacity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Peer-relative deviation | Z-score of activity vs peer group. Unusual behaviour. Guard against: peer group definition. |
| Add Sensitive resource first-access | First access to a sensitive repository. Reconnaissance. Guard against: access log as-of. |
| Add Off-hours and volume shift | Change in off-hours activity. Behaviour change. Guard against: personal baseline. |
| Run it as one pipeline | Log ingestion (SIEM), Entity resolver (identity mapping), Baseline models (per-user and peer), Risk accumulator (decayed scores), Ranked entity list (UEBA console) and Investigation outcomes (labels), with HR and security review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reorganisation changes peer groups | Org-change events trigger baseline refresh. |

**Deliberately not doing**

- Employee tenure: fairness risk.
- Job title text: encoded by peer group.

**How the approach is proven**

Prove it offline on Recall of known insider cases and Precision at investigator capacity using time-ordered splits, then online on "Investigated cases with findings" with "Time to detection" as the guardrail. Watch for: Very few true insider labels and Evaluating with synthetic insiders.

## Baseline and production design

- **Baseline (build this first):** Rule-based DLP and access alerts.
- **Production design:** Personalised baselines (Bayesian) with peer-group models, entity risk accumulation and analyst-facing timeline explanations.

## Why AI, and why this kind

**Why AI.** Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts. The evidence that separates good from bad outcomes (Peer-relative deviation, Sensitive resource first-access, Off-hours and volume shift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "global thresholds" are what teams reach for first, and they fail because roles differ enormously in normal behaviour. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Personalised baselines (Bayesian) with peer-group models, entity risk accumulation and analyst-facing timeline explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Peer-relative deviation, Sensitive resource first-access, Off-hours and volume shift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based DLP and access alerts | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Personalised baselines (Bayesian) with peer-group models, entity risk accumulation and analyst-facing timeline explanations | chosen | Meets the run-window envelope at $0.0012 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Investigated cases with findings) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Very few true insider labels.
- Evaluation trap: Evaluating with synthetic insiders.
- Reorganisation changes peer groups: everyone's baseline shifts.
- Legitimate project spike: risk scores jump for an entire team.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
