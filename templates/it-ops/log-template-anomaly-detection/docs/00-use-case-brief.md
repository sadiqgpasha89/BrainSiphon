# Log Template Anomaly Detection: use-case brief

> Generated from the blueprint `it-ops/log-template-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Log Template Anomaly Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers. The system has to run interactively, within a few seconds, inside these limits: Personal data masked in logs before analysis, Detection within 2 minutes of onset and Anomalies show sample lines.

**Why it is hard.** The obvious approach is raw lines, and it fails because variable fields hide patterns. The second trap is in "Label": the real signal is templates linked to incidents, while teams usually reach for all new templates.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $18.7K a month. A mistake is expensive in the way time to detect measures it.

**What success looks like.** Offline: Anomaly detection on seeded faults, Template parsing accuracy and Masking recall. Online: Faults found from logs, Time to detect and Investigation time. The launch is judged on "Faults found from logs" while "Time to detect" must not get worse.

## Objective, loss and constraints

**Business objective.** Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers.

**Training objective.** `\mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| x | The input features describing one example (what the model sees). |
| \mathrm{Dec} | The decoder: the network part that rebuilds the input from its compressed code. |
| \mathrm{Enc} | The encoder: the network part that compresses the input into a short code. |

**Hard constraints**

- Personal data masked in logs before analysis
- Detection within 2 minutes of onset
- Anomalies show sample lines
- False flags under 5 per service per day
- 10B log lines per day

## The approach in one paragraph

Start with keyword alerts on the words error and exception, because they are the common starting point. Then earn the move to a template-based detector with masking, frequency and novelty scoring and release awareness that creates ranked anomalies with example lines, and only if it beats the baseline on Anomaly detection on seeded faults and Template parsing accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Template frequency change | Rate of each template versus baseline. Core. Guard against: from parsing. |
| Add New template appearance | Templates unseen before. Core. Guard against: from parsing. |
| Add Severity level mix | Error and warning share. Support. Guard against: from logs. |
| Run it as one pipeline | Log ingestion (logging platform), Masking (pattern and model), Template extraction (parser), Frequency and novelty scoring (detector), Ranked anomalies (operations console) and Baseline refresh (weekly), with Engineer feedback off the critical path. |
| Optimise the right thing | The objective weighs norm: the length of a vector. The squared norm of a difference is the sum of squared errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle verbose logging change | Template mapping across versions. |

**Deliberately not doing**

- User identifier: personal data.
- Process id: an identifier.
- Timestamp format: an artefact.

**How the approach is proven**

Prove it offline on Anomaly detection on seeded faults, Template parsing accuracy and Masking recall using time-ordered splits, then online on "Faults found from logs" with "Time to detect" as the guardrail. Watch for: Keyword alerts only, Raw personal data in analysis and Novelty as the only signal.

## Baseline and production design

- **Baseline (build this first):** Keyword alerts on the words error and exception, because they are the common starting point.
- **Production design:** A template-based detector with masking, frequency and novelty scoring and release awareness that creates ranked anomalies with example lines.

## Why AI, and why this kind

**Why AI.** Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers. The evidence that separates good from bad outcomes (Template frequency change, New template appearance, Severity level mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw lines" are what teams reach for first, and they fail because variable fields hide patterns. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A template-based detector with masking, frequency and novelty scoring and release awareness that creates ranked anomalies with example lines.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Template frequency change, New template appearance, Severity level mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword alerts on the words error and exception, because they are the common starting point | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A template-based detector with masking, frequency and novelty scoring and release awareness that creates ranked anomalies with example lines | chosen | Meets the 2500 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Faults found from logs) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Keyword alerts only.
- Evaluation trap: Raw personal data in analysis.
- Verbose logging change: a release changes log wording.
- Log flood: one component floods logs.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
