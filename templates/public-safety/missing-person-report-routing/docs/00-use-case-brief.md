# Missing Person Report Completeness and Routing: use-case brief

> Generated from the blueprint `public-safety/missing-person-report-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Missing Person Report Completeness and Routing · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response. The system has to run interactively, within a few seconds, inside these limits: Every report goes to a person immediately, The tool never lowers priority and Completeness prompts in plain language.

**Why it is hard.** The obvious approach is auto-prioritising by predicted risk, and it fails because risk scores can wrongly delay a search. The second trap is in "Role": the real signal is completeness and routing, while teams usually reach for risk assessment of the person.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way duplicate reports found measures it.

**What success looks like.** Offline: Completeness of key fields, Duplicate matching precision and Time to routing. Online: Time to first action, Duplicate reports found and Missing details after intake. The launch is judged on "Time to first action" while "Duplicate reports found" must not get worse.

## Objective, loss and constraints

**Business objective.** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Every report goes to a person immediately
- The tool never lowers priority
- Completeness prompts in plain language
- Linking results reviewed by officers
- 100K reports per year

## The approach in one paragraph

Start with intake officers using checklists, because it is the standard process. Then earn the move to a completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log, and only if it beats the baseline on Completeness of key fields and Duplicate matching precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Missing fields | Key details not yet collected. Prompt. Guard against: from the form. |
| Add Duplicate and linked reports | The same person reported twice. Linking. Guard against: from matching. |
| Add Jurisdiction and location | Where the person was last seen. Routing. Guard against: from GIS. |
| Run it as one pipeline | Completeness check (rules), Duplicate matching (similarity search), Jurisdiction routing (GIS) and Follow-up prompts (reporter channel), with Report intake, Officer review and Audit log off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting details | Show both and ask an officer. |

**Deliberately not doing**

- Person name: personal data.
- Reporter name: personal data.
- Report channel: weak link.

**How the approach is proven**

Prove it offline on Completeness of key fields, Duplicate matching precision and Time to routing using time-ordered splits, then online on "Time to first action" with "Duplicate reports found" as the guardrail. Watch for: Predicted risk scores, Lowering priority automatically and Wide access.

## Baseline and production design

- **Baseline (build this first):** Intake officers using checklists, because it is the standard process.
- **Production design:** A completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log.

## Why AI, and why this kind

**Why AI.** Check missing person reports for missing details, link them to related reports and route them to the right team, with every case treated as urgent by a human who decides the response. The evidence that separates good from bad outcomes (Missing fields, Duplicate and linked reports, Jurisdiction and location) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "auto-prioritising by predicted risk" are what teams reach for first, and they fail because risk scores can wrongly delay a search. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Missing fields, Duplicate and linked reports, Jurisdiction and location and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Intake officers using checklists, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A completeness and duplicate-linking assistant that prompts for missing details and routes each case to a team, with no ranking of urgency and a full log | chosen | Meets the 2500 ms envelope at $0.681 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicted risk scores.
- Evaluation trap: Lowering priority automatically.
- Conflicting details: reports disagree on key facts.
- Cross-border case: the person may have moved.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
