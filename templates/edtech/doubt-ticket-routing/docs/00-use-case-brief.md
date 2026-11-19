# Doubt & Help Ticket Routing: use-case brief

> Generated from the blueprint `edtech/doubt-ticket-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Doubt & Help Ticket Routing · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution. The system has to run in under 100 milliseconds, inside these limits: SLA targets, Teacher availability and Fair load distribution.

**Why it is hard.** The obvious approach is round robin, and it fails because wrong expert wastes time. The second trap is in "Load": the real signal is account for load and SLA, while teams usually reach for best expert for all.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $12.3K a month. A mistake is expensive in the way resolution satisfaction measures it.

**What success looks like.** Offline: Routing accuracy and resolution time and SLA breach rate. Online: Time to first response and Resolution satisfaction. The launch is judged on "Time to first response" while "Resolution satisfaction" must not get worse.

## Objective, loss and constraints

**Business objective.** Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{topic}}+\lambda\,\mathrm{Assignment\ cost}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{topic}} | Cross-entropy for classifying the topic of a student's question. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Assignment\ cost} | Penalty for assigning a ticket to a tutor who is overloaded or not suited to it. |

**Hard constraints**

- SLA targets
- Teacher availability
- Fair load distribution
- Language preferences

## The approach in one paragraph

Start with round-robin assignment by subject. Then earn the move to topic and language classifier with an assignment optimiser balancing expertise, load and SLA, plus automated first-response suggestions, and only if it beats the baseline on Routing accuracy and resolution time and SLA breach rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Topic classification | Topic probabilities. Routing. Guard against: taxonomy. |
| Add Teacher expertise vector | Past resolutions per topic. Matching. Guard against: history. |
| Add Current queue load | Pending tickets. Capacity. Guard against: real-time. |
| Run it as one pipeline | Ticket intake (app), Topic and language classifier (transformer), Expertise lookup (teacher profiles), Assignment optimiser (min-cost matching) and Reassign rules (SLA monitor), with Teacher inbox and Resolution feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for classifying the topic of a student's question, so the model is trained on the cost of the decision and not on a generic score. |
| Handle exam-eve surge | Surge staffing alerts and auto-triage. |

**Deliberately not doing**

- Student name: none.
- Ticket length: weak.

**How the approach is proven**

Prove it offline on Routing accuracy and resolution time and SLA breach rate using time-ordered splits, then online on "Time to first response" with "Resolution satisfaction" as the guardrail. Watch for: Teacher feedback biased and Ignoring load fairness.

## Baseline and production design

- **Baseline (build this first):** Round-robin assignment by subject.
- **Production design:** Topic and language classifier with an assignment optimiser balancing expertise, load and SLA, plus automated first-response suggestions.

## Why AI, and why this kind

**Why AI.** Route student doubts to the best available teacher or TA by topic and expertise, minimising wait and improving resolution. The evidence that separates good from bad outcomes (Topic classification, Teacher expertise vector, Current queue load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "round robin" are what teams reach for first, and they fail because wrong expert wastes time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Topic and language classifier with an assignment optimiser balancing expertise, load and SLA, plus automated first-response suggestions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Topic classification, Teacher expertise vector, Current queue load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Round-robin assignment by subject | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Topic and language classifier with an assignment optimiser balancing expertise, load and SLA, plus automated first-response suggestions | chosen | Meets the 80 ms envelope at $0.272 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first response) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Teacher feedback biased.
- Evaluation trap: Ignoring load fairness.
- Exam-eve surge: a surge the night before exams floods the queue and response times explode.
- Misclassified topic sends to wrong teacher: slow resolution.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
