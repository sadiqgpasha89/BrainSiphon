# Claims Triage & Straight-Through Processing: model card and data card

> Generated from the blueprint `bfsi/claims-triage-and-straight-through-processing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Claims Triage & Straight-Through Processing · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-based routing by amount and type, because it is the current practice.
- **Production model:** A triage model over text and structured data, a straight-through policy with limits and an exception queue.
- **Intended use:** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk.
- **Out of scope:** - Handler: The handler who first opens the claim has no bearing on its complexity.<br>- Day filed: Weak relation to complexity once the type is known.<br>- Channel: Reflects customer cohort and not the claim, so it risks unfair treatment.
- **Primary metrics:** - Routing accuracy<br>- STP leakage rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Catastrophe surge<br>- Mis-described loss<br>- Vulnerable claimant
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
- **Purpose:** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk.
- **Label:** For "Claims Triage & Straight-Through Processing": Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Labels come from past routing decisions, so the model learns the old process and its biases.
- **Sources:** - **Source:** First notice text inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: language varies, so test across channels.<br>- **Source:** Coverage check inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: data quality issues in policy records cause false denials.<br>- **Source:** Claimant history inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: fair-use rules limit how it can be used.<br>- **Source:** Reserve estimate inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: initial reserves are rough, so treat it as a prior.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels come from past routing decisions, so the model learns the old process and its biases<br>- Fraud found later is missing from the labels at training time
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
