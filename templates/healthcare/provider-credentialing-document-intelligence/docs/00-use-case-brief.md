# Provider Credentialing Document Intelligence: use-case brief

> Generated from the blueprint `healthcare/provider-credentialing-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credentialing Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. The system has to run as a scheduled batch job, inside these limits: Every extracted fact links to its source page, region and extraction confidence, The system never approves a credential or grants a privilege and staff verify all evidence and Discrepancies are queued and never auto-resolved.

**Why it is hard.** The obvious approach is extracted value with no source, and it fails because a reviewer cannot trust or correct an unsourced field. The second trap is in "Verification": the real signal is primary-source verification result is the authority, while teams usually reach for extracted value treated as verified.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $4.9K a month. A mistake is expensive in the way share of fields accepted without edits measures it.

**What success looks like.** Offline: Field-level F1 and exact match by document type, Calibration error of field confidence and Missing-document detection recall. Online: Specialist handling time per file, Share of fields accepted without edits and Credentialing cycle time. The launch is judged on "Specialist handling time per file" while "Share of fields accepted without edits" must not get worse.

## Objective, loss and constraints

**Business objective.** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork.

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

- Every extracted fact links to its source page, region and extraction confidence
- The system never approves a credential or grants a privilege and staff verify all evidence
- Discrepancies are queued and never auto-resolved
- Handles scans of mixed quality and multiple languages
- Processes 300K documents per month with a per-document turnaround under 15 minutes
- Immutable evidence references with timestamps

## The approach in one paragraph

Start with template-based OCR with regex field capture and a manual checklist. Then earn the move to oCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions, and only if it beats the baseline on Field-level F1 and exact match by document type and Calibration error of field confidence after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Calibrated extraction confidence per field and document. Directs review effort to uncertain fields. Guard against: calibrate on held-out document groups. |
| Add Document-type completeness | Required documents present for the credential type. Core completeness signal. Guard against: requirements as of the application date. |
| Add Cross-source agreement | Match score between application, licence and verification response. Detects mismatches. Guard against: compare against verification responses received before scoring. |
| Run it as one pipeline | Document intake and OCR (upload service with OCR engine), Document classifier (layout-aware transformer), Field extractor (document AI with spans), Cross-source reconciliation (rules and fuzzy lookups) and Completeness and policy validator (credential rules), with Credentialing specialist review and Evidence packet and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle low-quality scan | Confidence threshold routes the document to manual keying with the image attached. |

**Deliberately not doing**

- Provider prestige or institution ranking: irrelevant to evidence completeness and a bias risk.
- Document layout aesthetics: rarely related to validity.
- Applicant nationality or name origin: protected and irrelevant.

**How the approach is proven**

Prove it offline on Field-level F1 and exact match by document type, Calibration error of field confidence and Missing-document detection recall using time-ordered splits, then online on "Specialist handling time per file" with "Share of fields accepted without edits" as the guardrail. Watch for: Splitting train and test by page and not by provider, Scoring on clean scans only and Counting extraction as verification.

## Baseline and production design

- **Baseline (build this first):** Template-based OCR with regex field capture and a manual checklist.
- **Production design:** OCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions.

## Why AI, and why this kind

**Why AI.** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. The evidence that separates good from bad outcomes (Field confidence, Document-type completeness, Cross-source agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "extracted value with no source" are what teams reach for first, and they fail because A reviewer cannot trust or correct an unsourced field. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: OCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Document-type completeness, Cross-source agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based OCR with regex field capture and a manual checklist | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| OCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions | chosen | Meets the run-window envelope at $0.274 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Specialist handling time per file) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Splitting train and test by page and not by provider.
- Evaluation trap: Scoring on clean scans only.
- Low-quality scan: fields are misread.
- Name change or transliteration: identity appears to mismatch.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
