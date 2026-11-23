# AI-Generated Code Provenance and Review: use-case brief

> Generated from the blueprint `devtools/ai-code-provenance-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AI-Generated Code Provenance and Review · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Record which changes were written or edited by AI agents and route them to the right level of review, tests and licence checks, so accountability and quality stay clear. The system has to run interactively, within a few seconds, inside these limits: Every AI-assisted change is labelled in the pull request, Higher-risk changes need a second human reviewer and Licence and similarity checks run on generated code.

**Why it is hard.** The obvious approach is the agent as author, and it fails because accountability cannot sit with a tool. The second trap is in "Review": the real signal is risk-based depth, while teams usually reach for the same review for all.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way review time measures it.

**What success looks like.** Offline: Label recall on seeded changes, Defect rate by provenance and Review policy compliance. Online: Defects in AI-assisted changes, Review time and Licence findings. The launch is judged on "Defects in AI-assisted changes" while "Review time" must not get worse.

## Objective, loss and constraints

**Business objective.** Record which changes were written or edited by AI agents and route them to the right level of review, tests and licence checks, so accountability and quality stay clear.

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

- Every AI-assisted change is labelled in the pull request
- Higher-risk changes need a second human reviewer
- Licence and similarity checks run on generated code
- Human author remains accountable
- 100K labelled changes per month

## The approach in one paragraph

Start with developer disclosure in pull request templates, because it is the first step many teams take. Then earn the move to a provenance service that signs agent edits, labels changes, applies risk-based review rules and similarity and licence checks, and reports aggregate quality, and only if it beats the baseline on Label recall on seeded changes and Defect rate by provenance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Agent involvement marker | Signed record of agent edits. Label. Guard against: from the agent platform. |
| Add Change risk tier | Size and criticality. Review depth. Guard against: from the risk model. |
| Add Similarity to public code | Match to licensed code. Licence risk. Guard against: from similarity scans. |
| Run it as one pipeline | Agent edit recording (agent platform), Signed provenance (commit trailer), Risk tier (rules and model), Licence and similarity scan (scanners) and Merge gate (CI), with Review rule application and Quality report off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mixed authorship | Line-level provenance. |

**Deliberately not doing**

- Author name: personal data.
- Tool brand: weak link.
- Commit message wording: weak link.

**How the approach is proven**

Prove it offline on Label recall on seeded changes, Defect rate by provenance and Review policy compliance using time-ordered splits, then online on "Defects in AI-assisted changes" with "Review time" as the guardrail. Watch for: Disclosure by habit only, Same review for every change and Agent as accountable author.

## Baseline and production design

- **Baseline (build this first):** Developer disclosure in pull request templates, because it is the first step many teams take.
- **Production design:** A provenance service that signs agent edits, labels changes, applies risk-based review rules and similarity and licence checks, and reports aggregate quality.

## Why AI, and why this kind

**Why AI.** Record which changes were written or edited by AI agents and route them to the right level of review, tests and licence checks, so accountability and quality stay clear. The evidence that separates good from bad outcomes (Agent involvement marker, Change risk tier, Similarity to public code) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the agent as author" are what teams reach for first, and they fail because accountability cannot sit with a tool. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A provenance service that signs agent edits, labels changes, applies risk-based review rules and similarity and licence checks, and reports aggregate quality.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Agent involvement marker, Change risk tier, Similarity to public code and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developer disclosure in pull request templates, because it is the first step many teams take | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A provenance service that signs agent edits, labels changes, applies risk-based review rules and similarity and licence checks, and reports aggregate quality | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Defects in AI-assisted changes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Disclosure by habit only.
- Evaluation trap: Same review for every change.
- Mixed authorship: humans edit agent code.
- Unlabelled agent code: the label is missing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
