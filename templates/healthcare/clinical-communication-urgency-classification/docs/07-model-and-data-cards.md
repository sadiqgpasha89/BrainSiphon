# Clinical Communication Urgency Classification: model card and data card

> Generated from the blueprint `healthcare/clinical-communication-urgency-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Urgency Classification · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Messages are read in arrival order and recipients judge urgency themselves.
- **Production model:** Deterministic emergency rules first, then a fine-tuned transformer classifier with calibrated probabilities, an abstain band and a rationale panel, integrated beside the inbox without reordering or hiding any message.
- **Intended use:** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force.
- **Out of scope:** - Message length: not urgency.<br>- Sender seniority alone: not clinical urgency.<br>- Time of day alone: confounded with staffing.
- **Primary metrics:** - Recall of urgent messages at a fixed precision, reported separately for each urgency class<br>- Under-triage rate against clinician review<br>- Calibration and abstention coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Abbreviations and slang<br>- Negation such as no chest pain<br>- Very short message<br>- Platform outage
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
- **Purpose:** Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force.
- **Label:** For "Clinical Communication Urgency Classification": Classify incoming clinical and operational messages by urgency and the response pathway they need, so the right queue sees them first, while deterministic emergency rules and existing escalation protocols stay in force. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Training on arrival-order labels.
- **Sources:** - **Source:** Urgency cue terms and phrases inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Secure messaging platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: message text.<br>- **Source:** Sender role and channel inputs<br>**Owner:** Nursing leadership<br>**System Of Record:** Care-team role and on-call directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: directory as at send time.<br>- **Source:** Recipient context inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Urgency taxonomy register<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Thread history inputs<br>**Owner:** Patient safety<br>**System Of Record:** Paging and escalation system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: earlier messages.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on arrival-order labels<br>- Letting the model lower urgency<br>- Hiding low-urgency messages
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
