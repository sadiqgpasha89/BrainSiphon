# Evidence Document OCR and Deduplication: use-case brief

> Generated from the blueprint `public-safety/evidence-document-ocr-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Evidence Document OCR and Deduplication · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once. The system has to run as a scheduled batch job, inside these limits: Originals are never modified, Every derived file links to its original with a hash and Duplicates grouped not deleted.

**Why it is hard.** The obvious approach is a cleaned copy only, and it fails because courts need the chain of custody. The second trap is in "Dedup": the real signal is group near duplicates with the evidence link, while teams usually reach for delete duplicates.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $2.6K a month. A mistake is expensive in the way duplicates reviewed twice measures it.

**What success looks like.** Offline: OCR accuracy by document type, Duplicate grouping precision and Hash integrity checks. Online: Review hours per case, Duplicates reviewed twice and Integrity incidents. The launch is judged on "Review hours per case" while "Duplicates reviewed twice" must not get worse.

## Objective, loss and constraints

**Business objective.** Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Originals are never modified
- Every derived file links to its original with a hash
- Duplicates grouped not deleted
- Reviewer can see every duplicate
- 10M pages per year

## The approach in one paragraph

Start with manual review of every scanned page, because it is the current practice. Then earn the move to an OCR and similarity pipeline that keeps originals and hashes, groups near duplicates for reviewers and shows page-level confidence with originals one click away, and only if it beats the baseline on OCR accuracy by document type and Duplicate grouping precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Content hash and similarity | Hashes and text similarity. Duplicate grouping. Guard against: from pipelines. |
| Add OCR confidence | Confidence per page and region. Reliability. Guard against: from OCR. |
| Add Document metadata | Source and date. Context. Guard against: from intake. |
| Run it as one pipeline | Scan intake (evidence system), Hashing (integrity service), OCR (document model), Near-duplicate grouping (similarity search), Chain of custody log (audit store) and Quality sampling (monthly), with Reviewer view off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwritten notes | Flags and manual review. |

**Deliberately not doing**

- Examiner name: irrelevant.
- File name: an artefact.
- Scan device: an artefact.

**How the approach is proven**

Prove it offline on OCR accuracy by document type, Duplicate grouping precision and Hash integrity checks using time-ordered splits, then online on "Review hours per case" with "Duplicates reviewed twice" as the guardrail. Watch for: Deleting duplicates, Modifying originals and OCR without confidence.

## Baseline and production design

- **Baseline (build this first):** Manual review of every scanned page, because it is the current practice.
- **Production design:** An OCR and similarity pipeline that keeps originals and hashes, groups near duplicates for reviewers and shows page-level confidence with originals one click away.

## Why AI, and why this kind

**Why AI.** Convert scanned evidence into searchable text, remove exact and near duplicates and keep the chain of custody, so reviewers see each item once. The evidence that separates good from bad outcomes (Content hash and similarity, OCR confidence, Document metadata) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A cleaned copy only" are what teams reach for first, and they fail because courts need the chain of custody. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: An OCR and similarity pipeline that keeps originals and hashes, groups near duplicates for reviewers and shows page-level confidence with originals one click away.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Content hash and similarity, OCR confidence, Document metadata and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual review of every scanned page, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An OCR and similarity pipeline that keeps originals and hashes, groups near duplicates for reviewers and shows page-level confidence with originals one click away | chosen | Meets the run-window envelope at $0.029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review hours per case) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Deleting duplicates.
- Evaluation trap: Modifying originals.
- Handwritten notes: oCR is unreliable.
- Redacted copies: near duplicates differ on purpose.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
