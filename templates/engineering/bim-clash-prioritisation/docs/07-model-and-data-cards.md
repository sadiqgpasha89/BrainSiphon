# BIM Clash Prioritisation: model card and data card

> Generated from the blueprint `engineering/bim-clash-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** BIM Clash Prioritisation · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Batches of clashes grouped by location and reviewed in weekly meetings, because it is the usual process.
- **Production model:** A ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list.
- **Intended use:** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps.
- **Out of scope:** - Modeller name: personal data.<br>- Clash id: an identifier.<br>- Model file name: an artefact.
- **Primary metrics:** - Rank accuracy against rework outcomes<br>- Grouping quality<br>- Critical recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Model lag<br>- Soft clash<br>- Late design change
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including first-of-a-kind designs, new clients, remote sites and unusual ground conditions; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps.
- **Label:** For "BIM Clash Prioritisation": Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Overlap volume as severity.
- **Sources:** - **Source:** Element types in clash inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the model.<br>- **Source:** Clash depth and tolerance context inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from geometry.<br>- **Source:** Space and access criticality inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the model.<br>- **Source:** Construction sequence inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the schedule.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Overlap volume as severity<br>- Closed as resolved<br>- Automatic assignment
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
