# Certificate Expiry and Dependency Risk: use-case brief

> Generated from the blueprint `it-ops/certificate-expiry-dependency-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Certificate Expiry and Dependency Risk · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find certificates, keys and tokens that will expire or are weak, map the services that depend on them and open renewal tasks with owners before they cause outages. The system has to run as a scheduled batch job, inside these limits: Renewal tasks at least 30 days ahead, Every certificate has an owner and Private keys never stored in findings.

**Why it is hard.** The obvious approach is a manual register, and it fails because registers miss new certificates. The second trap is in "Priority": the real signal is service criticality and dependants, while teams usually reach for days left alone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.6K a month. A mistake is expensive in the way certificates without owners measures it.

**What success looks like.** Offline: Discovery recall, Dependency accuracy and Warning lead time. Online: Certificate outages, Certificates without owners and Automated renewal share. The launch is judged on "Certificate outages" while "Certificates without owners" must not get worse.

## Objective, loss and constraints

**Business objective.** Find certificates, keys and tokens that will expire or are weak, map the services that depend on them and open renewal tasks with owners before they cause outages.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Renewal tasks at least 30 days ahead
- Every certificate has an owner
- Private keys never stored in findings
- Weekly scan of 500K certificates
- Critical expiry alerts by page

## The approach in one paragraph

Start with spreadsheets of certificates with calendar reminders, because they are the usual approach. Then earn the move to a discovery and ranking service that finds all certificates, links dependants, opens renewal tasks by risk and tracks the move to automated renewal, and only if it beats the baseline on Discovery recall and Dependency accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to expiry | Time left. Core. Guard against: from scans. |
| Add Dependant services | Services that rely on the certificate. Impact. Guard against: from the CMDB. |
| Add Algorithm and key strength | Weak settings. Risk. Guard against: from scans. |
| Run it as one pipeline | Certificate discovery (scanners and logs), Dependency mapping (CMDB), Risk ranking (rules and model), Renewal task (ITSM), Automated renewal (certificate manager) and Expiry watch (monitoring), with Coverage review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle unknown certificates | Orphan queue and owner search. |

**Deliberately not doing**

- Certificate subject wording: weak link.
- Issuer brand: weak link.
- Owner name: personal data.

**How the approach is proven**

Prove it offline on Discovery recall, Dependency accuracy and Warning lead time using time-ordered splits, then online on "Certificate outages" with "Certificates without owners" as the guardrail. Watch for: Spreadsheet registers, Days-left-only ranking and Private keys in findings.

## Baseline and production design

- **Baseline (build this first):** Spreadsheets of certificates with calendar reminders, because they are the usual approach.
- **Production design:** A discovery and ranking service that finds all certificates, links dependants, opens renewal tasks by risk and tracks the move to automated renewal.

## Why AI, and why this kind

**Why AI.** Find certificates, keys and tokens that will expire or are weak, map the services that depend on them and open renewal tasks with owners before they cause outages. The evidence that separates good from bad outcomes (Days to expiry, Dependant services, Algorithm and key strength) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A manual register" are what teams reach for first, and they fail because registers miss new certificates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A discovery and ranking service that finds all certificates, links dependants, opens renewal tasks by risk and tracks the move to automated renewal.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to expiry, Dependant services, Algorithm and key strength and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheets of certificates with calendar reminders, because they are the usual approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A discovery and ranking service that finds all certificates, links dependants, opens renewal tasks by risk and tracks the move to automated renewal | chosen | Meets the run-window envelope at $0.091 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Certificate outages) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Spreadsheet registers.
- Evaluation trap: Days-left-only ranking.
- Unknown certificates: certificates have no owner.
- Pinned certificates: clients pin a certificate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
