# Insurance Agent Policy Document Assistant: use-case brief

> Generated from the blueprint `bfsi/agent-policy-document-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Agent Policy Document Assistant · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations. The system has to run interactively, within a few seconds, inside these limits: Every answer cites the clause and the version of the document, The assistant makes no quote, no coverage promise and no binding statement and Questions about coverage decisions go to a human underwriter.

**Why it is hard.** The obvious approach is the latest text for every case, and it fails because using the wrong version creates liability for the insurer. The second trap is in "Scope": the real signal is general information about features and exclusions, while teams usually reach for advice about whether a given loss is covered.

**Scale and stakes.** At 10 million users this is about 12.0M model-touching events a day, 139 requests per second on average and 833 at peak, at an estimated $3.80M a month. A mistake is expensive in the way wrong-version incidents measures it.

**What success looks like.** Offline: Citation validity and Escalation F1. Online: Underwriter queries deflected and Wrong-version incidents. The launch is judged on "Underwriter queries deflected" while "Wrong-version incidents" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations.

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

- Every answer cites the clause and the version of the document
- The assistant makes no quote, no coverage promise and no binding statement
- Questions about coverage decisions go to a human underwriter
- Answers respect the jurisdiction of the policy

## The approach in one paragraph

Start with search over PDFs and a helpdesk, because agents use them. Then earn the move to version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters, and only if it beats the baseline on Citation validity and Escalation F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Citation validity | Share of statements supported by the cited clause. The core quality measure. Guard against: a real clause can still not support the statement, so test entailment. |
| Add Version match | Whether the version cited is the one in force at the policy date. Prevents answers from the wrong wording. Guard against: version metadata are often wrong. |
| Add Escalation precision | Share of escalations that an underwriter agrees were needed. Measures safe refusal behaviour. Guard against: over-refusal makes the assistant unhelpful, so track both. |
| Run it as one pipeline | Document ingest (clause parser), Version index (hybrid search), Question router (classifier), Answer composer (LLM with citations), Verifier (entailment) and Agent portal (web app), with Feedback log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting endorsements | Resolve by the document hierarchy and cite the endorsement together with the base clause. |

**Deliberately not doing**

- Brochure marketing text: Not binding and often differs from the policy wording.
- Agent name: Irrelevant to the answer.
- Question length: Weakly related to difficulty.

**How the approach is proven**

Prove it offline on Citation validity and Escalation F1 using time-ordered splits, then online on "Underwriter queries deflected" with "Wrong-version incidents" as the guardrail. Watch for: Testing only on current documents hides failures on older versions agents still sell and Easy questions in the test set overstate performance on exclusions and endorsements.

## Baseline and production design

- **Baseline (build this first):** Search over PDFs and a helpdesk, because agents use them.
- **Production design:** Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters.

## Why AI, and why this kind

**Why AI.** Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations. The evidence that separates good from bad outcomes (Citation validity, Version match, Escalation precision) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the latest text for every case" are what teams reach for first, and they fail because using the wrong version creates liability for the insurer. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Citation validity, Version match, Escalation precision and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Search over PDFs and a helpdesk, because agents use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters | chosen | Meets the 2500 ms envelope at $10.54 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Underwriter queries deflected) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Testing only on current documents hides failures on older versions agents still sell.
- Evaluation trap: Easy questions in the test set overstate performance on exclusions and endorsements.
- Conflicting endorsements: an endorsement modifies a clause and the base clause is quoted as it stood.
- Out-of-scope request: an agent asks for a coverage decision on a claim.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
