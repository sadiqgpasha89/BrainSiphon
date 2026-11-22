# Healthcare Compliance Remediation Prioritization: model card and data card

> Generated from the blueprint `healthcare/healthcare-compliance-remediation-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Remediation Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Findings are worked in the order they were logged.
- **Production model:** A deterministic priority rule layer for severe and deadline-bound findings, then a multi-objective optimiser over risk reduction, effort and capacity with dependency constraints and a scenario engine for overdue forecasts.
- **Intended use:** Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios.
- **Out of scope:** - Finding title: wording.<br>- Reporter identity: not risk.<br>- Ticket age alone: not risk.
- **Primary metrics:** - Risk reduction against the best plan in hindsight<br>- Rule-layer violations<br>- Overdue forecast error
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - New severe finding mid-cycle<br>- Shared remediation fixes several findings<br>- Capacity changes<br>- Contested severity rating
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios.
- **Label:** For "Healthcare Compliance Remediation Prioritization": Prioritise remediation across findings by severity, likelihood, deadline, patient and operational exposure, recurrence and effort, and give the risk owner a ranked backlog, a sequence and resource scenarios. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Letting the optimiser override severe-finding rules.
- **Sources:** - **Source:** Severity and likelihood inputs<br>**Owner:** Compliance<br>**System Of Record:** GRC and findings tracker<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rating version.<br>- **Source:** Deadline slack inputs<br>**Owner:** Risk management<br>**System Of Record:** Risk taxonomy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: plan data.<br>- **Source:** Recurrence history inputs<br>**Owner:** Operations owners<br>**System Of Record:** Project and resource management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: findings history.<br>- **Source:** Effort and capacity inputs<br>**Owner:** Internal audit<br>**System Of Record:** Ownership directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: capacity calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the optimiser override severe-finding rules<br>- Ignoring dependencies<br>- Treating deferral as free
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
