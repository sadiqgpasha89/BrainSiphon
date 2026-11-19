# Intraday Liquidity Forecasting: model card and data card

> Generated from the blueprint `bfsi/intraday-liquidity-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Intraday Liquidity Forecasting · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same-day-last-week profile with a safety buffer, because treasurers know and trust it.
- **Production model:** Quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback.
- **Intended use:** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers.
- **Out of scope:** - Payment reference text: inconsistent across channels.<br>- Branch of origin: not related to the intraday timing.<br>- Weekday number alone: too coarse.
- **Primary metrics:** - Coverage of the 95% quantile<br>- Peak-time error
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Settlement system outage<br>- One-off large payment<br>- Cut-off time changes
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers.
- **Label:** For "Intraday Liquidity Forecasting": Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Training on end-of-day aggregated data hides timing.
- **Sources:** - **Source:** Time-of-day profile inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: day types must be classified using the settlement calendar.<br>- **Source:** Queued payments inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: the queue state needs a consistent snapshot.<br>- **Source:** Counterparty concentration inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: counterparty identities need entity mapping.<br>- **Source:** Scheduled obligations inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: source systems differ on timing.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on end-of-day aggregated data hides timing<br>- Back-test on calm days misses stressed peaks
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
