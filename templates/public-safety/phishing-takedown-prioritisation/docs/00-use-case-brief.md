# Phishing Site Takedown Prioritisation: use-case brief

> Generated from the blueprint `public-safety/phishing-takedown-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing Site Takedown Prioritisation · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest. The system has to run interactively, within a few seconds, inside these limits: Takedown requests reviewed by an analyst, Evidence pack for each request and Legitimate sites protected by checks.

**Why it is hard.** The obvious approach is reports alone, and it fails because reports include mistakes. The second trap is in "Harm": the real signal is reach and impersonation of public bodies, while teams usually reach for count of sites.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.4K a month. A mistake is expensive in the way victims reached before takedown measures it.

**What success looks like.** Offline: Precision at analyst capacity, Recall of confirmed phishing and Wrongful flag rate. Online: Time to takedown, Victims reached before takedown and Wrongful takedowns. The launch is judged on "Time to takedown" while "Victims reached before takedown" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Takedown requests reviewed by an analyst
- Evidence pack for each request
- Legitimate sites protected by checks
- Ranking every 5 minutes
- 100K reports per month

## The approach in one paragraph

Start with first-come first-served takedown requests, because it is the common queue. Then earn the move to a ranking model with a verification step, an evidence pack builder and tracking of takedown time by hosting provider, and only if it beats the baseline on Precision at analyst capacity and Recall of confirmed phishing after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Page similarity to known brands | Visual and text similarity. Impersonation. Guard against: from the vision model. |
| Add Domain age and registration pattern | Age and registration features. Risk. Guard against: from DNS data. |
| Add Report volume and spread | Number of distinct reporters. Reach. Guard against: from reports. |
| Run it as one pipeline | Page analysis (vision and NLP), Maliciousness model (gradient boosting), Harm ranking (rules), Takedown request (provider channels) and Outcome tracking (weekly), with Report and feed intake and Analyst verification off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle compromised legitimate site | Owner notification instead of takedown. |

**Deliberately not doing**

- Reporter name: personal data.
- Site owner name: personal data.
- Report text length: weak link.

**How the approach is proven**

Prove it offline on Precision at analyst capacity, Recall of confirmed phishing and Wrongful flag rate using time-ordered splits, then online on "Time to takedown" with "Victims reached before takedown" as the guardrail. Watch for: Blind blocking, First-come queues and Report-only labels.

## Baseline and production design

- **Baseline (build this first):** First-come first-served takedown requests, because it is the common queue.
- **Production design:** A ranking model with a verification step, an evidence pack builder and tracking of takedown time by hosting provider.

## Why AI, and why this kind

**Why AI.** Rank reported phishing sites and scam domains for takedown by victim reach and brand or government impersonation so scarce takedown effort lands where harm is highest. The evidence that separates good from bad outcomes (Page similarity to known brands, Domain age and registration pattern, Report volume and spread) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reports alone" are what teams reach for first, and they fail because reports include mistakes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A ranking model with a verification step, an evidence pack builder and tracking of takedown time by hosting provider.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Page similarity to known brands, Domain age and registration pattern, Report volume and spread and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: First-come first-served takedown requests, because it is the common queue | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A ranking model with a verification step, an evidence pack builder and tracking of takedown time by hosting provider | chosen | Meets the 2500 ms envelope at $0.138 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to takedown) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Blind blocking.
- Evaluation trap: First-come queues.
- Compromised legitimate site: a real business is hacked.
- Fast-flux domains: sites move quickly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
