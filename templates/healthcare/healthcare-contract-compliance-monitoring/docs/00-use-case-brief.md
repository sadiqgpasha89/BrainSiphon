# Healthcare Contract Compliance Monitoring: use-case brief

> Generated from the blueprint `healthcare/healthcare-contract-compliance-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Compliance Monitoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision. The system has to run as a scheduled batch job, inside these limits: Rules and event processing determine compliance status and LLM interpretation is advisory and grounded, The contract owner validates exceptions and any formal breach notice and Evidence links point to source records.

**Why it is hard.** The obvious approach is model judgement of breach, and it fails because breach is a legal conclusion. The second trap is in "Evidence": the real signal is linked transaction or service records, while teams usually reach for narrative.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $2.0K a month. A mistake is expensive in the way service credits recovered measures it.

**What success looks like.** Offline: Rule accuracy against audited compliance decisions, Breach-risk precision and lead time and Citation precision in evidence summaries. Online: Breaches caught before notice deadlines, Service credits recovered and Owner time per review. The launch is judged on "Breaches caught before notice deadlines" while "Service credits recovered" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{evidence} | The linked service, transaction and invoice records the summary must be grounded in. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft, task or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- Rules and event processing determine compliance status and LLM interpretation is advisory and grounded
- The contract owner validates exceptions and any formal breach notice
- Evidence links point to source records
- Agent permissions are read-only plus draft tasks
- Documents are untrusted input
- Evaluates 5M service and invoice events per day

## The approach in one paragraph

Start with quarterly manual review of service reports against the contract. Then earn the move to a rules and event-processing engine over the obligation register with service-level and commercial checks, a grounded LLM that drafts evidence summaries and interpretation notes with citations and a task workflow that stops at owner approval, and only if it beats the baseline on Rule accuracy against audited compliance decisions and Breach-risk precision and lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Service-level attainment | Measured performance against SLA targets in the period. The primary compliance measure. Guard against: period closed. |
| Add Obligation due-date proximity | Days to due date for open obligations. Breach risk. Guard against: rule-computed. |
| Add Invoice-to-term consistency | Invoiced items and rates against terms. Commercial compliance. Guard against: contract version. |
| Run it as one pipeline | Service and invoice event intake (event stream), Obligation rule engine (versioned rules), Evidence linker (source record index), Compliance status scorer (rules with gradient boosting) and Evidence summary agent (LLM with citations), with Contract owner review and Remediation task and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle service data is delayed | Data freshness flag and a pending status. |

**Deliberately not doing**

- Supplier correspondence tone: opinion.
- Contract title: not compliance.
- Owner seniority: not a compliance factor.

**How the approach is proven**

Prove it offline on Rule accuracy against audited compliance decisions, Breach-risk precision and lead time and Citation precision in evidence summaries using time-ordered splits, then online on "Breaches caught before notice deadlines" with "Service credits recovered" as the guardrail. Watch for: Letting the model decide breach, Applying the wrong contract version and Alerting after the deadline.

## Baseline and production design

- **Baseline (build this first):** Quarterly manual review of service reports against the contract.
- **Production design:** A rules and event-processing engine over the obligation register with service-level and commercial checks, a grounded LLM that drafts evidence summaries and interpretation notes with citations and a task workflow that stops at owner approval.

## Why AI, and why this kind

**Why AI.** Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision. The evidence that separates good from bad outcomes (Service-level attainment, Obligation due-date proximity, Invoice-to-term consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model judgement of breach" are what teams reach for first, and they fail because breach is a legal conclusion. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A rules and event-processing engine over the obligation register with service-level and commercial checks, a grounded LLM that drafts evidence summaries and interpretation notes with citations and a task workflow that stops at owner approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Service-level attainment, Obligation due-date proximity, Invoice-to-term consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Quarterly manual review of service reports against the contract | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules and event-processing engine over the obligation register with service-level and commercial checks, a grounded LLM that drafts evidence summaries and interpretation notes with citations and a task workflow that stops at owner approval | chosen | Meets the run-window envelope at $0.223 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Breaches caught before notice deadlines) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the model decide breach.
- Evaluation trap: Applying the wrong contract version.
- Service data is delayed: breach risk is overstated.
- Amendment changes an SLA: wrong target applied.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
