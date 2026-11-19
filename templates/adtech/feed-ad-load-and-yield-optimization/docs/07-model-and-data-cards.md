# Feed Ad Load & Yield Optimisation: model card and data card

> Generated from the blueprint `adtech/feed-ad-load-and-yield-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Feed Ad Load & Yield Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed ad every 5th item.
- **Production model:** Joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics.
- **Intended use:** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement.
- **Out of scope:** - Ad ID: none.<br>- Slot ID: none.
- **Primary metrics:** - Surrogate-index prediction of long-term impact<br>- Simulated slate value
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Short-term gains from aggressive ad load<br>- Advertiser demand drop leaves slots unfilled
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement.
- **Label:** For "Feed Ad Load & Yield Optimisation": Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement. No reference kit models this label, so define it exactly as in M1. Design around this trap first: A/B tests too short to see retention effects.
- **Sources:** - **Source:** User ad tolerance inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: experiments.<br>- **Source:** Predicted ad value inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calibration.<br>- **Source:** Organic item value inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibration.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A/B tests too short to see retention effects<br>- Optimising impressions rather than value
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
