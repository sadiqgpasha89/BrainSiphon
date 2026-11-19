# Customer Success QBR & Account Briefing Agent: use-case brief

> Generated from the blueprint `saas/customer-success-qbr-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Success QBR & Account Briefing Agent · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics. The system has to run interactively, within a few seconds, inside these limits: Numbers from tools not the model, Data access by role and Customer-confidential data.

**Why it is hard.** The obvious approach is lLM-stated figures, and it fails because lLMs fabricate numbers. The second trap is in "Insight": the real signal is highlight changes and risks with comparisons, while teams usually reach for list all metrics.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $23.7K a month. A mistake is expensive in the way customer meeting outcomes measures it.

**What success looks like.** Offline: Numeric accuracy of cited metrics and CSM acceptance rate. Online: CSM prep time and Customer meeting outcomes. The launch is judged on "CSM prep time" while "Customer meeting outcomes" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{data})+\lambda\,\mathrm{NumericError}`

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
| \text{data} | The account usage and health data the report must be based on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{NumericError} | Penalty when a number in the report differs from the source data. |

**Hard constraints**

- Numbers from tools not the model
- Data access by role
- Customer-confidential data
- CSM approval

## The approach in one paragraph

Start with cSMs build decks manually from dashboards. Then earn the move to agent with governed metric tools, comparison and risk detectors, narrative generation with citations and CSM review before sharing, and only if it beats the baseline on Numeric accuracy of cited metrics and CSM acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Metric citation coverage | Statements linked to queries. Trust. Guard against: citation check. |
| Add Insight relevance | CSM-rated usefulness. Quality. Guard against: feedback. |
| Add Data freshness | Age of source data. Reliability. Guard against: metadata. |
| Run it as one pipeline | Account request (CSM tool), Metric tools (governed queries), Insight detectors (rules and models), Narrative LLM (with citations), Numeric verifier (re-query check) and Brief storage (CRM), with CSM review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle data from different systems disagree | Source-of-truth precedence and discrepancy flags. |

**Deliberately not doing**

- Slide design: cosmetic.
- Brief length: weak.

**How the approach is proven**

Prove it offline on Numeric accuracy of cited metrics and CSM acceptance rate using time-ordered splits, then online on "CSM prep time" with "Customer meeting outcomes" as the guardrail. Watch for: Judging fluency over accuracy and Not testing cross-account isolation.

## Baseline and production design

- **Baseline (build this first):** CSMs build decks manually from dashboards.
- **Production design:** Agent with governed metric tools, comparison and risk detectors, narrative generation with citations and CSM review before sharing.

## Why AI, and why this kind

**Why AI.** Generate account briefs and quarterly business review drafts from usage, support, billing and CRM data with cited metrics. The evidence that separates good from bad outcomes (Metric citation coverage, Insight relevance, Data freshness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "LLM-stated figures" are what teams reach for first, and they fail because LLMs fabricate numbers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agent with governed metric tools, comparison and risk detectors, narrative generation with citations and CSM review before sharing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Metric citation coverage, Insight relevance, Data freshness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: CSMs build decks manually from dashboards | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent with governed metric tools, comparison and risk detectors, narrative generation with citations and CSM review before sharing | chosen | Meets the 2500 ms envelope at $13.16 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (CSM prep time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging fluency over accuracy.
- Evaluation trap: Not testing cross-account isolation.
- Data from different systems disagree: brief states conflicting numbers.
- Brief reveals another customer's data: confidentiality breach.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
