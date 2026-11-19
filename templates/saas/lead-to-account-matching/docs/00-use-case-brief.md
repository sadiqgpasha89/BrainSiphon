# Lead-to-Account Matching & Entity Resolution: use-case brief

> Generated from the blueprint `saas/lead-to-account-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lead-to-Account Matching & Entity Resolution · **Domain:** saas · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics. The system has to run as a scheduled batch job, inside these limits: Millions of records, Precision above 99% for merges and Domain and name variations.

**Why it is hard.** The obvious approach is all-pairs comparison, and it fails because n-squared is impossible at CRM scale. The second trap is in "Hierarchy": the real signal is parent-subsidiary account hierarchies, while teams usually reach for flat accounts.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way routing conflicts measures it.

**What success looks like.** Offline: Pairwise precision at 99% and Cluster purity. Online: Duplicate rate and Routing conflicts. The launch is judged on "Duplicate rate" while "Routing conflicts" must not get worse.

## Objective, loss and constraints

**Business objective.** Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{same entity})+\lambda\,\mathrm{TransitivityPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{same entity} | The label: 1 if a lead and an account are the same company. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TransitivityPenalty} | Penalty when matches are inconsistent across a group of records. |

**Hard constraints**

- Millions of records
- Precision above 99% for merges
- Domain and name variations
- Audit trail

## The approach in one paragraph

Start with exact match on email domain. Then earn the move to blocking, GBDT pair scorer, correlation clustering with hierarchy awareness, and human-reviewed merges for ambiguous cases, and only if it beats the baseline on Pairwise precision at 99% and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Email domain match | Normalised company domain. Strong link. Guard against: free-mail exclusion. |
| Add Company name similarity | Token-based and embedding similarity. Candidate. Guard against: legal suffix normalisation. |
| Add Location and phone overlap | Shared location data. Disambiguation. Guard against: formats. |
| Run it as one pipeline | CRM and marketing records (ELT), Normaliser (standardisation), Blocking (key buckets), Pair scorer (GBDT), Cluster builder (correlation clustering) and Golden record store (MDM), with Data steward review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle free-mail domains (gmail.com) | Free-mail blocklist and name-based fallback. |

**Deliberately not doing**

- Record creation date: arbitrary.
- Owner ID: personal.

**How the approach is proven**

Prove it offline on Pairwise precision at 99% and Cluster purity using time-ordered splits, then online on "Duplicate rate" with "Routing conflicts" as the guardrail. Watch for: Positive labels only from exact matches and Ignoring hierarchy in evaluation.

## Baseline and production design

- **Baseline (build this first):** Exact match on email domain.
- **Production design:** Blocking, GBDT pair scorer, correlation clustering with hierarchy awareness, and human-reviewed merges for ambiguous cases.

## Why AI, and why this kind

**Why AI.** Match leads, contacts and accounts across CRM and marketing systems, deduplicating entities for reliable routing and analytics. The evidence that separates good from bad outcomes (Email domain match, Company name similarity, Location and phone overlap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "all-pairs comparison" are what teams reach for first, and they fail because N-squared is impossible at CRM scale. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Blocking, GBDT pair scorer, correlation clustering with hierarchy awareness, and human-reviewed merges for ambiguous cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Email domain match, Company name similarity, Location and phone overlap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Exact match on email domain | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Blocking, GBDT pair scorer, correlation clustering with hierarchy awareness, and human-reviewed merges for ambiguous cases | chosen | Meets the run-window envelope at $0.104 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Duplicate rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Positive labels only from exact matches.
- Evaluation trap: Ignoring hierarchy in evaluation.
- Free-mail domains (gmail.com): unrelated leads merged by domain.
- Acquisitions change company structure: stale hierarchy.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
