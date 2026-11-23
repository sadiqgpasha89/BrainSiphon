# Court Interpreter Assignment Optimisation: use-case brief

> Generated from the blueprint `public-safety/interpreter-assignment-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Court Interpreter Assignment Optimisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well. The system has to run as a scheduled batch job, inside these limits: Qualification rules as hard constraints, Conflicts of interest checked and Coordinator approves assignments.

**Why it is hard.** The obvious approach is preference scoring, and it fails because wrong interpreters harm cases. The second trap is in "Goal": the real signal is hearings covered and travel limited, while teams usually reach for fewest interpreters used.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way interpreter utilisation measures it.

**What success looks like.** Offline: Coverage rate, Constraint violation rate and Travel time. Online: Hearings delayed for interpreters, Interpreter utilisation and Cost per hearing. The launch is judged on "Hearings delayed for interpreters" while "Interpreter utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well.

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

- Qualification rules as hard constraints
- Conflicts of interest checked
- Coordinator approves assignments
- Weekly plan for 3K interpreters

## The approach in one paragraph

Start with coordinators phoning interpreters from a list, because it is the current process. Then earn the move to an assignment optimiser with qualification and conflict constraints, remote options and a coordinator approval step with shortage forecasts, and only if it beats the baseline on Coverage rate and Constraint violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Language and dialect needs | Languages and dialects required. Match. Guard against: from the case file. |
| Add Interpreter qualifications | Certification and specialisms. Constraint. Guard against: from the register. |
| Add Availability and travel time | Calendar and distance. Feasibility. Guard against: from the system. |
| Run it as one pipeline | Hearing and language needs (court system), Interpreter register (HR and register), Constraint model (rules), Assignment optimiser (solver), Coordinator approval (scheduling tool), Notifications (messaging) and Shortage forecast (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare language | Remote pool and early booking. |

**Deliberately not doing**

- Interpreter name: personal data.
- Party name: personal data.
- Case number: an identifier.

**How the approach is proven**

Prove it offline on Coverage rate, Constraint violation rate and Travel time using time-ordered splits, then online on "Hearings delayed for interpreters" with "Interpreter utilisation" as the guardrail. Watch for: Ignoring conflicts, Preference-only scoring and No backup pool.

## Baseline and production design

- **Baseline (build this first):** Coordinators phoning interpreters from a list, because it is the current process.
- **Production design:** An assignment optimiser with qualification and conflict constraints, remote options and a coordinator approval step with shortage forecasts.

## Why AI, and why this kind

**Why AI.** Assign interpreters to hearings by language, qualification, location and availability so hearings are not delayed and interpreter time is used well. The evidence that separates good from bad outcomes (Language and dialect needs, Interpreter qualifications, Availability and travel time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "preference scoring" are what teams reach for first, and they fail because wrong interpreters harm cases. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: An assignment optimiser with qualification and conflict constraints, remote options and a coordinator approval step with shortage forecasts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Language and dialect needs, Interpreter qualifications, Availability and travel time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Coordinators phoning interpreters from a list, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An assignment optimiser with qualification and conflict constraints, remote options and a coordinator approval step with shortage forecasts | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Hearings delayed for interpreters) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Ignoring conflicts.
- Evaluation trap: Preference-only scoring.
- Rare language: very few interpreters exist.
- Last-minute cancellation: the interpreter drops out.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
