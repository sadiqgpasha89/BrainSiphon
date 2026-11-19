# Chargeback Dispute Prediction & Evidence Automation: model card and data card

> Generated from the blueprint `fintech/chargeback-dispute-prediction-and-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Chargeback Dispute Prediction & Evidence Automation · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule table by reason code with a standard evidence template.
- **Production model:** Win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator.
- **Intended use:** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost.
- **Out of scope:** - Customer complaint text sentiment: emotive but not decisive in network rules.<br>- Dispute filing weekday: spurious calendar effect.
- **Primary metrics:** - Win-prediction PR-AUC<br>- Evidence-field accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Network deadline in 7 days<br>- Template hallucinated fields
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost.
- **Label:** For "Chargeback Dispute Prediction & Evidence Automation": Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Training only on disputes the team chose to contest.
- **Sources:** - **Source:** Evidence completeness score inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: compute at submission time only.<br>- **Source:** 3DS liability shift flag inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: verify with the authentication record not merchant claim.<br>- **Source:** Delivery confirmation lag inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: courier updates arrive later; use ones available at filing.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training only on disputes the team chose to contest<br>- Outcome labels delayed by 45-120 days
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
