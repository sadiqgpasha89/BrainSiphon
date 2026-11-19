# Data Clean-Room Audience Matching & Measurement: use-case brief

> Generated from the blueprint `adtech/clean-room-audience-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Clean-Room Audience Matching & Measurement · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. The system has to run as a scheduled batch job, inside these limits: No row-level data leaves the room, Query privacy rules and Match rate transparency.

**Why it is hard.** The obvious approach is plain-text joins, and it fails because plaintext sharing violates policy. The second trap is in "Output": the real signal is aggregate outputs with thresholds, while teams usually reach for exportable user lists.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way advertiser adoption measures it.

**What success looks like.** Offline: Match rate and precision and Lift estimate error. Online: Time to insight and Advertiser adoption. The launch is judged on "Time to insight" while "Advertiser adoption" must not get worse.

## Objective, loss and constraints

**Business objective.** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{match})+\lambda\,\mathrm{PrivacyLeakagePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{match} | The label: 1 if two records match between the partners, 0 if not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PrivacyLeakagePenalty} | Penalty when the matching process reveals more about individuals than the clean-room rules allow. |

**Hard constraints**

- No row-level data leaves the room
- Query privacy rules
- Match rate transparency
- Governance

## The approach in one paragraph

Start with third-party cookie matching. Then earn the move to pSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room, and only if it beats the baseline on Match rate and precision and Lift estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Match key quality | Hashed email normalisation consistency. Match rate. Guard against: normalisation. |
| Add Overlap estimate | Intersection size with noise. Planning. Guard against: dP. |
| Add Conversion lift in joined population | Measured lift. Value. Guard against: controls. |
| Run it as one pipeline | Advertiser data (secure upload), Normaliser (hashing rules), PSI matcher (secure computation), Aggregate query engine (privacy rules) and Model trainer (in-room), with Analyst output and Governance audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle match keys normalised differently | Shared normalisation spec and validators. |

**Deliberately not doing**

- Raw emails: not shared.
- Free-text addresses: messy.

**How the approach is proven**

Prove it offline on Match rate and precision and Lift estimate error using time-ordered splits, then online on "Time to insight" with "Advertiser adoption" as the guardrail. Watch for: Evaluating match rate without precision and Ignoring leakage tests.

## Baseline and production design

- **Baseline (build this first):** Third-party cookie matching.
- **Production design:** PSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room.

## Why AI, and why this kind

**Why AI.** Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data. The evidence that separates good from bad outcomes (Match key quality, Overlap estimate, Conversion lift in joined population) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "plain-text joins" are what teams reach for first, and they fail because plaintext sharing violates policy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: PSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Match key quality, Overlap estimate, Conversion lift in joined population and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Third-party cookie matching | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| PSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room | chosen | Meets the run-window envelope at $0.361 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to insight) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating match rate without precision.
- Evaluation trap: Ignoring leakage tests.
- Match keys normalised differently: the two parties normalise emails differently and the match rate falls far below expectations.
- Differencing attacks via repeated queries: membership leak.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
