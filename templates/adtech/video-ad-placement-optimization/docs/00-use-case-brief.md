# Video Ad Placement & Pod Optimisation: use-case brief

> Generated from the blueprint `adtech/video-ad-placement-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Video Ad Placement & Pod Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment. The system has to run in under 100 milliseconds, inside these limits: Latency before playback, Ad-load policies and Content-sensitive breaks.

**Why it is hard.** The obvious approach is maximise ad count, and it fails because too many ads reduce retention more than they earn. The second trap is in "Timing": the real signal is natural break points in content, while teams usually reach for fixed intervals.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.0K a month. A mistake is expensive in the way viewer retention measures it.

**What success looks like.** Offline: Simulated revenue and retention and Abandonment hazard calibration. Online: Revenue per viewing hour and Viewer retention. The launch is judged on "Revenue per viewing hour" while "Viewer retention" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment.

**Training objective.** `\max\;\mathbb{E}\!\left[\text{revenue}-\lambda\,\text{abandonment cost}\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{revenue} | Ad revenue earned by the placement. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{abandonment cost} | The cost of viewers leaving because of the ad break, weighted by lambda. |

**Hard constraints**

- Latency before playback
- Ad-load policies
- Content-sensitive breaks
- Viewer experience

## The approach in one paragraph

Start with fixed pre-roll and mid-roll every 10 minutes. Then earn the move to survival model of viewer retention with ad-load policy optimiser and scene-boundary detection for break placement, and only if it beats the baseline on Simulated revenue and retention and Abandonment hazard calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Viewer abandonment hazard | Probability to drop at ad break. Cost. Guard against: history. |
| Add Content break-point score | Scene-boundary detector. Placement. Guard against: model. |
| Add Predicted ad completion | Completion probability by creative. Value. Guard against: prior. |
| Run it as one pipeline | Playback request (player), Viewer state (feature store), Retention hazard model (survival GBDT), Break-point detector (video model), Pod optimiser (constrained search), Ad server (VAST) and Playback analytics (Kafka). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle live sports where breaks are unpredictable | Operator cue integration and short-window decisions. |

**Deliberately not doing**

- Ad ID: none.
- Player version: none.

**How the approach is proven**

Prove it offline on Simulated revenue and retention and Abandonment hazard calibration using time-ordered splits, then online on "Revenue per viewing hour" with "Viewer retention" as the guardrail. Watch for: Observational ad loads confounded with content and Ignoring long-term churn.

## Baseline and production design

- **Baseline (build this first):** Fixed pre-roll and mid-roll every 10 minutes.
- **Production design:** Survival model of viewer retention with ad-load policy optimiser and scene-boundary detection for break placement.

## Why AI, and why this kind

**Why AI.** Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment. The evidence that separates good from bad outcomes (Viewer abandonment hazard, Content break-point score, Predicted ad completion) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximise ad count" are what teams reach for first, and they fail because too many ads reduce retention more than they earn. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Survival model of viewer retention with ad-load policy optimiser and scene-boundary detection for break placement.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Viewer abandonment hazard, Content break-point score, Predicted ad completion and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed pre-roll and mid-roll every 10 minutes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Survival model of viewer retention with ad-load policy optimiser and scene-boundary detection for break placement | chosen | Meets the 80 ms envelope at $0.0088 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Revenue per viewing hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational ad loads confounded with content.
- Evaluation trap: Ignoring long-term churn.
- Live sports where breaks are unpredictable: placement misaligned.
- Ad server timeout at break: the ad server times out at a break and viewers see blank screens or errors.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
