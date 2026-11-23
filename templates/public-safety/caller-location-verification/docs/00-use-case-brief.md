# Caller Location Verification: use-case brief

> Generated from the blueprint `public-safety/caller-location-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Caller Location Verification · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources. The system has to run interactively, within a few seconds, inside these limits: Candidate locations within 3 s, The call taker confirms before dispatch and Conflicts shown not hidden.

**Why it is hard.** The obvious approach is the first device fix, and it fails because device fixes can be wrong indoors. The second trap is in "Output": the real signal is a ranked list with uncertainty, while teams usually reach for one pin.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $19.8K a month. A mistake is expensive in the way responder wrong-address events measures it.

**What success looks like.** Offline: Rank accuracy against confirmed locations, Median error in metres and Conflict flag precision. Online: Time to confirm a location, Responder wrong-address events and Calls needing a second location check. The launch is judged on "Time to confirm a location" while "Responder wrong-address events" must not get worse.

## Objective, loss and constraints

**Business objective.** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Candidate locations within 3 s
- The call taker confirms before dispatch
- Conflicts shown not hidden
- Indoor and rural accuracy reported
- 5M calls per year

## The approach in one paragraph

Start with the device location shown on a map and the call taker's verbal check, because it is the standard process. Then earn the move to a fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings, and only if it beats the baseline on Rank accuracy against confirmed locations and Median error in metres after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Device location accuracy radius | Reported fix and accuracy. Candidate. Guard against: from the carrier. |
| Add Address text match | Match between spoken address and the gazetteer. Candidate. Guard against: from geocoding. |
| Add Landmark and road mentions | Named landmarks and road names. Disambiguation. Guard against: from transcripts. |
| Run it as one pipeline | Device fix intake (NG911 location services), Address geocoding (gazetteer), Landmark resolution (NLP and gazetteer), Candidate ranking (learned ranker), Conflict flagging (rules), Call taker confirmation (CAD map) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rural address | Landmark matching and a wider uncertainty circle. |

**Deliberately not doing**

- Caller name: personal data.
- Carrier name: weak link.
- Phone model: irrelevant.

**How the approach is proven**

Prove it offline on Rank accuracy against confirmed locations, Median error in metres and Conflict flag precision using time-ordered splits, then online on "Time to confirm a location" with "Responder wrong-address events" as the guardrail. Watch for: Single-pin output, Retaining location histories and Trusting the first device fix.

## Baseline and production design

- **Baseline (build this first):** The device location shown on a map and the call taker's verbal check, because it is the standard process.
- **Production design:** A fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings.

## Why AI, and why this kind

**Why AI.** Combine spoken addresses, device location and map data to propose the most likely incident location for the call taker to confirm, and flag conflicts between sources. The evidence that separates good from bad outcomes (Device location accuracy radius, Address text match, Landmark and road mentions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the first device fix" are what teams reach for first, and they fail because device fixes can be wrong indoors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Device location accuracy radius, Address text match, Landmark and road mentions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: The device location shown on a map and the call taker's verbal check, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A fusion ranker over device fixes, geocoded addresses and landmark matches with an uncertainty radius, shown on the call taker's map with conflict warnings | chosen | Meets the 2500 ms envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to confirm a location) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Single-pin output.
- Evaluation trap: Retaining location histories.
- Rural address: the gazetteer is incomplete.
- High-rise caller: the floor is unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
