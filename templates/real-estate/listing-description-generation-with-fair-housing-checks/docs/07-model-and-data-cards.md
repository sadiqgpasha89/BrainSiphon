# Listing Description Generation with Fair-Housing Checks: model card and data card

> Generated from the blueprint `real-estate/listing-description-generation-with-fair-housing-checks` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Description Generation with Fair-Housing Checks · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Agent-written text from a template, because it is how listings are made.
- **Production model:** Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review.
- **Intended use:** Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules.
- **Out of scope:** - Length: A style choice that does not indicate accuracy or compliance.<br>- Emoji count: Style preference of the portal and not a quality signal.<br>- Neighbourhood adjectives: Words such as quiet, exclusive or family-friendly are subjective and the main route to steering.
- **Primary metrics:** - Fact accuracy<br>- Prohibited phrase recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Missing facts<br>- Local terms<br>- Coded language
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
- **Purpose:** Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules.
- **Label:** For "Listing Description Generation with Fair-Housing Checks": Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Training on past listings copies the biased language those listings contain.
- **Sources:** - **Source:** Fact match rate inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: match on meaning and not on string, because the same fact is worded many ways.<br>- **Source:** Prohibited phrase score inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: needs labelled examples from complaints and must be reviewed by counsel.<br>- **Source:** Agent edit rate inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: edits reflect habit as well as quality, so read it by agent.<br>- **Source:** Coverage inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: depends on what the agent considers key, so weight by market.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on past listings copies the biased language those listings contain<br>- Rules and enforcement change, so a checker that passed last year can fail now
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
