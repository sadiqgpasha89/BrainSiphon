# Knowledge Article Generation from Tickets: use-case brief

> Generated from the blueprint `it-ops/knowledge-article-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Article Generation from Tickets · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication. The system has to run as a scheduled batch job, inside these limits: Personal data removed from drafts, Expert approves every article and Articles link to the source tickets.

**Why it is hard.** The obvious approach is every closed ticket, and it fails because many closes are workarounds. The second trap is in "Privacy": the real signal is redacted drafts, while teams usually reach for raw transcripts.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way deflection rate measures it.

**What success looks like.** Offline: Redaction recall, Article accuracy on expert review and Duplicate detection. Online: Knowledge coverage of top issues, Deflection rate and Articles with negative feedback. The launch is judged on "Knowledge coverage of top issues" while "Deflection rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication.

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

- Personal data removed from drafts
- Expert approves every article
- Articles link to the source tickets
- Duplicate articles flagged
- 20K drafts per year

## The approach in one paragraph

Start with agents writing articles after solving issues when time allows, because it is the usual practice. Then earn the move to a drafting pipeline that selects recurring confirmed fixes, writes redacted articles with steps and checks, finds duplicates and queues them to experts, and only if it beats the baseline on Redaction recall and Article accuracy on expert review after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Resolution steps | The fix recorded in the ticket. Content. Guard against: from the ticket. |
| Add Recurrence count | How often the issue appears. Priority. Guard against: from history. |
| Add Existing article match | Similar published articles. Dedup. Guard against: from the knowledge base. |
| Run it as one pipeline | Candidate ticket selection (ITSM), Redaction (pattern and model), Article drafting (LLM), Duplicate check (search) and Publication (knowledge base), with Expert review and Usage feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle incorrect fix | Require confirmation signals. |

**Deliberately not doing**

- Requester name: personal data.
- Agent name: irrelevant.
- Ticket number: an identifier.

**How the approach is proven**

Prove it offline on Redaction recall, Article accuracy on expert review and Duplicate detection using time-ordered splits, then online on "Knowledge coverage of top issues" with "Deflection rate" as the guardrail. Watch for: Auto-publishing, Raw transcripts in articles and Every closed ticket as source.

## Baseline and production design

- **Baseline (build this first):** Agents writing articles after solving issues when time allows, because it is the usual practice.
- **Production design:** A drafting pipeline that selects recurring confirmed fixes, writes redacted articles with steps and checks, finds duplicates and queues them to experts.

## Why AI, and why this kind

**Why AI.** Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication. The evidence that separates good from bad outcomes (Resolution steps, Recurrence count, Existing article match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "every closed ticket" are what teams reach for first, and they fail because many closes are workarounds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting pipeline that selects recurring confirmed fixes, writes redacted articles with steps and checks, finds duplicates and queues them to experts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Resolution steps, Recurrence count, Existing article match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Agents writing articles after solving issues when time allows, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting pipeline that selects recurring confirmed fixes, writes redacted articles with steps and checks, finds duplicates and queues them to experts | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Knowledge coverage of top issues) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Auto-publishing.
- Evaluation trap: Raw transcripts in articles.
- Incorrect fix: the recorded fix was a workaround.
- Outdated product: the article covers a retired version.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
