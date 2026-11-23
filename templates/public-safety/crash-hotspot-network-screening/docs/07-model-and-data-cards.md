# Crash Hotspot Network Screening: model card and data card

> Generated from the blueprint `public-safety/crash-hotspot-network-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crash Hotspot Network Screening · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Sites with the highest crash counts over three years, because it is the simple screening rule.
- **Production model:** A safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers.
- **Intended use:** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential.
- **Out of scope:** - Reporting officer: irrelevant.<br>- Driver demographic details: not a site property.<br>- Crash number: an identifier.
- **Primary metrics:** - Stability of ranking across years<br>- Calibration of expected crashes<br>- Treatment effect in follow-up
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Underreporting<br>- Changes at a site<br>- Sparse data
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential.
- **Label:** For "Crash Hotspot Network Screening": Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Raw crash counts.
- **Sources:** - **Source:** Crash history by severity inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from crash records.<br>- **Source:** Traffic exposure inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from counts.<br>- **Source:** Road geometry and speed inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from road data.<br>- **Source:** Site type inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Raw crash counts<br>- Ignoring exposure<br>- Mapping without actions
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
