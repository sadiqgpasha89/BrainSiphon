# Regulatory Quality Measure Gap Detection: use-case brief

> Generated from the blueprint `healthcare/regulatory-quality-measure-gap-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Quality Measure Gap Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions. The system has to run interactively, within a few seconds, inside these limits: Every claim cites the source document and the rule version, The system abstains when evidence is absent and never fabricates evidence and The quality or compliance owner confirms applicability and closes gaps.

**Why it is hard.** The obvious approach is free-text answer that a requirement is met, and it fails because a claim without evidence will not survive an audit. The second trap is in "Rules": the real signal is deterministic checks for required fields and dates, while teams usually reach for lLM judgement for every gap.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.6K a month. A mistake is expensive in the way owner time per requirement measures it.

**What success looks like.** Offline: Citation precision and unsupported-claim rate, Gap recall against audited gaps and Abstention accuracy on requirements with no evidence. Online: Gaps closed before the audit date, Owner time per requirement and False-gap rate after owner review. The launch is judged on "Gaps closed before the audit date" while "Owner time per requirement" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{requirement},\text{evidence})+\lambda\,\mathrm{Calibration}`

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
| \text{requirement} | The text of the regulatory or policy requirement being checked, at the version in force. |
| \text{evidence} | The retrieved passages from approved repositories that the explanation must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Every claim cites the source document and the rule version
- The system abstains when evidence is absent and never fabricates evidence
- The quality or compliance owner confirms applicability and closes gaps
- Requirements are versioned by effective date
- Retrieval is limited to approved repositories and documents are untrusted input
- Answers a requirement query in under 3 seconds

## The approach in one paragraph

Start with manual spreadsheet cross-walk of requirements to policies. Then earn the move to hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention, and only if it beats the baseline on Citation precision and unsupported-claim rate and Gap recall against audited gaps after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence coverage | Share of requirement elements with a cited evidence span. Core gap measure. Guard against: retrieved from approved sources. |
| Add Evidence freshness | Age of the evidence relative to the required period. Stale evidence fails the requirement. Guard against: document dates. |
| Add Citation precision | Share of cited spans that actually support the claim. Quality of the retrieval. Guard against: judged on a labelled set. |
| Run it as one pipeline | Requirement and document intake (versioned repositories), Hybrid retriever (vector and keyword index), Rule checker for fields and dates (versioned rules), Gap explainer with citations (LLM) and Citation and policy guard (citation verifier), with Quality owner review and Gap log and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle evidence exists in a scanned file | OCR and layout parsing before indexing. |

**Deliberately not doing**

- Document length: not evidence quality.
- Author seniority: not evidence quality.
- Query phrasing: model sensitivity.

**How the approach is proven**

Prove it offline on Citation precision and unsupported-claim rate, Gap recall against audited gaps and Abstention accuracy on requirements with no evidence using time-ordered splits, then online on "Gaps closed before the audit date" with "Owner time per requirement" as the guardrail. Watch for: Scoring answers without checking citations, Using latest requirements for an old period and Asking the model whether a requirement is met.

## Baseline and production design

- **Baseline (build this first):** Manual spreadsheet cross-walk of requirements to policies.
- **Production design:** Hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention.

## Why AI, and why this kind

**Why AI.** Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions. The evidence that separates good from bad outcomes (Evidence coverage, Evidence freshness, Citation precision) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text answer that a requirement is met" are what teams reach for first, and they fail because A claim without evidence will not survive an audit. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence coverage, Evidence freshness, Citation precision and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual spreadsheet cross-walk of requirements to policies | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention | chosen | Meets the 2500 ms envelope at $11.43 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Gaps closed before the audit date) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring answers without checking citations.
- Evaluation trap: Using latest requirements for an old period.
- Evidence exists in a scanned file: retrieval misses it.
- Policy updated after evidence date: the evidence is stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
