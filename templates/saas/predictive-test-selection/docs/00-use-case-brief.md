# Predictive Test Selection: use-case brief

> Generated from the blueprint `saas/predictive-test-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Test Selection · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions. The system has to run interactively, within a few seconds, inside these limits: Catch 99%+ of failures, Compute budget and Fresh test-failure history.

**Why it is hard.** The obvious approach is run everything or file-path rules, and it fails because running all tests doesn't scale. The second trap is in "Safety": the real signal is periodic full runs and risk floors, while teams usually reach for trust the model only.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $6.6K a month. A mistake is expensive in the way cI minutes per commit measures it.

**What success looks like.** Offline: Recall of failing tests at budget and CI time saved. Online: Escaped regressions and CI minutes per commit. The launch is judged on "Escaped regressions" while "CI minutes per commit" must not get worse.

## Objective, loss and constraints

**Business objective.** Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{test fails}\mid\text{change,test})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{test fails} | Whether the test fails on this change. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| \text{change,test} | The code change and the test being considered. |

**Hard constraints**

- Catch 99%+ of failures
- Compute budget
- Fresh test-failure history
- Always run critical suites

## The approach in one paragraph

Start with run tests mapped by directory. Then earn the move to gradient-boosted failure predictor with dependency-graph features, risk-based budgets and scheduled full runs for calibration, and only if it beats the baseline on Recall of failing tests at budget and CI time saved after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around File-test co-failure history | Tests failing when file changed. Link. Guard against: window. |
| Add Change size and risk | Lines, files, authors. Risk. Guard against: metadata. |
| Add Test historical failure rate | Prior fail rate. Prior. Guard against: matured. |
| Run it as one pipeline | Change event (VCS), Feature builder (change and graph), Failure predictor (GBDT), Selector (budgeted top-k), CI executor (test runners), Safety net (scheduled full runs) and Outcome logging (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new test with no history | Exploration slots and default inclusion for new tests. |

**Deliberately not doing**

- Commit message: weak.
- Author: personal.

**How the approach is proven**

Prove it offline on Recall of failing tests at budget and CI time saved using time-ordered splits, then online on "Escaped regressions" with "CI minutes per commit" as the guardrail. Watch for: Evaluating with selected-only outcomes and History of past selection biases data.

## Baseline and production design

- **Baseline (build this first):** Run tests mapped by directory.
- **Production design:** Gradient-boosted failure predictor with dependency-graph features, risk-based budgets and scheduled full runs for calibration.

## Why AI, and why this kind

**Why AI.** Select the subset of tests most likely to fail for a code change, cutting CI time dramatically while catching nearly all regressions. The evidence that separates good from bad outcomes (File-test co-failure history, Change size and risk, Test historical failure rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "run everything or file-path rules" are what teams reach for first, and they fail because running all tests doesn't scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient-boosted failure predictor with dependency-graph features, risk-based budgets and scheduled full runs for calibration.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among File-test co-failure history, Change size and risk, Test historical failure rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Run tests mapped by directory | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted failure predictor with dependency-graph features, risk-based budgets and scheduled full runs for calibration | chosen | Meets the 2500 ms envelope at $0.0036 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Escaped regressions) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating with selected-only outcomes.
- Evaluation trap: History of past selection biases data.
- New test with no history: a brand-new test has no failure history, is never selected and its regressions escape.
- Large refactor touches many modules: selection misses.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
