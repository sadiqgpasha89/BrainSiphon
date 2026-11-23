# Records Retention Classification: model card and data card

> Generated from the blueprint `public-sector/records-retention-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Records Retention Classification · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Retention schedules applied by office staff by hand, because it is the current practice.
- **Production model:** A classifier with confidence and rule lookup, a hold check, sampled review and disposal approval lists with logs.
- **Intended use:** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends.
- **Out of scope:** - Author name: irrelevant.<br>- File size: weak link.<br>- Folder name: an artefact.
- **Primary metrics:** - Category accuracy<br>- Hold check recall<br>- Disposal error rate on samples
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Unknown category<br>- Late hold<br>- Schedule change
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends.
- **Label:** For "Records Retention Classification": Classify documents and emails into records categories with retention rules so records are kept as long as the law requires and deleted when the period ends. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Automatic deletion.
- **Sources:** - **Source:** Document type and content inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the classifier.<br>- **Source:** Creator unit and function inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the directory.<br>- **Source:** Date and trigger event inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from metadata.<br>- **Source:** Legal hold flags inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from legal.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Automatic deletion<br>- Skipping hold checks<br>- Folder-based labels
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
