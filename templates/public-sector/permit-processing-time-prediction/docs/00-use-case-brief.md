# Permit Processing Time Prediction: use-case brief

> Generated from the blueprint `public-sector/permit-processing-time-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Permit Processing Time Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict how long each permit application will take so applicants get honest timelines and managers balance workloads. The system has to run as a scheduled batch job, inside these limits: Timeline range shown to applicants, Prediction recalculated at each stage and No effect on queue order.

**Why it is hard.** The obvious approach is a promise, and it fails because reviews can stall for reasons outside the office. The second trap is in "Queue": the real signal is first-come order maintained, while teams usually reach for faster for those predicted to be easy.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way calls asking for status measures it.

**What success looks like.** Offline: Calibration of time ranges, Error by permit type and Queue order compliance. Online: Applicant wait time uncertainty, Calls asking for status and Overdue permits. The launch is judged on "Applicant wait time uncertainty" while "Calls asking for status" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict how long each permit application will take so applicants get honest timelines and managers balance workloads.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Timeline range shown to applicants
- Prediction recalculated at each stage
- No effect on queue order
- Aggregated fairness checks
- 200K applications per year

## The approach in one paragraph

Start with the average processing time by permit type published on the website, because it is common. Then earn the move to a quantile model of remaining time by stage with reasons, workload views for managers and a fairness check that queue order is respected, and only if it beats the baseline on Calibration of time ranges and Error by permit type after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Application type and size | Permit class and project size. Complexity. Guard against: from the application. |
| Add Completeness at submission | Missing items at intake. Delay. Guard against: from intake. |
| Add Reviewer queue length | Open work for the review team. Wait. Guard against: from the system. |
| Run it as one pipeline | Workflow event data (permit system), Feature build (stage histories), Timeline model (quantile regression), Reason selection (rules), Applicant timeline (portal), Manager workload view (dashboard) and Accuracy tracking (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy backlog | Backlog features and alerts. |

**Deliberately not doing**

- Applicant name: irrelevant.
- Reviewer name: irrelevant.
- Contractor type: weak link.

**How the approach is proven**

Prove it offline on Calibration of time ranges, Error by permit type and Queue order compliance using time-ordered splits, then online on "Applicant wait time uncertainty" with "Calls asking for status" as the guardrail. Watch for: Staff scoring, Reordering queues and Single-point promises.

## Baseline and production design

- **Baseline (build this first):** The average processing time by permit type published on the website, because it is common.
- **Production design:** A quantile model of remaining time by stage with reasons, workload views for managers and a fairness check that queue order is respected.

## Why AI, and why this kind

**Why AI.** Predict how long each permit application will take so applicants get honest timelines and managers balance workloads. The evidence that separates good from bad outcomes (Application type and size, Completeness at submission, Reviewer queue length) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A promise" are what teams reach for first, and they fail because reviews can stall for reasons outside the office. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A quantile model of remaining time by stage with reasons, workload views for managers and a fairness check that queue order is respected.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Application type and size, Completeness at submission, Reviewer queue length and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The average processing time by permit type published on the website, because it is common | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A quantile model of remaining time by stage with reasons, workload views for managers and a fairness check that queue order is respected | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Applicant wait time uncertainty) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Staff scoring.
- Evaluation trap: Reordering queues.
- Policy backlog: a rule change adds work.
- Missing info: the applicant delays a response.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
