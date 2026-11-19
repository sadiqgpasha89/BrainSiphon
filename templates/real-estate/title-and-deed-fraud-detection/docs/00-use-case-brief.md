# Title & Deed Fraud Detection: use-case brief

> Generated from the blueprint `real-estate/title-and-deed-fraud-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Title & Deed Fraud Detection · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect forged deeds, owner impersonation and suspicious transfers before closing or recording. The system has to run interactively, within a few seconds, inside these limits: A human investigator reviews every flagged case before action, Every alert shows the evidence behind it and False positives kept low so legitimate transfers are not delayed.

**Why it is hard.** The obvious approach is a fixed list of rules, and it fails because fraudsters adapt to the rules, and a static list is learned and evaded. The second trap is in "Identity": the real signal is verification that the signer is the true owner, while teams usually reach for the document alone.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.4K a month. A mistake is expensive in the way delays measures it.

**What success looks like.** Offline: PR-AUC and Recall. Online: Fraud prevented and Delays. The launch is judged on "Fraud prevented" while "Delays" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect forged deeds, owner impersonation and suspicious transfers before closing or recording.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |
| z | The embedding of a party, property or notary in the transfer graph. |

**Hard constraints**

- A human investigator reviews every flagged case before action
- Every alert shows the evidence behind it
- False positives kept low so legitimate transfers are not delayed
- Recording deadlines respected, so alerts arrive within hours of filing

## The approach in one paragraph

Start with manual title search and checklists, because they are standard. Then earn the move to graph and tabular models on transfer patterns, document checks and an investigator queue, and only if it beats the baseline on PR-AUC and Recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Ownership change speed | Days between the first filing and the transfer to a new owner or a loan against the property. Fast transfers are typical of fraud. Guard against: legitimate rushed sales exist, so combine with other signals. |
| Add Notary frequency | Number of filings by the same notary in the last 30 days compared with their norm. Rings use a small number of notaries. Guard against: busy notaries are legitimate, so compare with their norm. |
| Add Vacant or no-mortgage property | Flag for property that is vacant or has no mortgage. Fraudsters target properties that nobody is watching. Guard against: data on occupancy are incomplete. |
| Run it as one pipeline | Recording data (registry), Entity graph (graph store), Feature builder (Spark), Fraud model (boosting plus GNN), Document checks (vision) and Outcome log (warehouse), with Investigator queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle elderly owners | Give protective alerts to owners flagged at higher risk and add review before recording. |

**Deliberately not doing**

- Parcel number: An identifier that has no link to fraud.
- Document format: The file format differs between submitters and carries no fraud signal.
- Seller name: A name is personal data and does not indicate fraud.

**How the approach is proven**

Prove it offline on PR-AUC and Recall using time-ordered splits, then online on "Fraud prevented" with "Delays" as the guardrail. Watch for: Few labelled cases and many undetected ones make the recall unknowable and Hidden fraud, since detected cases are those that were easy to detect.

## Baseline and production design

- **Baseline (build this first):** Manual title search and checklists, because they are standard.
- **Production design:** Graph and tabular models on transfer patterns, document checks and an investigator queue.

## Why AI, and why this kind

**Why AI.** Detect forged deeds, owner impersonation and suspicious transfers before closing or recording. The evidence that separates good from bad outcomes (Ownership change speed, Notary frequency, Vacant or no-mortgage property) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A fixed list of rules" are what teams reach for first, and they fail because fraudsters adapt to the rules, and a static list is learned and evaded. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Graph and tabular models on transfer patterns, document checks and an investigator queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Ownership change speed, Notary frequency, Vacant or no-mortgage property and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual title search and checklists, because they are standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph and tabular models on transfer patterns, document checks and an investigator queue | chosen | Meets the 2500 ms envelope at $1.38 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraud prevented) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled cases and many undetected ones make the recall unknowable.
- Evaluation trap: Hidden fraud, since detected cases are those that were easy to detect.
- Elderly owners: elderly owners are targeted by fraudsters and are often victims.
- Estate sales: estate sales look unusual but are legitimate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
