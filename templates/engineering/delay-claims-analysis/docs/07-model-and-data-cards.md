# Delay Claims Analysis: model card and data card

> Generated from the blueprint `engineering/delay-claims-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Delay Claims Analysis · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Delay experts reconstructing the programme from archives by hand, because it is the standard approach.
- **Production model:** An analysis pipeline that rebuilds schedule history, applies named methods, links delay events to records and prepares an evidence pack for experts.
- **Intended use:** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review.
- **Out of scope:** - Author name: personal data.<br>- Letter format: an artefact.<br>- File date: an artefact.
- **Primary metrics:** - Method reproducibility<br>- Event linking accuracy<br>- Expert acceptance
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Missing updates<br>- Retroactive changes<br>- Concurrent delays
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including first-of-a-kind designs, new clients, remote sites and unusual ground conditions; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review.
- **Label:** For "Delay Claims Analysis": Reconstruct schedule history and records to show causes of delay and the share each event contributed, giving claims teams evidence packs for experts and counsel to review. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Custom scores.
- **Sources:** - **Source:** Schedule update history inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from schedule archives.<br>- **Source:** Delay events inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from records.<br>- **Source:** Critical path changes inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from schedule analysis.<br>- **Source:** Records and correspondence inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from document systems.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Custom scores<br>- Recollection as evidence<br>- Liability decided by the model
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
