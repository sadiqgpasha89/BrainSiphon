# Provider Network Gap Identification: model card and data card

> Generated from the blueprint `healthcare/provider-network-gap-identification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Gap Identification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Planners review provider counts per county once a year.
- **Production model:** Geospatial analysis with road-network travel times, spatial clustering of unserved demand, equity cuts in aggregate and candidate option generation with an access-impact simulation.
- **Intended use:** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact.
- **Out of scope:** - Area name: label.<br>- Provider marketing: not capacity.<br>- Postcode boundaries alone: arbitrary units.
- **Primary metrics:** - Gap-detection agreement with planner review<br>- Travel-time model error against observed trips<br>- Stability of gap maps across periods
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Geographic barrier such as a river<br>- Small area<br>- Provider closes<br>- Overlapping service areas
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact.
- **Label:** For "Provider Network Gap Identification": Find geographic and specialty coverage gaps against member demand, population distribution and service requirements, and give network planners gap maps, underserved cohorts and areas, and candidate expansion options with the access impact. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Using straight-line distance.
- **Sources:** - **Source:** Unserved demand share inputs<br>**Owner:** Network planning<br>**System Of Record:** Provider directory and network management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: demand and travel-time snapshot.<br>- **Source:** Provider density per member inputs<br>**Owner:** Provider relations<br>**System Of Record:** Member and population data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: directory snapshot.<br>- **Source:** Travel-time reach inputs<br>**Owner:** Network management<br>**System Of Record:** Travel-time network data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: road network version.<br>- **Source:** Demand growth inputs<br>**Owner:** Finance<br>**System Of Record:** Service demand data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: forecast snapshot.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using straight-line distance<br>- Ignoring demand<br>- Publishing individual-level lists
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
