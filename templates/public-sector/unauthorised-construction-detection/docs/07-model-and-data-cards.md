# Unauthorised Construction Detection from Imagery: model card and data card

> Generated from the blueprint `public-sector/unauthorised-construction-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unauthorised Construction Detection from Imagery · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Inspections following resident complaints, because it is the current trigger.
- **Production model:** A change detection model with permit matching and a parity check on coverage, producing a verified inspection list with the evidence images.
- **Intended use:** Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification.
- **Out of scope:** - Owner name: personal data.<br>- Neighbourhood name: a proxy.<br>- Image vendor: irrelevant.
- **Primary metrics:** - Precision of verified leads<br>- Recall on known cases<br>- Coverage parity
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Seasonal foliage<br>- Temporary structure<br>- Permit lag
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification.
- **Label:** For "Unauthorised Construction Detection from Imagery": Compare aerial and satellite images over time to find new structures and changes that have no permit, and send the list to inspectors for verification. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Automatic notices.
- **Sources:** - **Source:** Building footprint change inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from imagery.<br>- **Source:** Permit match inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the permit system.<br>- **Source:** Image quality and date gap inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from metadata.<br>- **Source:** Parcel type and zone inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from GIS.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Automatic notices<br>- Complaint-only triggers<br>- Uneven coverage
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
