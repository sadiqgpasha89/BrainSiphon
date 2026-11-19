# DNS Tunnelling & DGA Detection: use-case brief

> Generated from the blueprint `cybersecurity/dns-tunneling-and-dga-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DNS Tunnelling & DGA Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale. The system has to run in under 100 milliseconds, inside these limits: Billions of queries per day, Under 1 ms per query and Very low false positives.

**Why it is hard.** The obvious approach is static blocklists, and it fails because dGA domains are never in blocklists. The second trap is in "Behaviour": the real signal is per-client query patterns (NXDOMAIN rate, subdomain entropy), while teams usually reach for single-domain scoring.

**Scale and stakes.** At 10 million users this is about 1500.0M model-touching events a day, 17.4K requests per second on average and 104.2K at peak, at an estimated $815.3K a month. A mistake is expensive in the way false blocks of legitimate services measures it.

**What success looks like.** Offline: Detection rate at 1e-6 FPR and Time to detect. Online: Blocked C2 domains and False blocks of legitimate services. The launch is judged on "Blocked C2 domains" while "False blocks of legitimate services" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale.

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

- Billions of queries per day
- Under 1 ms per query
- Very low false positives
- Privacy

## The approach in one paragraph

Start with blocklists and entropy thresholds. Then earn the move to char-CNN domain classifier plus per-client behavioural model, streaming at resolver with local caches, and only if it beats the baseline on Detection rate at 1e-6 FPR and Time to detect after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Subdomain entropy and length | Shannon entropy of labels. Tunnelling. Guard against: language effects. |
| Add NXDOMAIN burst rate | NXDOMAIN per minute per client. DGA search. Guard against: window. |
| Add Domain age and popularity | Registration age and rank. Reputation. Guard against: data freshness. |
| Run it as one pipeline | DNS query stream (resolver tap), Lexical scorer (char-CNN), Client aggregator (Flink), Behaviour model (GBDT) and SOC alerts (queue), with Verdict and sinkhole and Analyst labels off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle cDN and cloud services use random-looking subdomains | Known-service allow-lists and structural patterns. |

**Deliberately not doing**

- Query type alone: weak.
- TTL: weak.

**How the approach is proven**

Prove it offline on Detection rate at 1e-6 FPR and Time to detect using time-ordered splits, then online on "Blocked C2 domains" with "False blocks of legitimate services" as the guardrail. Watch for: Benign data from popularity lists with CDN gaps and DGA families memorised.

## Baseline and production design

- **Baseline (build this first):** Blocklists and entropy thresholds.
- **Production design:** Char-CNN domain classifier plus per-client behavioural model, streaming at resolver with local caches.

## Why AI, and why this kind

**Why AI.** Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale. The evidence that separates good from bad outcomes (Subdomain entropy and length, NXDOMAIN burst rate, Domain age and popularity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static blocklists" are what teams reach for first, and they fail because DGA domains are never in blocklists. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Char-CNN domain classifier plus per-client behavioural model, streaming at resolver with local caches.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Subdomain entropy and length, NXDOMAIN burst rate, Domain age and popularity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Blocklists and entropy thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Char-CNN domain classifier plus per-client behavioural model, streaming at resolver with local caches | chosen | Meets the 80 ms envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Blocked C2 domains) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Benign data from popularity lists with CDN gaps.
- Evaluation trap: DGA families memorised.
- CDN and cloud services use random-looking subdomains: false positives on legitimate traffic.
- Attackers mimic natural-language domains: lexical models miss.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
