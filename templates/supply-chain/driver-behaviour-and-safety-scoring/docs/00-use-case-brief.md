# Driver Behaviour & Safety Scoring: use-case brief

> Generated from the blueprint `supply-chain/driver-behaviour-and-safety-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Driver Behaviour & Safety Scoring · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties. The system has to run as a scheduled batch job, inside these limits: Driver privacy, Fair normalisation by route and vehicle and Coaching programme integration.

**Why it is hard.** The obvious approach is raw event counts, and it fails because urban routes generate more harsh braking. The second trap is in "Action": the real signal is coaching targeted at specific behaviours, while teams usually reach for single overall rank.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 69 at peak, at an estimated $3.2K a month. A mistake is expensive in the way coaching completion measures it.

**What success looks like.** Offline: Calibration of incident rate by decile and Stability of scores. Online: Accident rate and Coaching completion. The launch is judged on "Accident rate" while "Coaching completion" must not get worse.

## Objective, loss and constraints

**Business objective.** Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties.

**Training objective.** `\mathcal{L}=\mathrm{PoissonDeviance}(\text{incidents},\hat\lambda)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{PoissonDeviance} | Poisson deviance: a loss for count outcomes that measures how far predicted rates are from observed counts. |
| \text{incidents} | The number of safety incidents a driver had. |
| \hat{\lambda} | The predicted incident rate for the driver. |

**Hard constraints**

- Driver privacy
- Fair normalisation by route and vehicle
- Coaching programme integration
- Union agreements

## The approach in one paragraph

Start with rule-based scorecard. Then earn the move to context-normalised event model feeding a Poisson GBDT predicting incident risk, with coach-friendly behaviour breakdowns, and only if it beats the baseline on Calibration of incident rate by decile and Stability of scores after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Harsh events by context | Brake and cornering events normalised. Behaviour. Guard against: road type. |
| Add Following distance and distraction | Video-based events. Strong predictor. Guard against: camera consent. |
| Add Speeding percentage | Share over limit. Risk. Guard against: limit map. |
| Run it as one pipeline | Telematics and video events (vendor), Context enricher (map matching), Event normaliser (stats), Risk model (Poisson GBDT), Coaching recommender (rules), Safety manager (human) and Incident records (labels). |
| Optimise the right thing | The objective weighs poisson deviance: a loss for count outcomes that measures how far predicted rates are from observed counts, so the model is trained on the cost of the decision and not on a generic score. |
| Handle camera blocked or disabled | Coverage monitoring and data-quality flags. |

**Deliberately not doing**

- Driver tenure: confounded.
- Vehicle plate: none.

**How the approach is proven**

Prove it offline on Calibration of incident rate by decile and Stability of scores using time-ordered splits, then online on "Accident rate" with "Coaching completion" as the guardrail. Watch for: Incident labels sparse and Evaluating on drivers who changed behaviour due to coaching.

## Baseline and production design

- **Baseline (build this first):** Rule-based scorecard.
- **Production design:** Context-normalised event model feeding a Poisson GBDT predicting incident risk, with coach-friendly behaviour breakdowns.

## Why AI, and why this kind

**Why AI.** Score driver safety from telematics and video events to target coaching and reduce accidents without unfair penalties. The evidence that separates good from bad outcomes (Harsh events by context, Following distance and distraction, Speeding percentage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw event counts" are what teams reach for first, and they fail because urban routes generate more harsh braking. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Context-normalised event model feeding a Poisson GBDT predicting incident risk, with coach-friendly behaviour breakdowns.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Harsh events by context, Following distance and distraction, Speeding percentage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based scorecard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Context-normalised event model feeding a Poisson GBDT predicting incident risk, with coach-friendly behaviour breakdowns | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Accident rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Incident labels sparse.
- Evaluation trap: Evaluating on drivers who changed behaviour due to coaching.
- Camera blocked or disabled: a covered or unplugged camera produces no events, so risky drivers look perfectly safe.
- Different vehicles have different brake thresholds: vehicle-specific braking thresholds make some drivers look worse for reasons they do not control.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
