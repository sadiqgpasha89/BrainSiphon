# Dynamic Rent Pricing for Multifamily: model card and data card

> Generated from the blueprint `real-estate/dynamic-rent-pricing-for-multifamily` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Rent Pricing for Multifamily · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manager-set rents reviewed weekly, because it is common.
- **Production model:** Demand forecasting plus a constrained pricing policy with exploration inside guardrails.
- **Intended use:** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.
- **Out of scope:** - Unit nickname: A label with no bearing on demand.<br>- Photo count: Depends on the leasing team's habits and not on the unit.<br>- Agent: The leasing agent does not change what the market will pay.
- **Primary metrics:** - Revenue lift in simulation<br>- Demand forecast error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Rent control<br>- New building<br>- Shock event
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.
- **Label:** For "Dynamic Rent Pricing for Multifamily": Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules. No reference kit models this label, so define it exactly as in M1. Design around this trap first: A simulated demand curve is optimistic about how tenants react to price.
- **Sources:** - **Source:** Inquiry velocity inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: noise from marketing campaigns, so adjust for ad spend.<br>- **Source:** Occupancy vs target inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: occupancy definitions differ between systems, so use one definition.<br>- **Source:** Competitor asking rents inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: asking prices differ from signed rents, so apply a historical discount.<br>- **Source:** Expiry schedule inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: early terminations alter the schedule, so refresh it daily.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A simulated demand curve is optimistic about how tenants react to price<br>- Past prices were not set at random, so the effect of price cannot be read from history
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
