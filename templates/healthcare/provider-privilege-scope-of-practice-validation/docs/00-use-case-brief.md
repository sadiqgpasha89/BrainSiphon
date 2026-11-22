# Provider Privilege & Scope-of-Practice Validation: use-case brief

> Generated from the blueprint `healthcare/provider-privilege-scope-of-practice-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Privilege & Scope-of-Practice Validation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. The system has to run as a scheduled batch job, inside these limits: A rules engine decides eligibility and the model may only prioritise exceptions and never invents clinical authorisation, The medical staff office or authorised committee makes every privilege decision and All rules are versioned with effective dates and cite their bylaw source.

**Why it is hard.** The obvious approach is a learned authorisation score, and it fails because a model cannot grant authority. The second trap is in "Time": the real signal is temporal graph with effective and expiry dates, while teams usually reach for current-state flags.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.6K a month. A mistake is expensive in the way review hours per exception measures it.

**What success looks like.** Offline: Exception ranking precision at the review budget, Rule-evaluation agreement with committee decisions and False-clear rate on adjudicated cases. Online: Assignments flagged before the case date, Review hours per exception and Privilege-mismatch events reaching the day of care. The launch is judged on "Assignments flagged before the case date" while "Review hours per exception" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception.

**Training objective.** `\mathcal{L}=\sum_i w_i\,\mathrm{BCE}(y_i,p_i)\quad y_i=1\ \text{if the committee upholds exception } i`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight on exception i, for example higher for higher-risk procedures. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_i | Whether the committee upheld exception i after review: 1 if it was a real mismatch. |
| p_i | The ranker's probability that exception i will be upheld. |
| i | Index over examples. |

**Hard constraints**

- A rules engine decides eligibility and the model may only prioritise exceptions and never invents clinical authorisation
- The medical staff office or authorised committee makes every privilege decision
- All rules are versioned with effective dates and cite their bylaw source
- Missing evidence is reported as missing not as ineligible
- Temporal reasoning handles effective and expiry dates
- Evaluates 200K proposed assignments per month

## The approach in one paragraph

Start with manual cross-check by medical staff office against the privilege catalogue. Then earn the move to versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source, and only if it beats the baseline on Exception ranking precision at the review budget and Rule-evaluation agreement with committee decisions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Privilege coverage | Procedure code mapped to required privilege vs granted privilege. The core eligibility test. Guard against: catalogue version at the assignment date. |
| Add Credential validity at date | Licence and certification validity on the assignment date. Expired evidence invalidates eligibility. Guard against: use effective dates. |
| Add Supervision requirement | Required supervisor and availability. Some privileges are conditional. Guard against: rules as published. |
| Run it as one pipeline | Credential and privilege intake (credentialing extract and FHIR), Temporal graph builder (graph store with effective dates), Eligibility rules engine (versioned bylaw rules), Exception prioritiser (gradient-boosted ranker) and Explanation and citation builder (rule trace), with Medical staff office review and Decision log and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle bylaws amended mid-year | Versioned rules with effective dates and a rule-change replay. |

**Deliberately not doing**

- Provider case volume as a quality proxy: not an authorisation criterion.
- Seniority: not a privilege.
- Manager request urgency: pressure not evidence.

**How the approach is proven**

Prove it offline on Exception ranking precision at the review budget, Rule-evaluation agreement with committee decisions and False-clear rate on adjudicated cases using time-ordered splits, then online on "Assignments flagged before the case date" with "Review hours per exception" as the guardrail. Watch for: Letting the ranker decide eligibility, Evaluating without effective-date replay and Treating missing evidence as a violation.

## Baseline and production design

- **Baseline (build this first):** Manual cross-check by medical staff office against the privilege catalogue.
- **Production design:** Versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source.

## Why AI, and why this kind

**Why AI.** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. The evidence that separates good from bad outcomes (Privilege coverage, Credential validity at date, Supervision requirement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned authorisation score" are what teams reach for first, and they fail because A model cannot grant authority. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Privilege coverage, Credential validity at date, Supervision requirement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual cross-check by medical staff office against the privilege catalogue | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source | chosen | Meets the run-window envelope at $0.061 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Assignments flagged before the case date) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the ranker decide eligibility.
- Evaluation trap: Evaluating without effective-date replay.
- Bylaws amended mid-year: the old rule is applied.
- Interim privileges: temporary scope is mistaken for permanent.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
