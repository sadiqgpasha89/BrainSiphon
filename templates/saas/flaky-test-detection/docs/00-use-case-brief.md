# Flaky Test Detection & Quarantine: use-case brief

> Generated from the blueprint `saas/flaky-test-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Flaky Test Detection & Quarantine · **Domain:** saas · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact. The system has to run as a scheduled batch job, inside these limits: Millions of test runs per day, Quarantine without hiding real failures and Owner assignment.

**Why it is hard.** The obvious approach is failure count, and it fails because real regressions also fail often. The second trap is in "Action": the real signal is quarantine with owner tickets and timers, while teams usually reach for ignore or auto-retry forever.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 347 at peak, at an estimated $2.4K a month. A mistake is expensive in the way flaky test count measures it.

**What success looks like.** Offline: Precision of flaky labels vs manual review and Quarantine impact on CI pass rate. Online: CI time wasted on retries and Flaky test count. The launch is judged on "CI time wasted on retries" while "Flaky test count" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{flaky},p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{flaky} | The label: 1 if a test passes and fails without a code change. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Millions of test runs per day
- Quarantine without hiding real failures
- Owner assignment
- CI cost

## The approach in one paragraph

Start with retry failed tests up to three times. Then earn the move to statistical flakiness detection on repeated runs, infrastructure-correlation features, auto-quarantine with owner routing and root-cause hints, and only if it beats the baseline on Precision of flaky labels vs manual review and Quarantine impact on CI pass rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Flip rate on same commit | Mixed outcomes on identical code. Flakiness. Guard against: run dedup. |
| Add Failure correlation with infra | Failures concentrate on specific runners. Environment cause. Guard against: metadata. |
| Add Time-dependent failure pattern | Failures by hour or order. Root cause. Guard against: logs. |
| Run it as one pipeline | CI results stream (CI system), Run deduplicator (same-commit grouping), Flakiness scorer (statistics and GBDT), Cause classifier (rules), Quarantine controller (CI config), Owner ticket (issue tracker) and Fix verification (re-runs). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle real regression looks flaky because it fails intermittently | Quarantined tests still run and are tracked with deadlines. |

**Deliberately not doing**

- Test name text: none.
- Duration alone: weak.

**How the approach is proven**

Prove it offline on Precision of flaky labels vs manual review and Quarantine impact on CI pass rate using time-ordered splits, then online on "CI time wasted on retries" with "Flaky test count" as the guardrail. Watch for: Treating all failures as flakiness and Not controlling for code changes.

## Baseline and production design

- **Baseline (build this first):** Retry failed tests up to three times.
- **Production design:** Statistical flakiness detection on repeated runs, infrastructure-correlation features, auto-quarantine with owner routing and root-cause hints.

## Why AI, and why this kind

**Why AI.** Identify and quarantine flaky tests that waste CI time and erode trust, and prioritise fixes by impact. The evidence that separates good from bad outcomes (Flip rate on same commit, Failure correlation with infra, Time-dependent failure pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "failure count" are what teams reach for first, and they fail because real regressions also fail often. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Statistical flakiness detection on repeated runs, infrastructure-correlation features, auto-quarantine with owner routing and root-cause hints.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Flip rate on same commit, Failure correlation with infra, Time-dependent failure pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Retry failed tests up to three times | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Statistical flakiness detection on repeated runs, infrastructure-correlation features, auto-quarantine with owner routing and root-cause hints | chosen | Meets the run-window envelope at $0.0027 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (CI time wasted on retries) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating all failures as flakiness.
- Evaluation trap: Not controlling for code changes.
- Real regression looks flaky because it fails intermittently: bug hidden by quarantine.
- Shared runner problems cause failures across many tests: wrongly blamed tests.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
