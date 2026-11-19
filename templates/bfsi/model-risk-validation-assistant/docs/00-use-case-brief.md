# Model Risk Validation Assistant: use-case brief

> Generated from the blueprint `bfsi/model-risk-validation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Model Risk Validation Assistant · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assist model validators by checking documentation against policy, reproducing key tests and drafting findings, with the validator remaining accountable. The system has to run interactively, within a few seconds, inside these limits: Read-only access to model code and data, Every finding cites a document section or test output and Validators approve every finding.

**Why it is hard.** The obvious approach is opinions from the model, and it fails because unsupported findings undermine independence. The second trap is in "Reproduction": the real signal is re-running tests in a sandbox, while teams usually reach for trusting reported metrics.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $446.8K a month. A mistake is expensive in the way findings missed on later audit measures it.

**What success looks like.** Offline: Finding precision and recall against validator findings and Citation validity. Online: Validation cycle time and Findings missed on later audit. The launch is judged on "Validation cycle time" while "Findings missed on later audit" must not get worse.

## Objective, loss and constraints

**Business objective.** Assist model validators by checking documentation against policy, reproducing key tests and drafting findings, with the validator remaining accountable.

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

- Read-only access to model code and data
- Every finding cites a document section or test output
- Validators approve every finding
- No model data leaves the bank

## The approach in one paragraph

Start with manual checklist-based validation by teams, because it is the current process. Then earn the move to a planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verifier and validator approval for each finding, and only if it beats the baseline on Finding precision and recall against validator findings and Citation validity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Policy coverage | Share of policy requirements addressed in the documentation. Gap detection. Guard against: policy versions change. |
| Add Metric reproduction delta | Difference between reported and reproduced metric. Detects errors. Guard against: randomness needs seeds. |
| Add Change since last validation | Code and data diff summary. Focuses review. Guard against: repos may be messy. |
| Run it as one pipeline | Validation request (GRC tool), Document retriever (hybrid search), Sandbox runner (containerised Python), Policy checker (LLM with structured checks) and Finding drafter (LLM with citations), with Validator review and Evidence archive off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle model code unavailable | Switch to testing documentation and outputs only and record the limitation in the validation report. |

**Deliberately not doing**

- Documentation length: not quality.
- Author name: irrelevant.
- Tool formatting: cosmetic.

**How the approach is proven**

Prove it offline on Finding precision and recall against validator findings and Citation validity using time-ordered splits, then online on "Validation cycle time" with "Findings missed on later audit" as the guardrail. Watch for: Evaluating on past reports the retriever has seen and Reviewers accept plausible findings too easily.

## Baseline and production design

- **Baseline (build this first):** Manual checklist-based validation by teams, because it is the current process.
- **Production design:** A planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verifier and validator approval for each finding.

## Why AI, and why this kind

**Why AI.** Assist model validators by checking documentation against policy, reproducing key tests and drafting findings, with the validator remaining accountable. The evidence that separates good from bad outcomes (Policy coverage, Metric reproduction delta, Change since last validation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "opinions from the model" are what teams reach for first, and they fail because unsupported findings undermine independence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verifier and validator approval for each finding.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Policy coverage, Metric reproduction delta, Change since last validation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual checklist-based validation by teams, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verifier and validator approval for each finding | chosen | Meets the 2500 ms envelope at $24.82 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Validation cycle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on past reports the retriever has seen.
- Evaluation trap: Reviewers accept plausible findings too easily.
- Model code unavailable: a vendor model is a black box and the code cannot be tested.
- Non-deterministic tests: metrics vary between runs so a test passes once and fails once.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
