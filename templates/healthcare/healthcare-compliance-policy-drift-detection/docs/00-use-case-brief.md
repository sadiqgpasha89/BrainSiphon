# Healthcare Compliance Policy Drift Detection: use-case brief

> Generated from the blueprint `healthcare/healthcare-compliance-policy-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Policy Drift Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity. The system has to run as a scheduled batch job, inside these limits: The policy owner validates drift and approves any policy or process change, Semantic comparison proposes candidates and configuration rules decide measurable mismatches and Each candidate cites the policy text and the observed evidence.

**Why it is hard.** The obvious approach is policy text alone, and it fails because drift is a gap between two things. The second trap is in "Rules": the real signal is configuration checks for measurable requirements, while teams usually reach for semantic judgment for settings.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to policy or process correction measures it.

**What success looks like.** Offline: Drift precision at the review capacity, Recall on seeded drift and Severity agreement with owners. Online: Drift found before an audit finding, Time to policy or process correction and Owner time per review. The launch is judged on "Drift found before an audit finding" while "Time to policy or process correction" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity.

**Training objective.** `\mathcal{L}=-\sum_i\log p_\theta(y_i\mid x_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x_i | The input features describing one example (what the model sees). (one value per example i) |

**Hard constraints**

- The policy owner validates drift and approves any policy or process change
- Semantic comparison proposes candidates and configuration rules decide measurable mismatches
- Each candidate cites the policy text and the observed evidence
- Severity follows an approved scale
- Compares 8K policies against operational records monthly
- Employee-level activity is aggregated and never used to name individuals

## The approach in one paragraph

Start with a periodic manual comparison of policies against procedures. Then earn the move to semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list, and only if it beats the baseline on Drift precision at the review capacity and Recall on seeded drift after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Semantic divergence | Distance between policy statements and procedure statements. Finds text drift. Guard against: version pair. |
| Add Configuration mismatch | Observed setting against the required value. Finds measurable drift. Guard against: snapshot time. |
| Add Training coverage gap | Share of in-scope staff trained on the current version. Practice drift risk. Guard against: training records. |
| Run it as one pipeline | Policy and record intake (document and configuration extracts), Policy statement extractor (document AI), Semantic comparator (embeddings and cross-encoder), Configuration rule checks (deterministic rules) and Process variant detector (process mining), with Policy owner review and Review outcome and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy updated but procedures lag | Effective-date grace period. |

**Deliberately not doing**

- Document formatting: layout.
- Author name: not drift.
- Policy length: not risk.

**How the approach is proven**

Prove it offline on Drift precision at the review capacity, Recall on seeded drift and Severity agreement with owners using time-ordered splits, then online on "Drift found before an audit finding" with "Time to policy or process correction" as the guardrail. Watch for: Treating text distance as risk, Reporting unknown settings as compliant and Naming individuals in drift output.

## Baseline and production design

- **Baseline (build this first):** A periodic manual comparison of policies against procedures.
- **Production design:** Semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list.

## Why AI, and why this kind

**Why AI.** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity. The evidence that separates good from bad outcomes (Semantic divergence, Configuration mismatch, Training coverage gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "policy text alone" are what teams reach for first, and they fail because drift is a gap between two things. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Semantic divergence, Configuration mismatch, Training coverage gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A periodic manual comparison of policies against procedures | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Drift found before an audit finding) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Treating text distance as risk.
- Evaluation trap: Reporting unknown settings as compliant.
- Policy updated but procedures lag: expected drift.
- Intended local variation: false drift.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
