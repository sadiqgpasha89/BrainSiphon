# API Abuse & Bot Detection: use-case brief

> Generated from the blueprint `cybersecurity/api-abuse-and-bot-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Abuse & Bot Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. The system has to run in under 100 milliseconds, inside these limits: Sub-20 ms decisions, Partner integrations must not break and Adaptive attackers.

**Why it is hard.** The obvious approach is per-IP rate limits, and it fails because botnets rotate IPs. The second trap is in "Business logic": the real signal is endpoint-flow anomalies (skipping steps), while teams usually reach for volume only.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $4.3K a month. A mistake is expensive in the way legitimate user friction measures it.

**What success looks like.** Offline: Detection rate at fixed false-block rate and Challenge success for humans. Online: Scraped records per day and Legitimate user friction. The launch is judged on "Scraped records per day" while "Legitimate user friction" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Sub-20 ms decisions
- Partner integrations must not break
- Adaptive attackers
- Privacy-safe fingerprints

## The approach in one paragraph

Start with rate limits per IP and API key. Then earn the move to streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk, and only if it beats the baseline on Detection rate at fixed false-block rate and Challenge success for humans after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Endpoint sequence entropy | Entropy of API-call sequences. Automation. Guard against: session windows. |
| Add Request timing regularity | Variance of inter-request times. Scripted. Guard against: window. |
| Add Enumeration pattern | Sequential ID access. Scraping. Guard against: pattern. |
| Run it as one pipeline | API gateway (Envoy), Session and key aggregator (Flink), Bot model (GBDT), Risk policy (throttle or challenge), Partner allow-list (registry) and Confirmed abuse (labels), with Abuse analyst off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle large legitimate partner bursts | Partner baselines and contractual rate profiles. |

**Deliberately not doing**

- IP address alone: rotates.
- User-agent: spoofed.

**How the approach is proven**

Prove it offline on Detection rate at fixed false-block rate and Challenge success for humans using time-ordered splits, then online on "Scraped records per day" with "Legitimate user friction" as the guardrail. Watch for: Labels only from detected bots and Bot behaviours simulated naively.

## Baseline and production design

- **Baseline (build this first):** Rate limits per IP and API key.
- **Production design:** Streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk.

## Why AI, and why this kind

**Why AI.** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. The evidence that separates good from bad outcomes (Endpoint sequence entropy, Request timing regularity, Enumeration pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-IP rate limits" are what teams reach for first, and they fail because botnets rotate IPs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Endpoint sequence entropy, Request timing regularity, Enumeration pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rate limits per IP and API key | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk | chosen | Meets the 80 ms envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scraped records per day) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only from detected bots.
- Evaluation trap: Bot behaviours simulated naively.
- Large legitimate partner bursts: misclassified as scraping.
- Residential proxies disguise bots: iP-based features useless.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
