# Open Source Licence Compliance Scanning: use-case brief

> Generated from the blueprint `devtools/open-source-licence-compliance-scanning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Open Source Licence Compliance Scanning · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations. The system has to run as a scheduled batch job, inside these limits: Every finding cites the file and the licence text, Legal decides exceptions and Restricted licences blocked at the merge gate.

**Why it is hard.** The obvious approach is model memory of licences, and it fails because licences vary by version. The second trap is in "Authority": the real signal is legal makes decisions, while teams usually reach for the scanner.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way legal review time measures it.

**What success looks like.** Offline: Licence identification accuracy, SBOM completeness and Gate precision. Online: Releases with licence issues, Legal review time and Audit findings. The launch is judged on "Releases with licence issues" while "Legal review time" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every finding cites the file and the licence text
- Legal decides exceptions
- Restricted licences blocked at the merge gate
- Scan of 20M files per release
- Reports exported as SPDX

## The approach in one paragraph

Start with scans with fixed licence lists and manual legal review, because they are the typical process. Then earn the move to a scanner with learned licence text identification, SBOM generation, policy mapping and a legal review queue for unclear cases, and only if it beats the baseline on Licence identification accuracy and SBOM completeness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Licence text match | Match to known licences. Core. Guard against: from scanners. |
| Add Package metadata licence | Declared licence. Support. Guard against: from registries. |
| Add Link and distribution type | Static or dynamic linking and distribution. Obligations. Guard against: from build analysis. |
| Run it as one pipeline | Dependency and file scan (build pipeline), Licence identification (scanner and model), Policy mapping (rules), SBOM generation (SPDX or CycloneDX) and Merge gate (CI), with Legal review queue and Audit export off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle dual licences | Choice recorded by legal. |

**Deliberately not doing**

- Developer name: personal data.
- File name: an artefact.
- Package popularity: weak link.

**How the approach is proven**

Prove it offline on Licence identification accuracy, SBOM completeness and Gate precision using time-ordered splits, then online on "Releases with licence issues" with "Legal review time" as the guardrail. Watch for: Model memory of licences, Warnings with no SBOM and Scanner-made legal decisions.

## Baseline and production design

- **Baseline (build this first):** Scans with fixed licence lists and manual legal review, because they are the typical process.
- **Production design:** A scanner with learned licence text identification, SBOM generation, policy mapping and a legal review queue for unclear cases.

## Why AI, and why this kind

**Why AI.** Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations. The evidence that separates good from bad outcomes (Licence text match, Package metadata licence, Link and distribution type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory of licences" are what teams reach for first, and they fail because licences vary by version. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A scanner with learned licence text identification, SBOM generation, policy mapping and a legal review queue for unclear cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Licence text match, Package metadata licence, Link and distribution type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Scans with fixed licence lists and manual legal review, because they are the typical process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scanner with learned licence text identification, SBOM generation, policy mapping and a legal review queue for unclear cases | chosen | Meets the run-window envelope at $0.105 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Releases with licence issues) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model memory of licences.
- Evaluation trap: Warnings with no SBOM.
- Dual licences: a package offers two licences.
- Missing metadata: a package lacks licence data.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
