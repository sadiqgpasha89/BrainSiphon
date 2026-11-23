# Malicious Package Detection: use-case brief

> Generated from the blueprint `devtools/typosquat-malicious-package-blocking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Malicious Package Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds. The system has to run as a scheduled batch job, inside these limits: Block high-confidence malicious packages at the proxy, Analyst reviews borderline cases and Allow-list for trusted publishers.

**Why it is hard.** The obvious approach is download counts, and it fails because popularity does not show safety. The second trap is in "Action": the real signal is block at the proxy with review, while teams usually reach for warn only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to block measures it.

**What success looks like.** Offline: Detection of known malicious packages, False block rate and Time to detection after publish. Online: Malicious packages blocked, Time to block and Developer exceptions. The launch is judged on "Malicious packages blocked" while "Time to block" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds.

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

- Block high-confidence malicious packages at the proxy
- Analyst reviews borderline cases
- Allow-list for trusted publishers
- New version scan within 5 minutes
- 5M package versions per day

## The approach in one paragraph

Start with vulnerability scanning of known issues and manual allow-lists, because they are the common controls. Then earn the move to a scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process, and only if it beats the baseline on Detection of known malicious packages and False block rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Name similarity to popular packages | Typosquat distance. Core. Guard against: from the registry. |
| Add Install script behaviour | Network calls and obfuscation. Core. Guard against: from sandbox analysis. |
| Add Publisher change and maintainer history | New maintainers or sudden releases. Takeover. Guard against: from registry data. |
| Run it as one pipeline | New version feed (registries), Metadata and static analysis (scanners), Sandbox run (isolated environment), Risk scoring (model) and Proxy decision (artifact proxy), with Analyst review and Feedback off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate obfuscation | Publisher trust and allow-lists. |

**Deliberately not doing**

- Package description wording: weak link.
- Download count alone: weak link.
- README length: weak link.

**How the approach is proven**

Prove it offline on Detection of known malicious packages, False block rate and Time to detection after publish using time-ordered splits, then online on "Malicious packages blocked" with "Time to block" as the guardrail. Watch for: Known-vulnerability scanning only, Warn-only controls and Popularity as trust.

## Baseline and production design

- **Baseline (build this first):** Vulnerability scanning of known issues and manual allow-lists, because they are the common controls.
- **Production design:** A scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process.

## Why AI, and why this kind

**Why AI.** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds. The evidence that separates good from bad outcomes (Name similarity to popular packages, Install script behaviour, Publisher change and maintainer history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "download counts" are what teams reach for first, and they fail because popularity does not show safety. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Name similarity to popular packages, Install script behaviour, Publisher change and maintainer history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vulnerability scanning of known issues and manual allow-lists, because they are the common controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Malicious packages blocked) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Known-vulnerability scanning only.
- Evaluation trap: Warn-only controls.
- Legitimate obfuscation: a build tool obfuscates code.
- Account takeover: a trusted package turns malicious.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
