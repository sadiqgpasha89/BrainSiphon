# Patient Safety Event Root-Cause Discovery: use-case brief

> Generated from the blueprint `healthcare/patient-safety-event-root-cause-discovery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Event Root-Cause Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. The system has to run as a scheduled batch job, inside these limits: Narratives are de-identified before analysis, Output is a hypothesis with evidence links and never a causal claim or a finding of blame and Investigators lead causal analysis using the approved taxonomy.

**Why it is hard.** The obvious approach is causal conclusion, and it fails because correlation across reports is not cause. The second trap is in "Taxonomy": the real signal is mapping to the approved factor taxonomy, while teams usually reach for free topic labels.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way recurring-event reduction in addressed patterns measures it.

**What success looks like.** Offline: Topic coherence and cluster stability across resamples, Agreement of cluster factors with investigator-coded factors and Hypothesis hit rate in follow-up reviews. Online: Investigations started from a surfaced pattern, Recurring-event reduction in addressed patterns and Investigator time to a first hypothesis. The launch is judged on "Investigations started from a surfaced pattern" while "Recurring-event reduction in addressed patterns" must not get worse.

## Objective, loss and constraints

**Business objective.** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation.

**Training objective.** `\mathcal{L}=-\sum_{(i,j)}\log\sigma(z_i^\top z_j)+\lambda\,\mathrm{Contrastive}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(i,j)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma | Standard deviation: the model's predicted spread, or uncertainty, around its mean prediction. |
| z_i^\top | The embedding vector of a de-identified report: reports that describe similar events are pulled close together. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Contrastive} | Contrastive loss: pulls similar items together and pushes dissimilar items apart in embedding space. |

**Hard constraints**

- Narratives are de-identified before analysis
- Output is a hypothesis with evidence links and never a causal claim or a finding of blame
- Investigators lead causal analysis using the approved taxonomy
- Clusters carry coherence and stability measures
- Individual staff are never named or ranked
- Analyses 200K de-identified reports in a batch run

## The approach in one paragraph

Start with keyword counts by event category and month. Then earn the move to embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes, and only if it beats the baseline on Topic coherence and cluster stability across resamples and Agreement of cluster factors with investigator-coded factors after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Semantic cluster membership | Embedding-based cluster of narratives with coherence score. Groups similar events. Guard against: de-identified text only. |
| Add Temporal concentration | Cluster counts by month and unit. Reveals emerging patterns. Guard against: event time. |
| Add Process-step co-occurrence | Workflow step linked to an event in the graph. Anchors the pattern in a process. Guard against: mapped by taxonomy. |
| Run it as one pipeline | De-identified narrative intake (warehouse extracts), Narrative embedder (sentence transformer), Topic and cluster builder (HDBSCAN with stability checks), Contributing-factor graph (graph analytics) and Hypothesis evidence builder (source links), with Investigator review and Hypothesis outcomes and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle reporting culture change | Normalise by reporting rate and flag the change. |

**Deliberately not doing**

- Reporter identity: not a system factor.
- Rare words unique to one report: outliers.
- Report author department: confounds reporting culture with safety.

**How the approach is proven**

Prove it offline on Topic coherence and cluster stability across resamples, Agreement of cluster factors with investigator-coded factors and Hypothesis hit rate in follow-up reviews using time-ordered splits, then online on "Investigations started from a surfaced pattern" with "Recurring-event reduction in addressed patterns" as the guardrail. Watch for: Reporting a correlation as a cause, Evaluating clusters only by visual inspection and Mixing identified and de-identified text.

## Baseline and production design

- **Baseline (build this first):** Keyword counts by event category and month.
- **Production design:** Embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes.

## Why AI, and why this kind

**Why AI.** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. The evidence that separates good from bad outcomes (Semantic cluster membership, Temporal concentration, Process-step co-occurrence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "causal conclusion" are what teams reach for first, and they fail because correlation across reports is not cause. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Semantic cluster membership, Temporal concentration, Process-step co-occurrence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword counts by event category and month | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Investigations started from a surfaced pattern) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reporting a correlation as a cause.
- Evaluation trap: Evaluating clusters only by visual inspection.
- Reporting culture change: volume of reports shifts patterns.
- Small clusters: statistical noise.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
