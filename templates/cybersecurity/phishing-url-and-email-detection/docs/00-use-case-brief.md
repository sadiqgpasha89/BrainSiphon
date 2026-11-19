# Phishing URL & Email Detection: use-case brief

> Generated from the blueprint `cybersecurity/phishing-url-and-email-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing URL & Email Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. The system has to run in under 100 milliseconds, inside these limits: Delivery latency under 100 ms, Zero tolerance for blocking business-critical mail and Multilingual.

**Why it is hard.** The obvious approach is uRL blocklists, and it fails because phishing domains live for hours, lists lag. The second trap is in "Click-time": the real signal is re-scan links at click time, while teams usually reach for scan at delivery only.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $49.8K a month. A mistake is expensive in the way user-reported phish rate measures it.

**What success looks like.** Offline: Detection rate at 1 in 100k false positive and Time-to-detect of new campaigns. Online: Phish delivered per 1M and User-reported phish rate. The launch is judged on "Phish delivered per 1M" while "User-reported phish rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update.

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

- Delivery latency under 100 ms
- Zero tolerance for blocking business-critical mail
- Multilingual
- Campaigns live for minutes

## The approach in one paragraph

Start with blocklists plus keyword heuristics. Then earn the move to ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning, and only if it beats the baseline on Detection rate at 1 in 100k false positive and Time-to-detect of new campaigns after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Domain age and registration pattern | Days since registration, registrar risk. Newly registered domains. Guard against: wHOIS timing. |
| Add Brand impersonation score | Visual and text similarity to known brands. Lookalike pages. Guard against: brand corpus. |
| Add Sender-recipient relationship graph | Prior interaction between sender and recipient. Unfamiliar senders. Guard against: graph as-of. |
| Run it as one pipeline | Mail gateway (SMTP), Header and sender graph features (graph lookup), Text and URL model (transformer), Page crawler and screenshot (headless browser), Phish classifier (ensemble) and Policy action (quarantine or banner), with User reports off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate marketing mail from a new domain | Allow-list workflow and sender reputation ramp. |

**Deliberately not doing**

- Email subject length: weak.
- Number of recipients: confounded with newsletters.

**How the approach is proven**

Prove it offline on Detection rate at 1 in 100k false positive and Time-to-detect of new campaigns using time-ordered splits, then online on "Phish delivered per 1M" with "User-reported phish rate" as the guardrail. Watch for: Training on old campaigns and Cloaked pages labelled benign.

## Baseline and production design

- **Baseline (build this first):** Blocklists plus keyword heuristics.
- **Production design:** Ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning.

## Why AI, and why this kind

**Why AI.** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. The evidence that separates good from bad outcomes (Domain age and registration pattern, Brand impersonation score, Sender-recipient relationship graph) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "URL blocklists" are what teams reach for first, and they fail because phishing domains live for hours, lists lag. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Domain age and registration pattern, Brand impersonation score, Sender-recipient relationship graph and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Blocklists plus keyword heuristics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning | chosen | Meets the 80 ms envelope at $0.028 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Phish delivered per 1M) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on old campaigns.
- Evaluation trap: Cloaked pages labelled benign.
- Legitimate marketing mail from a new domain: false positive blocks a critical vendor.
- Attackers cloak pages from crawlers: scanner sees benign page.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
