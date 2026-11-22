# Healthcare Compliance Policy Drift Detection: model card and data card

> Generated from the blueprint `healthcare/healthcare-compliance-policy-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Policy Drift Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A periodic manual comparison of policies against procedures.
- **Production model:** Semantic comparison of policy and procedure text, configuration rules against snapshots, process-variant analysis on event logs and a severity classifier, combined into a reviewed drift list.
- **Intended use:** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity.
- **Out of scope:** - Document formatting: layout.<br>- Author name: not drift.<br>- Policy length: not risk.
- **Primary metrics:** - Drift precision at the review capacity<br>- Recall on seeded drift<br>- Severity agreement with owners
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Policy updated but procedures lag<br>- Intended local variation<br>- Snapshot unavailable<br>- Ambiguous policy wording
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
- **Purpose:** Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity.
- **Label:** For "Healthcare Compliance Policy Drift Detection": Detect divergence between approved policies and the procedures, system configurations, training and operational records actually in use, and give policy owners candidate drift with evidence, affected control and severity. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Treating text distance as risk.
- **Sources:** - **Source:** Semantic divergence inputs<br>**Owner:** Compliance<br>**System Of Record:** Policy management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: version pair.<br>- **Source:** Configuration mismatch inputs<br>**Owner:** Policy owners<br>**System Of Record:** Process documentation repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: snapshot time.<br>- **Source:** Training coverage gap inputs<br>**Owner:** IT governance<br>**System Of Record:** Configuration management and system exports<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: training records.<br>- **Source:** Process variant frequency inputs<br>**Owner:** Operations owners<br>**System Of Record:** Training and audit records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event logs.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating text distance as risk<br>- Reporting unknown settings as compliant<br>- Naming individuals in drift output
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
