# ML Web Application Firewall: use-case brief

> Generated from the blueprint `cybersecurity/waf-ml-attack-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ML Web Application Firewall · **Domain:** cybersecurity · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives. The system has to run in under 10 milliseconds, inside these limits: Under 1 ms inline, False positives block revenue and Per-application tuning.

**Why it is hard.** The obvious approach is global signatures, and it fails because applications differ in legitimate payloads. The second trap is in "Decoding": the real signal is normalise encodings before classification, while teams usually reach for raw string models.

**Scale and stakes.** At 10 million users this is about 300.0M model-touching events a day, 3.5K requests per second on average and 27.8K at peak, at an estimated $222.1K a month. A mistake is expensive in the way false-block incidents measures it.

**What success looks like.** Offline: Detection rate at 1e-5 FPR and Latency overhead. Online: Blocked attack requests and False-block incidents. The launch is judged on "Blocked attack requests" while "False-block incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives.

**Training objective.** `\mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Under 1 ms inline
- False positives block revenue
- Per-application tuning
- Encrypted payload decoding

## The approach in one paragraph

Start with oWASP CRS rule set. Then earn the move to request normalisation then compact char-CNN/GBDT per-endpoint models alongside CRS rules, with shadow-mode tuning, and only if it beats the baseline on Detection rate at 1e-5 FPR and Latency overhead after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Normalised payload token features | Token n-grams after decoding. Attack syntax. Guard against: decoder coverage. |
| Add Parameter type anomaly | Value deviates from learned type. Injection. Guard against: per-endpoint stats. |
| Add Request-rate and sequence context | Rapid probing pattern. Scanning. Guard against: window. |
| Run it as one pipeline | Request ingress (edge proxy), Normaliser (decoder), Rules engine (CRS), ML scorer (compact model), Decision (block or challenge), Tuning console (security team) and Attack labels (SOC). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new app release changes parameter formats | Deployment hooks that trigger model re-baselining. |

**Deliberately not doing**

- User-agent: spoofable.
- Header order alone: weak.

**How the approach is proven**

Prove it offline on Detection rate at 1e-5 FPR and Latency overhead using time-ordered splits, then online on "Blocked attack requests" with "False-block incidents" as the guardrail. Watch for: Training on attack toolkits only and Replay traffic from a single app.

## Baseline and production design

- **Baseline (build this first):** OWASP CRS rule set.
- **Production design:** Request normalisation then compact char-CNN/GBDT per-endpoint models alongside CRS rules, with shadow-mode tuning.

## Why AI, and why this kind

**Why AI.** Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives. The evidence that separates good from bad outcomes (Normalised payload token features, Parameter type anomaly, Request-rate and sequence context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "global signatures" are what teams reach for first, and they fail because applications differ in legitimate payloads. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Request normalisation then compact char-CNN/GBDT per-endpoint models alongside CRS rules, with shadow-mode tuning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Normalised payload token features, Parameter type anomaly, Request-rate and sequence context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: OWASP CRS rule set | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Request normalisation then compact char-CNN/GBDT per-endpoint models alongside CRS rules, with shadow-mode tuning | chosen | Meets the 8 ms envelope at $0.025 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Blocked attack requests) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on attack toolkits only.
- Evaluation trap: Replay traffic from a single app.
- New app release changes parameter formats: legitimate traffic scores as anomalous.
- Attackers learn the model's blind spots: targeted evasion.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
