# Buyer Lead Scoring & Routing: model card and data card

> Generated from the blueprint `real-estate/buyer-lead-scoring-and-routing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Buyer Lead Scoring & Routing · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Round-robin routing, because it is simple and fair.
- **Production model:** Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness.
- **Intended use:** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.
- **Out of scope:** - Name: Irrelevant to intent and a direct route to bias.<br>- Email domain: Mostly a proxy for employer or income and not for intent to buy.<br>- Device: A proxy for income and age that adds no information about readiness.
- **Primary metrics:** - PR-AUC<br>- Calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Bot enquiries<br>- Multiple enquiries<br>- Agent unavailable
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.
- **Label:** For "Buyer Lead Scoring & Routing": Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest.
- **Sources:** - **Source:** Viewing depth inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: bots inflate views, so filter them before computing.<br>- **Source:** Finance readiness inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: self-reported readiness is unreliable, so prefer a verified flag.<br>- **Source:** Agent response time inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: agents can game it by sending empty acknowledgements.<br>- **Source:** Area expertise inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sparse for new agents, so shrink towards the team average.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest<br>- Agent quality confounds results, since a strong agent converts weak leads and flatters the score
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
