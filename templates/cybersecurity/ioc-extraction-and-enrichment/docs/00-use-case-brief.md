# IOC Extraction & Enrichment: use-case brief

> Generated from the blueprint `cybersecurity/ioc-extraction-and-enrichment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IOC Extraction & Enrichment · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting. The system has to run as a scheduled batch job, inside these limits: Defanged indicators, Contextual validity (benign infrastructure) and Expiry of indicators.

**Why it is hard.** The obvious approach is regex all IPs and domains, and it fails because reports mention many benign domains. The second trap is in "Decay": the real signal is indicator confidence decays over time, while teams usually reach for permanent blocklists.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way stale-IOC false blocks measures it.

**What success looks like.** Offline: Extraction F1 and role precision and Blocklist false-positive rate. Online: Detections from IOCs and Stale-IOC false blocks. The launch is judged on "Detections from IOCs" while "Stale-IOC false blocks" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{BIO}}+\lambda\,\mathrm{CE}_{\text{type}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{BIO}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Defanged indicators
- Contextual validity (benign infrastructure)
- Expiry of indicators
- High volume feeds

## The approach in one paragraph

Start with regex extraction with static scoring. Then earn the move to transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL, and only if it beats the baseline on Extraction F1 and role precision and Blocklist false-positive rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Indicator context window | Sentence role (victim, attacker, benign). Classification. Guard against: parsing. |
| Add Multi-source corroboration | Sources reporting the indicator. Confidence. Guard against: source independence. |
| Add Infrastructure reputation | Hosting and ASN risk. Prior. Guard against: data feeds. |
| Run it as one pipeline | Defang and extract (parser), Role classifier (transformer), Corroboration scorer (source graph), Confidence with decay (scoring) and Blocklist publisher (TIP), with Report and feed intake and Analyst review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shared hosting IPs listed as malicious | Shared-infrastructure checks and expiry. |

**Deliberately not doing**

- Report length: weak.
- Vendor logo: none.

**How the approach is proven**

Prove it offline on Extraction F1 and role precision and Blocklist false-positive rate using time-ordered splits, then online on "Detections from IOCs" with "Stale-IOC false blocks" as the guardrail. Watch for: Evaluating extraction without role context and Ignoring decay.

## Baseline and production design

- **Baseline (build this first):** Regex extraction with static scoring.
- **Production design:** Transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL.

## Why AI, and why this kind

**Why AI.** Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting. The evidence that separates good from bad outcomes (Indicator context window, Multi-source corroboration, Infrastructure reputation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regex all IPs and domains" are what teams reach for first, and they fail because reports mention many benign domains. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Indicator context window, Multi-source corroboration, Infrastructure reputation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex extraction with static scoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Detections from IOCs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating extraction without role context.
- Evaluation trap: Ignoring decay.
- Shared hosting IPs listed as malicious: collateral blocking of legitimate sites.
- Defanging variants break parsers: indicators missed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
