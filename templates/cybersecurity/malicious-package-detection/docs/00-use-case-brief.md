# Malicious Open-Source Package Detection: use-case brief

> Generated from the blueprint `cybersecurity/malicious-package-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Malicious Open-Source Package Detection · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run. The system has to run as a scheduled batch job, inside these limits: Millions of packages, New versions published constantly and Low false positives for maintainers.

**Why it is hard.** The obvious approach is name similarity alone, and it fails because malicious code can hide under a normal-looking name. The second trap is in "Provenance": the real signal is maintainer and publishing-pattern changes, while teams usually reach for package contents only.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way developer friction measures it.

**What success looks like.** Offline: Detection of known malicious packages at low FP and Time to detect after publish. Online: Malicious packages blocked before install and Developer friction. The launch is judged on "Malicious packages blocked before install" while "Developer friction" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run.

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

- Millions of packages
- New versions published constantly
- Low false positives for maintainers
- Real-time CI gating

## The approach in one paragraph

Start with blocklists and name-similarity heuristics. Then earn the move to static plus sandbox features with maintainer-behaviour model in a gradient-boosted classifier and CI policy enforcement, and only if it beats the baseline on Detection of known malicious packages at low FP and Time to detect after publish after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Install-script risk | Network or exec calls in install hooks. Malware. Guard against: static analysis. |
| Add Maintainer change or new publisher | Ownership change. Takeover. Guard against: registry data. |
| Add Name similarity to popular packages | Edit distance and keyboard proximity. Typosquat. Guard against: popularity list. |
| Run it as one pipeline | Registry feed (new versions), Static analyser (AST and heuristics), Sandbox detonation (network-isolated), Maintainer behaviour model (GBDT), Risk scorer (ensemble) and CI gate (policy), with Security review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate package adds a postinstall script | Maintainer reputation weighting and reviewer fast path. |

**Deliberately not doing**

- Package size: weak.
- Number of versions: weak.

**How the approach is proven**

Prove it offline on Detection of known malicious packages at low FP and Time to detect after publish using time-ordered splits, then online on "Malicious packages blocked before install" with "Developer friction" as the guardrail. Watch for: Test set made of known blocklists and Benign packages not representative.

## Baseline and production design

- **Baseline (build this first):** Blocklists and name-similarity heuristics.
- **Production design:** Static plus sandbox features with maintainer-behaviour model in a gradient-boosted classifier and CI policy enforcement.

## Why AI, and why this kind

**Why AI.** Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run. The evidence that separates good from bad outcomes (Install-script risk, Maintainer change or new publisher, Name similarity to popular packages) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "name similarity alone" are what teams reach for first, and they fail because malicious code can hide under a normal-looking name. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Static plus sandbox features with maintainer-behaviour model in a gradient-boosted classifier and CI policy enforcement.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Install-script risk, Maintainer change or new publisher, Name similarity to popular packages and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Blocklists and name-similarity heuristics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Static plus sandbox features with maintainer-behaviour model in a gradient-boosted classifier and CI policy enforcement | chosen | Meets the run-window envelope at $0.214 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Malicious packages blocked before install) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test set made of known blocklists.
- Evaluation trap: Benign packages not representative.
- Legitimate package adds a postinstall script: flagged as malware.
- Sandbox evasion by delayed execution: malware not triggered.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
