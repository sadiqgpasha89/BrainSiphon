# SOC Alert Triage Agent: use-case brief

> Generated from the blueprint `it-ops/soc-alert-triage-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Alert Triage Agent · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm. The system has to run interactively, within a few seconds, inside these limits: Every summary cites the evidence gathered, The agent is read-only and never contains or deletes and Analysts decide on containment.

**Why it is hard.** The obvious approach is alert severity from the tool, and it fails because severities are often wrong. The second trap is in "Role": the real signal is enrich and rank, while teams usually reach for contain automatically.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way analyst time per alert measures it.

**What success looks like.** Offline: Rank accuracy on analyst dispositions, Summary faithfulness and Missed true positive rate. Online: Mean time to triage, Analyst time per alert and True incidents missed. The launch is judged on "Mean time to triage" while "Analyst time per alert" must not get worse.

## Objective, loss and constraints

**Business objective.** Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm.

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

- Every summary cites the evidence gathered
- The agent is read-only and never contains or deletes
- Analysts decide on containment
- Triage within 2 minutes
- 50K alerts per day

## The approach in one paragraph

Start with analysts working a queue ordered by tool severity, because it is the standard practice. Then earn the move to a triage agent that enriches alerts from approved sources, ranks by rule fidelity, asset value and entity history, writes a cited summary and routes the case with suggested next steps, and only if it beats the baseline on Rank accuracy on analyst dispositions and Summary faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Alert rule fidelity | Past true positive rate of the rule. Prior. Guard against: from SIEM history. |
| Add Asset criticality | Value of the affected asset. Impact. Guard against: from the CMDB. |
| Add Entity history | Whether similar behaviour is normal. Context. Guard against: from logs. |
| Run it as one pipeline | Alert intake (SIEM), Context enrichment (read-only tools), Priority scoring (gradient boosting), Investigation summary (LLM with citations) and Rule tuning (monthly), with Analyst review and Disposition feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle novel attack | Escalate when evidence is thin. |

**Deliberately not doing**

- Analyst name: personal data.
- Alert id: an identifier.
- Tool vendor: weak link.

**How the approach is proven**

Prove it offline on Rank accuracy on analyst dispositions, Summary faithfulness and Missed true positive rate using time-ordered splits, then online on "Mean time to triage" with "Analyst time per alert" as the guardrail. Watch for: Tool severity as truth, Automatic containment and Summaries without sources.

## Baseline and production design

- **Baseline (build this first):** Analysts working a queue ordered by tool severity, because it is the standard practice.
- **Production design:** A triage agent that enriches alerts from approved sources, ranks by rule fidelity, asset value and entity history, writes a cited summary and routes the case with suggested next steps.

## Why AI, and why this kind

**Why AI.** Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm. The evidence that separates good from bad outcomes (Alert rule fidelity, Asset criticality, Entity history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alert severity from the tool" are what teams reach for first, and they fail because severities are often wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A triage agent that enriches alerts from approved sources, ranks by rule fidelity, asset value and entity history, writes a cited summary and routes the case with suggested next steps.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Alert rule fidelity, Asset criticality, Entity history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts working a queue ordered by tool severity, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A triage agent that enriches alerts from approved sources, ranks by rule fidelity, asset value and entity history, writes a cited summary and routes the case with suggested next steps | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to triage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Tool severity as truth.
- Evaluation trap: Automatic containment.
- Novel attack: no rule or history matches.
- Enrichment source down: a data source is unavailable.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
