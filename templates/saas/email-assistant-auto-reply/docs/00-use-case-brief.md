# Email Assistant & Smart Replies: use-case brief

> Generated from the blueprint `saas/email-assistant-auto-reply` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Email Assistant & Smart Replies · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends. The system has to run interactively, within a few seconds, inside these limits: Never auto-send sensitive content, Personal style adaptation and Privacy of email.

**Why it is hard.** The obvious approach is auto-send, and it fails because wrong auto-sent emails are unrecoverable. The second trap is in "Style": the real signal is personalise from the user's sent mail with privacy, while teams usually reach for generic tone.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $475.2K a month. A mistake is expensive in the way drafts sent measures it.

**What success looks like.** Offline: Edit distance and acceptance and Priority ranking AUC. Online: Time spent on email and Drafts sent. The launch is judged on "Time spent on email" while "Drafts sent" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{thread,style})`

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
| \text{thread,style} | The email thread and the user's writing style the reply is conditioned on. |

**Hard constraints**

- Never auto-send sensitive content
- Personal style adaptation
- Privacy of email
- Latency under 2 s

## The approach in one paragraph

Start with canned quick replies. Then earn the move to lLM drafting with thread and calendar context, style adapters learned on-device or per-user securely, and a priority ranker, and only if it beats the baseline on Edit distance and acceptance and Priority ranking AUC after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Draft acceptance rate | Drafts sent with few edits. Quality. Guard against: logging. |
| Add Thread context completeness | Referenced entities resolved. Accuracy. Guard against: retrieval. |
| Add Priority score | Importance prediction. Triage. Guard against: feedback. |
| Run it as one pipeline | Inbox event (mail service), Context retriever (thread calendar docs), Draft LLM (personalised), Safety filter (policy), Draft UI (client) and User edit and send (human), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle draft invents a commitment or date | Highlight proposed commitments and require confirmation. |

**Deliberately not doing**

- Email length: weak.
- Sender domain popularity: weak.

**How the approach is proven**

Prove it offline on Edit distance and acceptance and Priority ranking AUC using time-ordered splits, then online on "Time spent on email" with "Drafts sent" as the guardrail. Watch for: Evaluating on generic emails and Ignoring commitment hallucinations.

## Baseline and production design

- **Baseline (build this first):** Canned quick replies.
- **Production design:** LLM drafting with thread and calendar context, style adapters learned on-device or per-user securely, and a priority ranker.

## Why AI, and why this kind

**Why AI.** Draft replies that match the user's tone and context, and triage inbox priorities, with the user always approving sends. The evidence that separates good from bad outcomes (Draft acceptance rate, Thread context completeness, Priority score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "auto-send" are what teams reach for first, and they fail because wrong auto-sent emails are unrecoverable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: LLM drafting with thread and calendar context, style adapters learned on-device or per-user securely, and a priority ranker.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Draft acceptance rate, Thread context completeness, Priority score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Canned quick replies | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LLM drafting with thread and calendar context, style adapters learned on-device or per-user securely, and a priority ranker | chosen | Meets the 2500 ms envelope at $1.76 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time spent on email) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on generic emails.
- Evaluation trap: Ignoring commitment hallucinations.
- Draft invents a commitment or date: user sends a false promise.
- Confidential thread content leaks to another thread: context from a confidential thread appears in a draft for another thread and leaks private details.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
