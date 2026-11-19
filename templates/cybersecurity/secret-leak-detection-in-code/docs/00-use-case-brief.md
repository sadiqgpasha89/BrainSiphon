# Secret & Credential Leak Detection in Code: use-case brief

> Generated from the blueprint `cybersecurity/secret-leak-detection-in-code` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Secret & Credential Leak Detection in Code · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge. The system has to run in under 100 milliseconds, inside these limits: Pre-commit latency under 1 s, Millions of repos and Very few false positives (developer trust).

**Why it is hard.** The obvious approach is regex only, and it fails because high-entropy strings include many non-secrets. The second trap is in "Validity": the real signal is verify live credentials safely, while teams usually reach for report all matches.

**Scale and stakes.** At 10 million users this is about 150.0M model-touching events a day, 1.7K requests per second on average and 10.4K at peak, at an estimated $91.0K a month. A mistake is expensive in the way developer overrides measures it.

**What success looks like.** Offline: Precision and recall on labelled secrets and Verified-valid rate. Online: Secrets leaked to default branch and Developer overrides. The launch is judged on "Secrets leaked to default branch" while "Developer overrides" must not get worse.

## Objective, loss and constraints

**Business objective.** Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Pre-commit latency under 1 s
- Millions of repos
- Very few false positives (developer trust)
- History scanning

## The approach in one paragraph

Start with regex scanner with entropy threshold. Then earn the move to provider-format detectors plus a small context classifier and safe verification calls, integrated into pre-commit and CI, and only if it beats the baseline on Precision and recall on labelled secrets and Verified-valid rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pattern match for provider format | Key prefix and checksum. Strong evidence. Guard against: format updates. |
| Add Entropy and character class | String statistics. Randomness. Guard against: threshold. |
| Add Surrounding context tokens | Variable names like api_key. Intent. Guard against: language. |
| Run it as one pipeline | Commit hook (git), Pattern detectors (regex bank), Context classifier (small transformer), Verifier (provider APIs), Policy action (block or warn), Developer notification (IDE or chat) and Rotation workflow (secret manager). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle test fixtures contain fake keys | Fixture path rules and verification of validity. |

**Deliberately not doing**

- File extension alone: weak.
- Commit message: weak.

**How the approach is proven**

Prove it offline on Precision and recall on labelled secrets and Verified-valid rate using time-ordered splits, then online on "Secrets leaked to default branch" with "Developer overrides" as the guardrail. Watch for: Positives from synthetic keys and No evaluation on minified files.

## Baseline and production design

- **Baseline (build this first):** Regex scanner with entropy threshold.
- **Production design:** Provider-format detectors plus a small context classifier and safe verification calls, integrated into pre-commit and CI.

## Why AI, and why this kind

**Why AI.** Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge. The evidence that separates good from bad outcomes (Pattern match for provider format, Entropy and character class, Surrounding context tokens) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "regex only" are what teams reach for first, and they fail because high-entropy strings include many non-secrets. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Provider-format detectors plus a small context classifier and safe verification calls, integrated into pre-commit and CI.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pattern match for provider format, Entropy and character class, Surrounding context tokens and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regex scanner with entropy threshold | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Provider-format detectors plus a small context classifier and safe verification calls, integrated into pre-commit and CI | chosen | Meets the 80 ms envelope at $0.020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Secrets leaked to default branch) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positives from synthetic keys.
- Evaluation trap: No evaluation on minified files.
- Test fixtures contain fake keys: fake keys in test fixtures trigger repeated alerts and cause developers to ignore the scanner.
- Secrets in git history already leaked: new commit passes but exposure persists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
