# Property Manager Assistant for Tenant Queries: model card and data card

> Generated from the blueprint `real-estate/tenant-query-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Manager Assistant for Tenant Queries · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** FAQ page and an inbox, because it is the current process.
- **Production model:** Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation.
- **Intended use:** Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person.
- **Out of scope:** - Message length: Style of the tenant and not the difficulty of the query.<br>- Emoji: A style marker with no link to the right answer.<br>- Time sent: Weakly related to the topic or urgency.
- **Primary metrics:** - Citation validity<br>- Escalation F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Legal threat<br>- Wrong unit<br>- Injection
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person.
- **Label:** For "Property Manager Assistant for Tenant Queries": Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person. The reference kit's label: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Design around this trap first: A test set of easy, common questions hides failures on unusual ones.
- **Sources:** - **Source:** Citation validity inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A citation can exist and still not support the claim, so check entailment.<br>- **Source:** Escalation precision inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: over-refusal hurts resolution, so track both.<br>- **Source:** Resolution rate inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A resolved flag without a reopening check overstates success.<br>- **Source:** Satisfaction inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rating bias, since unhappy tenants are less likely to rate.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A test set of easy, common questions hides failures on unusual ones<br>- Lease variants between buildings mean a test on one lease overstates accuracy on others
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
