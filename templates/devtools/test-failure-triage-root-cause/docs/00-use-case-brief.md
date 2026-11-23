# Test Failure Triage and Root Cause Agent: use-case brief

> Generated from the blueprint `devtools/test-failure-triage-root-cause` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Test Failure Triage and Root Cause Agent · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify test failures as product bug, test bug, environment or flake and point to the likely cause with log evidence so engineers fix the right thing quickly. The system has to run interactively, within a few seconds, inside these limits: Every classification cites log lines and diffs, The agent cannot change code or retry production jobs and Engineers confirm before closing.

**Why it is hard.** The obvious approach is failure message text, and it fails because messages repeat across causes. The second trap is in "Evidence": the real signal is log lines and the suspect commit, while teams usually reach for a summary.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.4K a month. A mistake is expensive in the way re-runs measures it.

**What success looks like.** Offline: Cause classification accuracy, Evidence faithfulness and Routing accuracy. Online: Time to triage, Re-runs and Failures bounced between teams. The launch is judged on "Time to triage" while "Re-runs" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify test failures as product bug, test bug, environment or flake and point to the likely cause with log evidence so engineers fix the right thing quickly.

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

- Every classification cites log lines and diffs
- The agent cannot change code or retry production jobs
- Engineers confirm before closing
- Triage within 2 minutes
- 100K failures per day

## The approach in one paragraph

Start with engineers reading logs and re-running failed jobs, because it is the usual process. Then earn the move to a triage agent that clusters failures, retrieves logs and recent commits, proposes a cause with evidence and routes the item to the owning team, and only if it beats the baseline on Cause classification accuracy and Evidence faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error signature | Normalised error message and stack. Clustering. Guard against: from logs. |
| Add Suspect commit window | Commits since the last pass. Cause. Guard against: from version control. |
| Add Environment health | Infrastructure alarms. Context. Guard against: from monitoring. |
| Run it as one pipeline | Failure intake (CI), Error clustering (embeddings), Log and commit retrieval (read-only tools), Cause proposal (LLM with citations), Routing (ownership data), Engineer confirmation (issue tracker) and Accuracy tracking (weekly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle multiple causes | Show candidate causes. |

**Deliberately not doing**

- Developer name: personal data.
- Log line numbers: an artefact.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Cause classification accuracy, Evidence faithfulness and Routing accuracy using time-ordered splits, then online on "Time to triage" with "Re-runs" as the guardrail. Watch for: Closing without confirmation, Uncited causes and Single-cause assumptions.

## Baseline and production design

- **Baseline (build this first):** Engineers reading logs and re-running failed jobs, because it is the usual process.
- **Production design:** A triage agent that clusters failures, retrieves logs and recent commits, proposes a cause with evidence and routes the item to the owning team.

## Why AI, and why this kind

**Why AI.** Classify test failures as product bug, test bug, environment or flake and point to the likely cause with log evidence so engineers fix the right thing quickly. The evidence that separates good from bad outcomes (Error signature, Suspect commit window, Environment health) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "failure message text" are what teams reach for first, and they fail because messages repeat across causes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A triage agent that clusters failures, retrieves logs and recent commits, proposes a cause with evidence and routes the item to the owning team.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error signature, Suspect commit window, Environment health and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers reading logs and re-running failed jobs, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A triage agent that clusters failures, retrieves logs and recent commits, proposes a cause with evidence and routes the item to the owning team | chosen | Meets the 2500 ms envelope at $4.76 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to triage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Closing without confirmation.
- Evaluation trap: Uncited causes.
- Multiple causes: two issues overlap.
- Truncated logs: key lines are missing.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
