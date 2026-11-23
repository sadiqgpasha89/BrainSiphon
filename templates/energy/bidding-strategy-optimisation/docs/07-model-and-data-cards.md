# Bidding Strategy Optimisation: model card and data card

> Generated from the blueprint `energy/bidding-strategy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bidding Strategy Optimisation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A rule-based bidding policy at marginal cost plus a margin, because it is the trader benchmark.
- **Production model:** A stochastic optimisation with scenario trees and a learned value function, hard constraints and compliance checks in rules, and a trader approval step with explanations and risk views.
- **Intended use:** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve.
- **Out of scope:** - Trader name: irrelevant.<br>- Market notice wording: an artefact.<br>- Terminal id: an identifier.
- **Primary metrics:** - Backtest margin with market impact<br>- Constraint violation rate<br>- Scenario calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Market rule update<br>- Model overconfidence<br>- Unit outage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve.
- **Label:** For "Bidding Strategy Optimisation": Recommend bid curves for generation and storage portfolios that maximise expected margin under price uncertainty and physical constraints, as advice for traders to approve. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Autonomous bidding.
- **Sources:** - **Source:** Price scenario distribution inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from forecasts.<br>- **Source:** Unit availability and ramp limits inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from plant status.<br>- **Source:** Storage state of charge inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from telemetry.<br>- **Source:** Position and exposure inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the trading system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Autonomous bidding<br>- Replay-only evaluation<br>- Learned physical limits
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
