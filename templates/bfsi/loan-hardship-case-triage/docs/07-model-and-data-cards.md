# Loan Hardship Case Triage: model card and data card

> Generated from the blueprint `bfsi/loan-hardship-case-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loan Hardship Case Triage · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword routing with a form dropdown and a manual queue, because it is the current practice.
- **Production model:** Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent.
- **Intended use:** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances.
- **Out of scope:** - Time of day sent: no relationship to need.<br>- Device type: proxy for income, unfair as a signal.<br>- Spelling errors: proxy for education or language, not for hardship.
- **Primary metrics:** - Macro-F1 per category and language<br>- Recall of vulnerability cues
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Third-party request<br>- Mixed topics<br>- Language not supported
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances.
- **Label:** For "Loan Hardship Case Triage": Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Offline labels come from past routing, which carries its own bias.
- **Sources:** - **Source:** Days to next due date inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: dates must be contractual.<br>- **Source:** Arrears and history inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: prior arrangements may have been miscoded.<br>- **Source:** Hardship category inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: categories overlap in real messages.<br>- **Source:** Vulnerability cues inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: over-flagging overloads the team, under-flagging harms customers.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Offline labels come from past routing, which carries its own bias<br>- Language mix in tests differs from live traffic
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
