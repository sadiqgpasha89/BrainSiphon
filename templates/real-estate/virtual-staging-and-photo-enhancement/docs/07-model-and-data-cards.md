# Virtual Staging & Photo Enhancement: model card and data card

> Generated from the blueprint `real-estate/virtual-staging-and-photo-enhancement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Staging & Photo Enhancement · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual staging by a service, because it is the current practice.
- **Production model:** Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label.
- **Intended use:** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.
- **Out of scope:** - Prompt wording: Changes output from run to run without a link to image honesty or appeal.<br>- Seed: Random variation between renders that should not drive a decision.<br>- Render time: Reflects server load, not the quality of the image.
- **Primary metrics:** - Structure similarity<br>- Human realism ratings
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Wrong scale furniture<br>- Reflective surfaces<br>- Multiple styles
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
- **Purpose:** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.
- **Label:** For "Virtual Staging & Photo Enhancement": Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones.
- **Sources:** - **Source:** Structure preservation inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: mask the furniture region, otherwise added furniture lowers the score.<br>- **Source:** Lighting consistency inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: estimate light from fixed features, because windows and lamps vary.<br>- **Source:** Style fit inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: taste differs by market, so validate with local raters.<br>- **Source:** Disclosure flag inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: test on images after portal resizing and cropping.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones<br>- Taste differs by market, so raters from one region approve images that buyers elsewhere dislike
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
