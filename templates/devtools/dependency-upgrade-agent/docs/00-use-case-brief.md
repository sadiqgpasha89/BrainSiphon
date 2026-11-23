# Dependency Upgrade Agent: use-case brief

> Generated from the blueprint `devtools/dependency-upgrade-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dependency Upgrade Agent · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge. The system has to run as a scheduled batch job, inside these limits: Each upgrade is a pull request with passing tests, Owners approve every merge and Major upgrades need a risk summary.

**Why it is hard.** The obvious approach is version bump alone, and it fails because updates can break behaviour. The second trap is in "Scope": the real signal is grouped small updates, while teams usually reach for one huge update.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $3.4K a month. A mistake is expensive in the way dependency age measures it.

**What success looks like.** Offline: Merge-ready rate, Regression rate after merge and Vulnerabilities closed. Online: Time to fix vulnerable dependencies, Dependency age and Incidents from updates. The launch is judged on "Time to fix vulnerable dependencies" while "Dependency age" must not get worse.

## Objective, loss and constraints

**Business objective.** Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge.

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

- Each upgrade is a pull request with passing tests
- Owners approve every merge
- Major upgrades need a risk summary
- The agent never pushes to protected branches
- 100K dependency updates per year

## The approach in one paragraph

Start with automated update bots that open version bump pull requests, because they are common. Then earn the move to an agent that groups updates, reads changelogs and API diffs, adapts code where needed, runs tests in a sandbox and presents a risk summary to owners, and only if it beats the baseline on Merge-ready rate and Regression rate after merge after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Vulnerability fixed | Advisories resolved by the update. Priority. Guard against: from advisories. |
| Add Semantic version change | Patch, minor or major. Risk. Guard against: from metadata. |
| Add Test pass result | Test outcomes after the change. Gate. Guard against: from CI. |
| Run it as one pipeline | Update discovery (package registries), Changelog and API diff analysis (LLM and tools), Code adaptation (coding agent), Sandbox tests (CI), Pull request with risks (code host) and Rollout monitoring (observability), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle breaking API | Adaptation and extra tests. |

**Deliberately not doing**

- Developer name: personal data.
- Package popularity alone: weak link.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Merge-ready rate, Regression rate after merge and Vulnerabilities closed using time-ordered splits, then online on "Time to fix vulnerable dependencies" with "Dependency age" as the guardrail. Watch for: Version bump bots with no tests, One huge update and No changelog check.

## Baseline and production design

- **Baseline (build this first):** Automated update bots that open version bump pull requests, because they are common.
- **Production design:** An agent that groups updates, reads changelogs and API diffs, adapts code where needed, runs tests in a sandbox and presents a risk summary to owners.

## Why AI, and why this kind

**Why AI.** Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge. The evidence that separates good from bad outcomes (Vulnerability fixed, Semantic version change, Test pass result) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "version bump alone" are what teams reach for first, and they fail because updates can break behaviour. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent that groups updates, reads changelogs and API diffs, adapts code where needed, runs tests in a sandbox and presents a risk summary to owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Vulnerability fixed, Semantic version change, Test pass result and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Automated update bots that open version bump pull requests, because they are common | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent that groups updates, reads changelogs and API diffs, adapts code where needed, runs tests in a sandbox and presents a risk summary to owners | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to fix vulnerable dependencies) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Version bump bots with no tests.
- Evaluation trap: One huge update.
- Breaking API: the update changes behaviour.
- Yanked version: a release is withdrawn.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
