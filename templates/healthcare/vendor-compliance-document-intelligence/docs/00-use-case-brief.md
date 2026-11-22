# Vendor Compliance Document Intelligence: use-case brief

> Generated from the blueprint `healthcare/vendor-compliance-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Compliance Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers. The system has to run as a scheduled batch job, inside these limits: Every extracted value links to its page and region with a confidence, Reviewers validate ambiguous or legally material evidence and the system never accepts a certificate on its own and Requirements and expiry rules come from a versioned catalogue.

**Why it is hard.** The obvious approach is value alone, and it fails because reviewers must see the source to trust a value. The second trap is in "Rules": the real signal is deterministic coverage and expiry rules, while teams usually reach for model guess at validity.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $4.2K a month. A mistake is expensive in the way share of fields accepted without edits measures it.

**What success looks like.** Offline: Field-level F1 and exact match by document type, Calibration of field confidence and Requirement-coverage accuracy on audited files. Online: Reviewer time per document, Share of fields accepted without edits and Lapsed-evidence incidents. The launch is judged on "Reviewer time per document" while "Share of fields accepted without edits" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid x)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Every extracted value links to its page and region with a confidence
- Reviewers validate ambiguous or legally material evidence and the system never accepts a certificate on its own
- Requirements and expiry rules come from a versioned catalogue
- Handles 150K documents per month with a first pass under 10 minutes
- Documents are untrusted input and cannot trigger tool calls
- Personal data is minimised

## The approach in one paragraph

Start with manual keying from PDFs into the vendor system. Then earn the move to layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions, and only if it beats the baseline on Field-level F1 and exact match by document type and Calibration of field confidence after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Calibrated confidence per extracted field. Directs review. Guard against: held-out document groups. |
| Add Coverage versus requirement | Extracted limits against required limits. Core compliance test. Guard against: requirement catalogue version. |
| Add Named-entity agreement | Vendor and insured names versus vendor master. Detects wrong-entity evidence. Guard against: master as at scoring. |
| Run it as one pipeline | Document intake and OCR (upload service with OCR engine), Document classifier (layout-aware transformer), Field extractor (document AI with spans), Requirement and expiry rules (versioned catalogue) and Master reconciliation (rules and fuzzy lookups), with Reviewer validation and Evidence store and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle certificate lists several insured parties | Entity matching to the vendor master with a review route. |

**Deliberately not doing**

- Logo and letterhead: layout style.
- Document file name: not content.
- Page count: not validity.

**How the approach is proven**

Prove it offline on Field-level F1 and exact match by document type, Calibration of field confidence and Requirement-coverage accuracy on audited files using time-ordered splits, then online on "Reviewer time per document" with "Share of fields accepted without edits" as the guardrail. Watch for: Splitting by page not by vendor, Evaluating on clean PDFs only and Counting extraction as verification.

## Baseline and production design

- **Baseline (build this first):** Manual keying from PDFs into the vendor system.
- **Production design:** Layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions.

## Why AI, and why this kind

**Why AI.** Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers. The evidence that separates good from bad outcomes (Field confidence, Coverage versus requirement, Named-entity agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "value alone" are what teams reach for first, and they fail because reviewers must see the source to trust a value. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Coverage versus requirement, Named-entity agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual keying from PDFs into the vendor system | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions | chosen | Meets the run-window envelope at $0.231 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reviewer time per document) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Splitting by page not by vendor.
- Evaluation trap: Evaluating on clean PDFs only.
- Certificate lists several insured parties: the wrong party is extracted.
- Scan is rotated or skewed: extraction fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
