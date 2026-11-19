# Real Estate Due-Diligence Document Review: model card and data card

> Generated from the blueprint `real-estate/due-diligence-document-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real Estate Due-Diligence Document Review · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Associates read documents against a checklist, because it is standard.
- **Production model:** Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review.
- **Intended use:** Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations.
- **Out of scope:** - Document length: Longer documents are not riskier, and length carries no signal about issues.<br>- Folder names: Arbitrary labels chosen by the seller's team.<br>- Dates alone: Weak evidence of relevance unless tied to a clause or event.
- **Primary metrics:** - Issue recall<br>- Citation validity
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Missing documents<br>- Conflicting documents<br>- Scanned files
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations.
- **Label:** For "Real Estate Due-Diligence Document Review": Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated.
- **Sources:** - **Source:** Checklist coverage inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: definitions of required vary by deal, so use a template per type.<br>- **Source:** Issue precision inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: reviewers disagree, so measure agreement as well.<br>- **Source:** Citation validity inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A passage can be real and still not support the claim, so check entailment.<br>- **Source:** Material flag inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: severity involves judgement, so calibrate with lawyers.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated<br>- Checklist bias, since the model finds what the checklist already asks for and misses the unusual
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
