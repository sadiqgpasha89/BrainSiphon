# Records System Misuse Detection: use-case brief

> Generated from the blueprint `public-safety/records-system-misuse-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Records System Misuse Detection · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review. The system has to run as a scheduled batch job, inside these limits: Leads reviewed by professional standards staff, No action from a score alone and Case link and purpose checks first.

**Why it is hard.** The obvious approach is alert counts, and it fails because alerts include normal rare lookups. The second trap is in "Rule": the real signal is access without a legitimate case link or purpose, while teams usually reach for unusual volume alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way time to detect measures it.

**What success looks like.** Offline: Precision at review capacity, Recall on seeded misuse and Parity across units. Online: Misuse found, Time to detect and Leads closed as normal. The launch is judged on "Misuse found" while "Time to detect" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Leads reviewed by professional standards staff
- No action from a score alone
- Case link and purpose checks first
- Access to this system itself is logged
- 100K staff

## The approach in one paragraph

Start with periodic audits of random queries, because it is the standard control. Then earn the move to a rules and model hybrid that flags lookups with no valid purpose and unusual patterns relative to role peers, with a review workflow and fairness monitoring, and only if it beats the baseline on Precision at review capacity and Recall on seeded misuse after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Case link present | Whether a case or purpose is recorded. Core. Guard against: from logs. |
| Add Lookup pattern | Lookups of celebrities, relatives or colleagues. Risk. Guard against: from matching rules. |
| Add Volume against role peers | Queries compared with peers. Anomaly. Guard against: from logs. |
| Run it as one pipeline | Access log intake (records systems), Purpose and case-link check (rules), Peer comparison (anomaly model), Lead ranking (rules) and Outcome capture (case system), with Standards review and Fairness review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shift work | Role and shift features. |

**Deliberately not doing**

- Staff name: personal data in the model.
- Rank alone: weak link.
- Unit name alone: weak link.

**How the approach is proven**

Prove it offline on Precision at review capacity, Recall on seeded misuse and Parity across units using time-ordered splits, then online on "Misuse found" with "Time to detect" as the guardrail. Watch for: Action from scores, Volume-only rules and Unequal scrutiny.

## Baseline and production design

- **Baseline (build this first):** Periodic audits of random queries, because it is the standard control.
- **Production design:** A rules and model hybrid that flags lookups with no valid purpose and unusual patterns relative to role peers, with a review workflow and fairness monitoring.

## Why AI, and why this kind

**Why AI.** Detect unusual access to police and justice databases that may be misuse, such as lookups with no case link, and send leads to professional standards for review. The evidence that separates good from bad outcomes (Case link present, Lookup pattern, Volume against role peers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alert counts" are what teams reach for first, and they fail because alerts include normal rare lookups. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A rules and model hybrid that flags lookups with no valid purpose and unusual patterns relative to role peers, with a review workflow and fairness monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Case link present, Lookup pattern, Volume against role peers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Periodic audits of random queries, because it is the standard control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules and model hybrid that flags lookups with no valid purpose and unusual patterns relative to role peers, with a review workflow and fairness monitoring | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Misuse found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Action from scores.
- Evaluation trap: Volume-only rules.
- Shift work: access at night is normal.
- Cross-unit support: staff work outside their unit.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
