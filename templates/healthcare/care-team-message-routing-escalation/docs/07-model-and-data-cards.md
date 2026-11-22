# Care-Team Message Routing & Escalation: model card and data card

> Generated from the blueprint `healthcare/care-team-message-routing-escalation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Care-Team Message Routing & Escalation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Staff look up the right contact in a directory and message them directly.
- **Production model:** A rules engine over the live on-call roster and care-team assignments with an NLP intent classifier, context lookup for the patient's care relationships, a fallback and escalation timer, and a correction loop for senders.
- **Intended use:** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain.
- **Out of scope:** - Message length: not routing.<br>- Sender seniority: not a routing factor.<br>- Channel alone: not intent.
- **Primary metrics:** - Route accuracy against audited routing decisions<br>- Share of messages needing sender correction<br>- Acknowledgement-time distribution by route
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Roster not yet updated<br>- Patient with several teams<br>- Message about two patients<br>- Escalation chain exhausted
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
- **Purpose:** Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain.
- **Label:** For "Care-Team Message Routing & Escalation": Recommend the correct role or team for a message using specialty, location, patient-care relationship, on-call roster and escalation policy, with a fallback route, an acknowledgement timer and a defined escalation chain. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Letting the model pick the recipient.
- **Sources:** - **Source:** Intent class inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Secure messaging platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: message text.<br>- **Source:** Care-team relationship inputs<br>**Owner:** Nursing leadership<br>**System Of Record:** Care-team assignment records<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: assignment records.<br>- **Source:** On-call and service hours inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** On-call and roster system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Acknowledgement history inputs<br>**Owner:** Patient safety<br>**System Of Record:** Routing and escalation policy register<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the model pick the recipient<br>- Using a stale roster<br>- Skipping the audit trail
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
