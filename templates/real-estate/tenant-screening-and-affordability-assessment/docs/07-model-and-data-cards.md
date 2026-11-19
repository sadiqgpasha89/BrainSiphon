# Tenant Screening & Affordability Assessment: model card and data card

> Generated from the blueprint `real-estate/tenant-screening-and-affordability-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tenant Screening & Affordability Assessment · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Income at least three times the rent plus a credit threshold, because landlords use it.
- **Production model:** Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases.
- **Intended use:** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.
- **Out of scope:** - Name: A protected characteristic in many places and no predictor of payment.<br>- Postcode of origin: A proxy for race and income that breaches fair-housing rules.<br>- Social media: Unreliable, unverifiable and intrusive, and it invites discrimination.
- **Primary metrics:** - AUC<br>- Group error rates
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - No credit history<br>- Housing subsidy<br>- Document forgery
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.
- **Label:** For "Tenant Screening & Affordability Assessment": Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones.
- **Sources:** - **Source:** Rent-to-income ratio inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: only count income verified from a payroll or bank source.<br>- **Source:** Rental payment history inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: reporting is patchy, so absence is not evidence of a problem.<br>- **Source:** Income stability inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: gig and seasonal work look unstable without being risky, so model them separately.<br>- **Source:** Document authenticity inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: false alarms reject honest applicants, so route flagged files to a person.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones<br>- Proxy features that look neutral reproduce group differences in the data
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
