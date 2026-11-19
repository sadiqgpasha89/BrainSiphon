# Ledger & Journal Entry Anomaly Audit: use-case brief

> Generated from the blueprint `fintech/ledger-journal-entry-anomaly-audit` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ledger & Journal Entry Anomaly Audit · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods. The system has to run as a scheduled batch job, inside these limits: Full population testing not sampling, Explainable flags and Segregation-of-duties awareness.

**Why it is hard.** The obvious approach is random sampling of 5%, and it fails because fraud hides in entries the sample missed. The second trap is in "Context": the real signal is peer-group baselines by account, preparer and period, while teams usually reach for global thresholds.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to complete testing measures it.

**What success looks like.** Offline: Precision at auditor capacity and Recall on seeded anomalies. Online: Findings per hundred hours and Time to complete testing. The launch is judged on "Findings per hundred hours" while "Time to complete testing" must not get worse.

## Objective, loss and constraints

**Business objective.** Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\beta\,\mathrm{KL}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |
| \beta | Weight on the KL term that keeps the learned code close to a standard normal distribution: how strongly it counts against the main objective. |
| \mathrm{KL} | Kullback-Leibler divergence: how far the learned code distribution is from the standard normal prior. |

**Hard constraints**

- Full population testing not sampling
- Explainable flags
- Segregation-of-duties awareness
- Quarterly audit cycle

## The approach in one paragraph

Start with benford's law tests and fixed rule checks. Then earn the move to peer-group autoencoder plus isolation forest ensemble with rule-based hard checks and LLM-generated flag explanations, and only if it beats the baseline on Precision at auditor capacity and Recall on seeded anomalies after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Round-amount and just-below-threshold | Proximity to approval limits. Structuring. Guard against: limits as-of date. |
| Add Unusual preparer-account pair | Rarity of this user posting to this account. Control override cue. Guard against: use history before the entry. |
| Add Posting time anomaly | Weekend or night postings relative to peer pattern. Manual override sign. Guard against: timezone normalised. |
| Run it as one pipeline | GL extract (ERP connector), Peer-group builder (clustering), Anomaly ensemble (autoencoder plus isolation forest), Rule checks (hard controls), Explanation generator (LLM with citations) and Finding outcomes (feedback), with Auditor workbench off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle quarter-end close creates posting spikes | Period-aware peer baselines. |

**Deliberately not doing**

- Description length: no risk content.
- Entry sequence: arbitrary.

**How the approach is proven**

Prove it offline on Precision at auditor capacity and Recall on seeded anomalies using time-ordered splits, then online on "Findings per hundred hours" with "Time to complete testing" as the guardrail. Watch for: Seeded anomalies unlike real fraud and Labels reflect auditor attention, not true risk.

## Baseline and production design

- **Baseline (build this first):** Benford's law tests and fixed rule checks.
- **Production design:** Peer-group autoencoder plus isolation forest ensemble with rule-based hard checks and LLM-generated flag explanations.

## Why AI, and why this kind

**Why AI.** Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods. The evidence that separates good from bad outcomes (Round-amount and just-below-threshold, Unusual preparer-account pair, Posting time anomaly) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random sampling of 5%" are what teams reach for first, and they fail because fraud hides in entries the sample missed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Peer-group autoencoder plus isolation forest ensemble with rule-based hard checks and LLM-generated flag explanations.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Round-amount and just-below-threshold, Unusual preparer-account pair, Posting time anomaly and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Benford's law tests and fixed rule checks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Peer-group autoencoder plus isolation forest ensemble with rule-based hard checks and LLM-generated flag explanations | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Findings per hundred hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Seeded anomalies unlike real fraud.
- Evaluation trap: Labels reflect auditor attention, not true risk.
- Quarter-end close creates posting spikes: thousands of normal adjustments get flagged.
- ERP migration changes account structure: baselines break.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
