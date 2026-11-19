# Spend Classification & Taxonomy Mapping: model card and data card

> Generated from the blueprint `supply-chain/spend-classification-taxonomy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spend Classification & Taxonomy Mapping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword rules and supplier-to-category lookup.
- **Production model:** Hierarchical transformer with supplier priors, confidence-based review queue and continual learning from corrections.
- **Intended use:** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis.
- **Out of scope:** - Invoice number: none.<br>- Cost centre code: org structure.
- **Primary metrics:** - Level-3 accuracy and macro-F1<br>- Coverage at 95% precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - New category emerges<br>- Generic descriptions ("services")
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis.
- **Label:** For "Spend Classification & Taxonomy Mapping": Classify invoice and PO lines into a unified category taxonomy to unlock spend visibility and savings analysis. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Training labels from earlier rule-based mappings.
- **Sources:** - **Source:** Line description embedding inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: language handling.<br>- **Source:** Supplier primary category inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: supplier master.<br>- **Source:** Unit price and UoM inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: currency conversion.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training labels from earlier rule-based mappings<br>- Ignoring class imbalance
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
