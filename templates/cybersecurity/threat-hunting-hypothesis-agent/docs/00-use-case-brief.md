# Threat Hunting Hypothesis Generation: use-case brief

> Generated from the blueprint `cybersecurity/threat-hunting-hypothesis-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Threat Hunting Hypothesis Generation · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate and test threat-hunting hypotheses from fresh intelligence against telemetry, turning reports into validated detections or negative results. The system has to run interactively, within a few seconds, inside these limits: Queries must be safe and cost-bounded, MITRE ATT&CK mapping and Reproducible hunts.

**Why it is hard.** The obvious approach is free-form hunting ideas, and it fails because without data-source mapping the hunt cannot run. The second trap is in "Cost": the real signal is query cost budgets, while teams usually reach for unbounded search over the lake.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $3.95M a month. A mistake is expensive in the way hunter hours saved measures it.

**What success looks like.** Offline: Query validity and hit-rate and Coverage gain. Online: Detections created per hunt and Hunter hours saved. The launch is judged on "Detections created per hunt" while "Hunter hours saved" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate and test threat-hunting hypotheses from fresh intelligence against telemetry, turning reports into validated detections or negative results.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{CTI})+\lambda\,\mathrm{InvalidQuery}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target hypothesis or query: y_t at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{CTI} | Cyber threat intelligence: the reports on attacker behaviour the agent reads. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InvalidQuery} | Penalty when the agent writes hunting queries that are invalid or cannot run. |

**Hard constraints**

- Queries must be safe and cost-bounded
- MITRE ATT&CK mapping
- Reproducible hunts
- Hunter oversight

## The approach in one paragraph

Start with manual hunts from threat reports. Then earn the move to cTI-to-ATT&CK extraction, data-source-aware query synthesis with cost estimators, result triage and conversion of confirmed hunts into detection rules, and only if it beats the baseline on Query validity and hit-rate and Coverage gain after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Technique coverage gap | Techniques lacking detections. Priority. Guard against: coverage matrix. |
| Add Query validity rate | Queries that run and return. Reliability. Guard against: execution. |
| Add Hit-rate on hypotheses | Share producing leads. Value. Guard against: review. |
| Run it as one pipeline | Threat-intel feeds (ingestion), Technique extractor (LLM), Query synthesiser (data-source-aware), Cost guard (query planner), Hunt executor (SIEM) and Detection engineering (rule pipeline), with Hunter review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle synthesised query scans the entire data lake | Cost estimator and scoped time windows. |

**Deliberately not doing**

- Report length: none.
- Hype of the threat actor: marketing noise.

**How the approach is proven**

Prove it offline on Query validity and hit-rate and Coverage gain using time-ordered splits, then online on "Detections created per hunt" with "Hunter hours saved" as the guardrail. Watch for: No ground truth for negative hunts and Counting hypotheses not validated outcomes.

## Baseline and production design

- **Baseline (build this first):** Manual hunts from threat reports.
- **Production design:** CTI-to-ATT&CK extraction, data-source-aware query synthesis with cost estimators, result triage and conversion of confirmed hunts into detection rules.

## Why AI, and why this kind

**Why AI.** Generate and test threat-hunting hypotheses from fresh intelligence against telemetry, turning reports into validated detections or negative results. The evidence that separates good from bad outcomes (Technique coverage gap, Query validity rate, Hit-rate on hypotheses) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form hunting ideas" are what teams reach for first, and they fail because without data-source mapping the hunt cannot run. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: CTI-to-ATT&CK extraction, data-source-aware query synthesis with cost estimators, result triage and conversion of confirmed hunts into detection rules.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Technique coverage gap, Query validity rate, Hit-rate on hypotheses and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual hunts from threat reports | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| CTI-to-ATT&CK extraction, data-source-aware query synthesis with cost estimators, result triage and conversion of confirmed hunts into detection rules | chosen | Meets the 2500 ms envelope at $8.77 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Detections created per hunt) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: No ground truth for negative hunts.
- Evaluation trap: Counting hypotheses not validated outcomes.
- Synthesised query scans the entire data lake: an unscoped synthesised query scans the whole data lake and overloads the SIEM.
- Report is wrong or deliberately misleading: hunts built on a wrong or planted report waste analyst time and miss real activity.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
