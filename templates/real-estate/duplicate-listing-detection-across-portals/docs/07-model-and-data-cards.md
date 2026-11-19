# Duplicate Listing Detection Across Portals: model card and data card

> Generated from the blueprint `real-estate/duplicate-listing-detection-across-portals` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Duplicate Listing Detection Across Portals · **Domain:** real-estate · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Exact match on normalised address and price, because it is simple.
- **Production model:** Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints.
- **Intended use:** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.
- **Out of scope:** - Listing ID: An arbitrary key assigned by each portal that cannot match across portals.<br>- Description order: Sentence order varies with templates and has no bearing on identity.<br>- Photo count: Differs between portals because of upload limits and not between homes.
- **Primary metrics:** - Pair F1<br>- Cluster purity
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Two units same address<br>- Re-listed property<br>- Agent errors
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.
- **Label:** For "Duplicate Listing Detection Across Portals": Identify the same property listed by several agents and portals so search shows one entry and statistics count it once. The reference kit's label: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Design around this trap first: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs.
- **Sources:** - **Source:** Address match inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: formats differ between portals, so normalise before comparing.<br>- **Source:** Image hash similarity inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: re-edited and cropped images change the hash, so back it with an embedding match.<br>- **Source:** Price and size agreement inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: prices change between portals within days, so use a tolerance not equality.<br>- **Source:** Agent relation inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data on agency relationships is incomplete.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs<br>- The same agents and addresses in train and test leak identity information
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
