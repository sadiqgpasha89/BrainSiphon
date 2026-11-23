# Privileged Access Anomaly Detection: use-case brief

> Generated from the blueprint `it-ops/privileged-access-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Privileged Access Anomaly Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Flag unusual use of privileged accounts, service identities and administrative sessions against role baselines and change records, for security analysts to investigate with context. The system has to run interactively, within a few seconds, inside these limits: Scope limited to privileged and service identities, Alerts reviewed by security with HR involvement only through formal process and Evidence links in every alert.

**Why it is hard.** The obvious approach is alerts ignored by analysts, and it fails because ignored alerts are not negatives. The second trap is in "Context": the real signal is linked change records and tickets, while teams usually reach for behaviour alone.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $3.8K a month. A mistake is expensive in the way unreviewed privileged sessions measures it.

**What success looks like.** Offline: Detection of seeded misuse, False alert rate and Alert context completeness. Online: Misuse found, Unreviewed privileged sessions and Access without change records. The launch is judged on "Misuse found" while "Unreviewed privileged sessions" must not get worse.

## Objective, loss and constraints

**Business objective.** Flag unusual use of privileged accounts, service identities and administrative sessions against role baselines and change records, for security analysts to investigate with context.

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

- Scope limited to privileged and service identities
- Alerts reviewed by security with HR involvement only through formal process
- Evidence links in every alert
- Alert within 5 minutes
- 50K privileged identities

## The approach in one paragraph

Start with quarterly access reviews and manual log checks, because they are the common controls. Then earn the move to a detector on privileged sessions with role baselines and change record linking that opens cases for analysts, with strict access to the alerts and a formal process for any people actions, and only if it beats the baseline on Detection of seeded misuse and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Session activity versus role baseline | Commands and systems accessed. Core. Guard against: from session logs. |
| Add Change record link | Whether a ticket authorises the work. Authorisation. Guard against: from ITSM. |
| Add Time and location context | On-call, travel and working hours. Context. Guard against: from the schedule. |
| Run it as one pipeline | Session and identity log ingestion (privileged access tool), Change record join (ITSM), Role baseline model (time-series and graph) and Alert tiering (rules), with Analyst case, Formal escalation and Detection review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle emergency work | Break-glass records and after-the-fact matching. |

**Deliberately not doing**

- Employee name: personal data.
- Session id: an identifier.
- Manager name: personal data.

**How the approach is proven**

Prove it offline on Detection of seeded misuse, False alert rate and Alert context completeness using time-ordered splits, then online on "Misuse found" with "Unreviewed privileged sessions" as the guardrail. Watch for: Individual profiling, Alerts as discipline evidence and Ignored alerts as negatives.

## Baseline and production design

- **Baseline (build this first):** Quarterly access reviews and manual log checks, because they are the common controls.
- **Production design:** A detector on privileged sessions with role baselines and change record linking that opens cases for analysts, with strict access to the alerts and a formal process for any people actions.

## Why AI, and why this kind

**Why AI.** Flag unusual use of privileged accounts, service identities and administrative sessions against role baselines and change records, for security analysts to investigate with context. The evidence that separates good from bad outcomes (Session activity versus role baseline, Change record link, Time and location context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "alerts ignored by analysts" are what teams reach for first, and they fail because ignored alerts are not negatives. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A detector on privileged sessions with role baselines and change record linking that opens cases for analysts, with strict access to the alerts and a formal process for any people actions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Session activity versus role baseline, Change record link, Time and location context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Quarterly access reviews and manual log checks, because they are the common controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A detector on privileged sessions with role baselines and change record linking that opens cases for analysts, with strict access to the alerts and a formal process for any people actions | chosen | Meets the 2500 ms envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Misuse found) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual profiling.
- Evaluation trap: Alerts as discipline evidence.
- Emergency work: on-call staff act without a ticket.
- New admin role: no baseline exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
