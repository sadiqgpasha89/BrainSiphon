# Cost Overrun Prediction: model card and data card

> Generated from the blueprint `engineering/cost-overrun-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cost Overrun Prediction · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Earned value analysis with manual contingency, because it is the standard method.
- **Production model:** A forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk.
- **Intended use:** Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early.
- **Out of scope:** - Manager name: personal data.<br>- Invoice number: an identifier.<br>- Report layout: an artefact.
- **Primary metrics:** - Calibration<br>- Forecast error by project stage<br>- Driver accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Large claim<br>- Currency swings<br>- New client
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early.
- **Label:** For "Cost Overrun Prediction": Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Linear extrapolation.
- **Sources:** - **Source:** Earned value indicators inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from cost control.<br>- **Source:** Committed cost and change orders inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the ledger.<br>- **Source:** Productivity rates inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from site data.<br>- **Source:** Market price indices inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from indices.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Linear extrapolation<br>- Individual manager comparison<br>- Mid-project forecasts as labels
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
