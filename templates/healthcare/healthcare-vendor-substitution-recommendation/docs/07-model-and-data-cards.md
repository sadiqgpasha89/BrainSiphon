# Healthcare Vendor Substitution Recommendation: model card and data card

> Generated from the blueprint `healthcare/healthcare-vendor-substitution-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Vendor Substitution Recommendation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A buyer searches the catalogue manually for alternatives.
- **Production model:** A two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option.
- **Intended use:** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent.
- **Out of scope:** - Brand popularity: not equivalence.<br>- Catalogue description text: marketing.<br>- Rep recommendation: commercial interest.
- **Primary metrics:** - NDCG@3 against approved substitution decisions<br>- Share of recommended items that are approved-equivalent<br>- Hit rate of the accepted option in the top three
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - No approved alternative<br>- Register out of date<br>- Recall of the alternative<br>- Contract conflict
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent.
- **Label:** For "Healthcare Vendor Substitution Recommendation": Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Using embedding similarity for equivalence.
- **Sources:** - **Source:** Approved-equivalence status inputs<br>**Owner:** Materials management<br>**System Of Record:** Item master and clinical equivalence register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: register version.<br>- **Source:** Supply risk of the alternative inputs<br>**Owner:** Clinical value analysis<br>**System Of Record:** Procurement system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: latest feed.<br>- **Source:** Price delta inputs<br>**Owner:** Biomedical engineering<br>**System Of Record:** Supplier performance records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract status.<br>- **Source:** Supplier reliability inputs<br>**Owner:** Procurement<br>**System Of Record:** Recall and alert feeds<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using embedding similarity for equivalence<br>- Training on emergency swaps<br>- Recommending unapproved items
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
