# Admissions & Student Support Assistant: use-case brief

> Generated from the blueprint `edtech/admissions-and-student-support-chatbot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Admissions & Student Support Assistant · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed. The system has to run interactively, within a few seconds, inside these limits: Accuracy on deadlines and fees, Version-aware policies and Multilingual.

**Why it is hard.** The obvious approach is static training data, and it fails because deadlines and fees change every year. The second trap is in "Escalation": the real signal is confidence and topic-based handoff, while teams usually reach for always answering.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $149.9K a month. A mistake is expensive in the way wrong-answer complaints measures it.

**What success looks like.** Offline: Answer correctness on golden FAQs and Citation support rate. Online: Deflection with satisfaction and Wrong-answer complaints. The launch is judged on "Deflection with satisfaction" while "Wrong-answer complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{KB})+\lambda\,\mathrm{PolicyError}`

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
| \text{KB} | The knowledge base of approved admissions and support information the chatbot answers from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyError} | Penalty when the answer contradicts institutional policy. |

**Hard constraints**

- Accuracy on deadlines and fees
- Version-aware policies
- Multilingual
- Sensitive cases escalated

## The approach in one paragraph

Start with fAQ search and email support. Then earn the move to rAG assistant over versioned official content with citation verification, sensitive-topic router and staff handoff with context, and only if it beats the baseline on Answer correctness on golden FAQs and Citation support rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Source recency | Effective date of cited document. Correctness. Guard against: metadata. |
| Add Answer support rate | Claims supported by cited documents. Faithfulness. Guard against: nLI. |
| Add Escalation precision | Handoffs that needed staff. Efficiency. Guard against: review. |
| Run it as one pipeline | Chat gateway (web and WhatsApp), Intent and risk router (classifier), Retriever (hybrid search), Answer LLM (grounded), Citation verifier (entailment) and Staff handoff (human), with Feedback and gaps off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy changed this week | Change feed triggers re-index and shows effective dates. |

**Deliberately not doing**

- Chat length: weak.
- Greeting style: none.

**How the approach is proven**

Prove it offline on Answer correctness on golden FAQs and Citation support rate using time-ordered splits, then online on "Deflection with satisfaction" with "Wrong-answer complaints" as the guardrail. Watch for: Golden set not updated for the new cycle and Counting deflection as success.

## Baseline and production design

- **Baseline (build this first):** FAQ search and email support.
- **Production design:** RAG assistant over versioned official content with citation verification, sensitive-topic router and staff handoff with context.

## Why AI, and why this kind

**Why AI.** Answer applicants' and students' questions about admissions, fees, deadlines and services accurately, escalating to staff when needed. The evidence that separates good from bad outcomes (Source recency, Answer support rate, Escalation precision) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static training data" are what teams reach for first, and they fail because deadlines and fees change every year. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: RAG assistant over versioned official content with citation verification, sensitive-topic router and staff handoff with context.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Source recency, Answer support rate, Escalation precision and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: FAQ search and email support | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| RAG assistant over versioned official content with citation verification, sensitive-topic router and staff handoff with context | chosen | Meets the 2500 ms envelope at $3.33 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Deflection with satisfaction) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Golden set not updated for the new cycle.
- Evaluation trap: Counting deflection as success.
- Policy changed this week: assistant quotes the old deadline.
- Applicants ask about individual admission chances: assistant overpromises.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
