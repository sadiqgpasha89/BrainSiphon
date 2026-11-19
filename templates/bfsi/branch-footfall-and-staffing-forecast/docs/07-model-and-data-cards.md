# Branch Footfall & Staffing Forecast: model card and data card

> Generated from the blueprint `bfsi/branch-footfall-and-staffing-forecast` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Branch Footfall & Staffing Forecast · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same week last year scaled, because managers use it.
- **Production model:** Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser.
- **Intended use:** Forecast branch visits by hour so rosters match demand and queues stay short.
- **Out of scope:** - Branch name: A label that is not a driver of demand.<br>- Manager: The branch manager does not change footfall.<br>- Weather: A small effect once the calendar is known.
- **Primary metrics:** - Pinball loss<br>- Peak error
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Branch refit<br>- Sensor outage<br>- New branch
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Forecast branch visits by hour so rosters match demand and queues stay short.
- **Label:** For "Branch Footfall & Staffing Forecast": Forecast branch visits by hour so rosters match demand and queues stay short. The reference kit's label: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Design around this trap first: Closed days in the history look like zero demand and bias the forecast.
- **Sources:** - **Source:** Hourly profile inputs<br>**Owner:** Branch operations analytics<br>**System Of Record:** Branch queue-management system (tickets and wait times)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: closures and refits distort it, so exclude them.<br>- **Source:** Pay day effect inputs<br>**Owner:** Workforce planning<br>**System Of Record:** Footfall counters and sensors<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: pay cycles vary by employer in the area.<br>- **Source:** Digital trend inputs<br>**Owner:** Retail banking data office<br>**System Of Record:** Workforce-management and roster system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the trend is slow but real.<br>- **Source:** Local events inputs<br>**Owner:** Branch operations analytics<br>**System Of Record:** HR system (employees, skills and contracts)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the calendar needs a feed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Closed days in the history look like zero demand and bias the forecast<br>- A calm test period hides the peaks that matter for staffing
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
