# Security Log Parsing & Normalisation with LLMs: use-case brief

> Generated from the blueprint `cybersecurity/security-log-parsing-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Security Log Parsing & Normalisation with LLMs · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert heterogeneous vendor logs to a common schema (OCSF/ECS) automatically, adapting to new formats with minimal engineer effort. The system has to run as a scheduled batch job, inside these limits: Trillions of log lines, Cost per line near zero and Deterministic outputs.

**Why it is hard.** The obvious approach is lLM per log line, and it fails because per-line LLM calls cost far too much at trillion scale. The second trap is in "Validation": the real signal is test generated parsers on samples with field-level checks, while teams usually reach for trust generated mappings.

**Scale and stakes.** At 10 million users this is about 3000.0M model-touching events a day, 34.7K requests per second on average and 34.7K at peak, at an estimated $192.0K a month. A mistake is expensive in the way detection coverage on normalised data measures it.

**What success looks like.** Offline: Field-level accuracy on held-out logs and Parse success rate. Online: Time to onboard a log source and Detection coverage on normalised data. The launch is judged on "Time to onboard a log source" while "Detection coverage on normalised data" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert heterogeneous vendor logs to a common schema (OCSF/ECS) automatically, adapting to new formats with minimal engineer effort.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{field mapping}}+\lambda\,\mathrm{SchemaViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{field mapping}} | Cross-entropy on mapping each log field to the right schema field. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SchemaViolation} | Penalty when the parsed output does not follow the required event schema. |

**Hard constraints**

- Trillions of log lines
- Cost per line near zero
- Deterministic outputs
- New log sources weekly

## The approach in one paragraph

Start with hand-written Grok and regex parsers. Then earn the move to lLM-generated and human-reviewed parsers compiled to deterministic code, with sampling-based validation and drift monitoring, and only if it beats the baseline on Field-level accuracy on held-out logs and Parse success rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field-extraction accuracy | Accuracy on labelled samples. Quality. Guard against: sample coverage. |
| Add Schema coverage | Share of required fields mapped. Completeness. Guard against: schema. |
| Add Parser drift alarms | Parse-failure rate over time. Format changes. Guard against: monitoring. |
| Run it as one pipeline | New log source samples (onboarding), Parser generator (LLM), Test harness (field checks), Parser compile and deploy (pipeline), Streaming parse (deterministic engine) and Drift monitor (metrics), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy on mapping each log field to the right schema field, so the model is trained on the cost of the decision and not on a generic score. |
| Handle vendor changes log format after update | Parse-failure and field-distribution drift monitors. |

**Deliberately not doing**

- Log line length: weak.
- Timestamp precision: weak.

**How the approach is proven**

Prove it offline on Field-level accuracy on held-out logs and Parse success rate using time-ordered splits, then online on "Time to onboard a log source" with "Detection coverage on normalised data" as the guardrail. Watch for: Test on logs similar to training and No rare-format evaluation.

## Baseline and production design

- **Baseline (build this first):** Hand-written Grok and regex parsers.
- **Production design:** LLM-generated and human-reviewed parsers compiled to deterministic code, with sampling-based validation and drift monitoring.

## Why AI, and why this kind

**Why AI.** Convert heterogeneous vendor logs to a common schema (OCSF/ECS) automatically, adapting to new formats with minimal engineer effort. The evidence that separates good from bad outcomes (Field-extraction accuracy, Schema coverage, Parser drift alarms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "LLM per log line" are what teams reach for first, and they fail because per-line LLM calls cost far too much at trillion scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: LLM-generated and human-reviewed parsers compiled to deterministic code, with sampling-based validation and drift monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field-extraction accuracy, Schema coverage, Parser drift alarms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Hand-written Grok and regex parsers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LLM-generated and human-reviewed parsers compiled to deterministic code, with sampling-based validation and drift monitoring | chosen | Meets the run-window envelope at $0.0021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to onboard a log source) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test on logs similar to training.
- Evaluation trap: No rare-format evaluation.
- Vendor changes log format after update: parser silently mis-assigns fields.
- Sparse sample misses rare formats: a sparse onboarding sample misses rare log formats and leaves many lines unparsed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
