# Delay Claims Analysis: use-case brief

> Generated from the blueprint `engineering/delay-claims-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Delay Claims Analysis · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review. The system has to run as a scheduled batch job, inside these limits: Every finding cites schedule updates and records, Methods named and repeatable and Delay experts and counsel decide positions.

**Why it is hard.** The obvious approach is a custom score, and it fails because courts and tribunals need accepted methods. The second trap is in "Evidence": the real signal is contemporaneous records, while teams usually reach for recollection.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.2K a month. A mistake is expensive in the way evidence completeness measures it.

**What success looks like.** Offline: Method reproducibility, Event linking accuracy and Expert acceptance. Online: Time to prepare claims, Evidence completeness and Claim outcomes. The launch is judged on "Time to prepare claims" while "Evidence completeness" must not get worse.

## Objective, loss and constraints

**Business objective.** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review.

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

- Every finding cites schedule updates and records
- Methods named and repeatable
- Delay experts and counsel decide positions
- Records handled under legal hold
- Analysis of 200 updates per project

## The approach in one paragraph

Start with delay experts reconstructing the programme from archives by hand, because it is the standard approach. Then earn the move to an analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts, and only if it beats the baseline on Method reproducibility and Event linking accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Schedule update history | Planned versus actual by update. Core. Guard against: from schedule archives. |
| Add Delay events | Notices, changes and weather days. Core. Guard against: from records. |
| Add Critical path changes | Path shifts. Cause. Guard against: from schedule analysis. |
| Run it as one pipeline | Version alignment (rules), Delay method run (schedule analysis), Event and record linking (NLP) and Evidence pack (report), with Schedule archive intake, Expert review and Counsel review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing updates | State gaps and limits. |

**Deliberately not doing**

- Author name: personal data.
- Letter format: an artefact.
- File date: an artefact.

**How the approach is proven**

Prove it offline on Method reproducibility, Event linking accuracy and Expert acceptance using time-ordered splits, then online on "Time to prepare claims" with "Evidence completeness" as the guardrail. Watch for: Custom scores, Recollection as evidence and Liability decided by the model.

## Baseline and production design

- **Baseline (build this first):** Delay experts reconstructing the programme from archives by hand, because it is the standard approach.
- **Production design:** An analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts.

## Why AI, and why this kind

**Why AI.** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review. The evidence that separates good from bad outcomes (Schedule update history, Delay events, Critical path changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A custom score" are what teams reach for first, and they fail because courts and tribunals need accepted methods. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: An analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Schedule update history, Delay events, Critical path changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Delay experts reconstructing the programme from archives by hand, because it is the standard approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts | chosen | Meets the run-window envelope at $0.050 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to prepare claims) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Custom scores.
- Evaluation trap: Recollection as evidence.
- Missing updates: schedule updates are not archived.
- Retroactive changes: updates were edited later.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
