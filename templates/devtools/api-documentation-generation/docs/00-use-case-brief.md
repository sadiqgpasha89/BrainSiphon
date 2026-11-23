# API Documentation Generation: use-case brief

> Generated from the blueprint `devtools/api-documentation-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Documentation Generation · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI. The system has to run as a scheduled batch job, inside these limits: Every example runs in CI, Documentation matches the OpenAPI or schema and Owners review changes.

**Why it is hard.** The obvious approach is model-written prose alone, and it fails because docs must match behaviour. The second trap is in "Check": the real signal is executable examples, while teams usually reach for reading by eye.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.0K a month. A mistake is expensive in the way support questions about APIs measures it.

**What success looks like.** Offline: Example pass rate, Schema agreement and Reviewer edit rate. Online: Doc freshness, Support questions about APIs and Time to document a change. The launch is judged on "Doc freshness" while "Support questions about APIs" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI.

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

- Every example runs in CI
- Documentation matches the OpenAPI or schema
- Owners review changes
- Daily refresh for 5K services

## The approach in one paragraph

Start with hand-written docs with generated references from comments, because it is the standard practice. Then earn the move to a generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners, and only if it beats the baseline on Example pass rate and Schema agreement after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schema and type information | Endpoints, fields and types. Content. Guard against: from code. |
| Add Test and example results | Examples that pass. Correctness. Guard against: from CI. |
| Add Change diff | What changed since the last release. Update scope. Guard against: from version control. |
| Run it as one pipeline | Schema extraction (code analysis), Description draft (LLM), Example generation (LLM), Example execution (CI), Pull request (code host) and Docs publish (docs site), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle breaking change | CI blocks stale docs. |

**Deliberately not doing**

- Author name: personal data.
- File path wording: an artefact.
- Commit time: irrelevant.

**How the approach is proven**

Prove it offline on Example pass rate, Schema agreement and Reviewer edit rate using time-ordered splits, then online on "Doc freshness" with "Support questions about APIs" as the guardrail. Watch for: Prose with no tests, Publishing without owners and Examples with real secrets.

## Baseline and production design

- **Baseline (build this first):** Hand-written docs with generated references from comments, because it is the standard practice.
- **Production design:** A generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners.

## Why AI, and why this kind

**Why AI.** Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI. The evidence that separates good from bad outcomes (Schema and type information, Test and example results, Change diff) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model-written prose alone" are what teams reach for first, and they fail because docs must match behaviour. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schema and type information, Test and example results, Change diff and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Hand-written docs with generated references from comments, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners | chosen | Meets the run-window envelope at $0.045 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Doc freshness) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Prose with no tests.
- Evaluation trap: Publishing without owners.
- Breaking change: the docs and code disagree.
- Poor schema: fields lack descriptions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
