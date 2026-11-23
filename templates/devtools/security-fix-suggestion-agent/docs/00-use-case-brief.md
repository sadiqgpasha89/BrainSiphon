# Security Fix Suggestion Agent: use-case brief

> Generated from the blueprint `devtools/security-fix-suggestion-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Security Fix Suggestion Agent · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review. The system has to run interactively, within a few seconds, inside these limits: Fixes only for confirmed findings, Each fix includes a test that fails before and passes after and Owner and security review required.

**Why it is hard.** The obvious approach is a plausible patch, and it fails because plausible patches can leave the flaw open. The second trap is in "Scope": the real signal is minimal changes, while teams usually reach for broad refactors.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way fixes accepted measures it.

**What success looks like.** Offline: Fix verification rate, Reviewer acceptance and Re-open rate. Online: Time to fix, Fixes accepted and Security regressions. The launch is judged on "Time to fix" while "Fixes accepted" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Fixes only for confirmed findings
- Each fix includes a test that fails before and passes after
- Owner and security review required
- The agent works in a sandbox
- 20K findings per quarter

## The approach in one paragraph

Start with developers fixing findings by hand using guidance pages, because it is the usual process. Then earn the move to a fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk, and only if it beats the baseline on Fix verification rate and Reviewer acceptance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Finding type and location | Rule and code location. Context. Guard against: from the scanner. |
| Add Code context | Surrounding code and framework. Fix design. Guard against: from the repository. |
| Add Test outcome | Test before and after. Gate. Guard against: from CI. |
| Run it as one pipeline | Confirmed finding intake (security tracker), Code context retrieval (repository), Fix proposal (coding agent), Test generation and run (sandbox), Pull request (code host) and Closure verification (rescan), with Owner and security review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle framework-specific fix | Framework pattern library. |

**Deliberately not doing**

- Developer name: personal data.
- Finding id: an identifier.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Fix verification rate, Reviewer acceptance and Re-open rate using time-ordered splits, then online on "Time to fix" with "Fixes accepted" as the guardrail. Watch for: Fixing unconfirmed findings, Patches without tests and Auto-merge.

## Baseline and production design

- **Baseline (build this first):** Developers fixing findings by hand using guidance pages, because it is the usual process.
- **Production design:** A fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk.

## Why AI, and why this kind

**Why AI.** Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review. The evidence that separates good from bad outcomes (Finding type and location, Code context, Test outcome) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A plausible patch" are what teams reach for first, and they fail because plausible patches can leave the flaw open. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Finding type and location, Code context, Test outcome and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developers fixing findings by hand using guidance pages, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to fix) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fixing unconfirmed findings.
- Evaluation trap: Patches without tests.
- Framework-specific fix: the generic pattern fails.
- Fix breaks behaviour: the proposed fix makes existing tests fail.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
