# Real Estate Due-Diligence Document Review: use-case brief

> Generated from the blueprint `real-estate/due-diligence-document-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real Estate Due-Diligence Document Review · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations. The system has to run interactively, within a few seconds, inside these limits: Every issue in the report cites the document and page it comes from, Lawyers review and approve every report and Data-room documents stay confidential and are not used to train shared models.

**Why it is hard.** The obvious approach is reading documents in random order, and it fails because missing documents matter as much as the ones present, and a random read does not reveal gaps. The second trap is in "Issues": the real signal is material issues ranked by severity and value, while teams usually reach for every finding listed with equal weight.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $100.9K a month. A mistake is expensive in the way missed issues measures it.

**What success looks like.** Offline: Issue recall and Citation validity. Online: Review hours and Missed issues. The launch is judged on "Review hours" while "Missed issues" must not get worse.

## Objective, loss and constraints

**Business objective.** Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations.

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

- Every issue in the report cites the document and page it comes from
- Lawyers review and approve every report
- Data-room documents stay confidential and are not used to train shared models
- Coverage is tracked against a per-transaction checklist

## The approach in one paragraph

Start with associates read documents against a checklist, because it is standard. Then earn the move to agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review, and only if it beats the baseline on Issue recall and Citation validity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Checklist coverage | Share of required document types present and reviewed. A direct completeness measure. Guard against: definitions of required vary by deal, so use a template per type. |
| Add Issue precision | Share of flagged issues that a lawyer accepts as real. Measures noise in the report. Guard against: reviewers disagree, so measure agreement as well. |
| Add Citation validity | Share of issues whose cited passage supports the statement. Trust in the report depends on it. Guard against: a passage can be real and still not support the claim, so check entailment. |
| Run it as one pipeline | Data room ingest (vendor), Classifier (model), Checklist matcher (rules) and Issue extractor (LLM), with Report drafter, Lawyer review and Report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing documents | List the missing documents against the checklist and flag the risk in the report. |

**Deliberately not doing**

- Document length: Longer documents are not riskier, and length carries no signal about issues.
- Folder names: Arbitrary labels chosen by the seller's team.
- Dates alone: Weak evidence of relevance unless tied to a clause or event.

**How the approach is proven**

Prove it offline on Issue recall and Citation validity using time-ordered splits, then online on "Review hours" with "Missed issues" as the guardrail. Watch for: Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated and Checklist bias, since the model finds what the checklist already asks for and misses the unusual.

## Baseline and production design

- **Baseline (build this first):** Associates read documents against a checklist, because it is standard.
- **Production design:** Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review.

## Why AI, and why this kind

**Why AI.** Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations. The evidence that separates good from bad outcomes (Checklist coverage, Issue precision, Citation validity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "reading documents in random order" are what teams reach for first, and they fail because missing documents matter as much as the ones present, and a random read does not reveal gaps. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Checklist coverage, Issue precision, Citation validity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Associates read documents against a checklist, because it is standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review | chosen | Meets the 2500 ms envelope at $22.41 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated.
- Evaluation trap: Checklist bias, since the model finds what the checklist already asks for and misses the unusual.
- Missing documents: key documents are missing from the data room.
- Conflicting documents: two documents give different facts about the same item.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
