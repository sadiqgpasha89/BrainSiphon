# Log Anomaly Detection: use-case brief

> Generated from the blueprint `saas/log-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Log Anomaly Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules. The system has to run in under 100 milliseconds, inside these limits: Billions of lines per day, Log format drift and Low alert noise.

**Why it is hard.** The obvious approach is raw text models, and it fails because raw text is too expensive and noisy. The second trap is in "Drift": the real signal is robust to version-driven template changes, while teams usually reach for static template sets.

**Scale and stakes.** At 10 million users this is about 30000.0M model-touching events a day, 347.2K requests per second on average and 2.1M at peak, at an estimated $16.28M a month. A mistake is expensive in the way alert fatigue measures it.

**What success looks like.** Offline: Detection of injected failures and Precision on incident-linked alerts. Online: Incidents detected via logs first and Alert fatigue. The launch is judged on "Incidents detected via logs first" while "Alert fatigue" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules.

**Training objective.** `\mathcal{L}=-\log p(\text{template sequence})\ \text{(next-template prediction)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \text{template sequence} | The sequence of log message templates (the message pattern with variable parts removed); a rare or unlikely sequence is flagged as an anomaly. |

**Hard constraints**

- Billions of lines per day
- Log format drift
- Low alert noise
- Cost per GB

## The approach in one paragraph

Start with keyword alerts for ERROR logs. Then earn the move to online template mining with streaming novelty and frequency detectors plus a lightweight sequence model per service, and only if it beats the baseline on Detection of injected failures and Precision on incident-linked alerts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around New template appearance | Previously unseen templates. Novel failure. Guard against: template store. |
| Add Template frequency shift | Rate vs baseline. Behaviour change. Guard against: baseline. |
| Add Sequence perplexity | Next-template surprise. Abnormal flow. Guard against: model. |
| Run it as one pipeline | Log stream (collectors), Template miner (Drain), Frequency and novelty detectors (streaming), Sequence model (per-service LSTM), Alert aggregator (dedup) and On-call (human), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily, so the model is trained on the cost of the decision and not on a generic score. |
| Handle deploy introduces many new templates | Deploy-aware grace periods and template aliasing. |

**Deliberately not doing**

- Timestamps in text: parsed out.
- Request IDs: variable.

**How the approach is proven**

Prove it offline on Detection of injected failures and Precision on incident-linked alerts using time-ordered splits, then online on "Incidents detected via logs first" with "Alert fatigue" as the guardrail. Watch for: Logs from one service only and Labels from alert history.

## Baseline and production design

- **Baseline (build this first):** Keyword alerts for ERROR logs.
- **Production design:** Online template mining with streaming novelty and frequency detectors plus a lightweight sequence model per service.

## Why AI, and why this kind

**Why AI.** Detect abnormal log patterns (new error templates, rate shifts) at scale without manual rules. The evidence that separates good from bad outcomes (New template appearance, Template frequency shift, Sequence perplexity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw text models" are what teams reach for first, and they fail because raw text is too expensive and noisy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Online template mining with streaming novelty and frequency detectors plus a lightweight sequence model per service.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among New template appearance, Template frequency shift, Sequence perplexity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword alerts for ERROR logs | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Online template mining with streaming novelty and frequency detectors plus a lightweight sequence model per service | chosen | Meets the 80 ms envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incidents detected via logs first) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Logs from one service only.
- Evaluation trap: Labels from alert history.
- Deploy introduces many new templates: a deploy changes log formats and produces a storm of novelty alerts.
- Log volume spike from debug mode: debug logging left on explodes volume, cost and noise at the same time.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
