# Traffic Reroute & Congestion Mitigation: model card and data card

> Generated from the blueprint `telecom/traffic-reroute-congestion-mitigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Reroute & Congestion Mitigation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A rule that shifts traffic to the next-best path when utilisation passes a threshold, because it is simple and operators trust it.
- **Production model:** A constrained policy search over a network simulator using a learned demand model, producing ranked reroute plans with predicted utilisation and a safety check, executed only through approved templates.
- **Intended use:** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting.
- **Out of scope:** - Customer name on the largest flow: does not change routing.<br>- Day of month: weak effect on load.<br>- Interface description text: free text.
- **Primary metrics:** - Predicted versus measured utilisation error<br>- Share of plans passing simulated failure tests<br>- Regret against an oracle on replayed days
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Demand spike from a live event<br>- Failure during a change<br>- Oscillation
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new cells and sites with no history, rare vendor equipment, small enterprise accounts and roaming visitors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting.
- **Label:** For "Traffic Reroute & Congestion Mitigation": Recommend traffic engineering changes that relieve congested links and routes within safe limits, so peak-hour quality holds without manual rerouting. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Optimising mean utilisation.
- **Sources:** - **Source:** Link utilisation percentile inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: use matching windows with the SLA.<br>- **Source:** Demand matrix estimate inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: estimated demand has error bars.<br>- **Source:** Path diversity inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: needs live topology.<br>- **Source:** Latency and loss on alternatives inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: measure on recent data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Optimising mean utilisation<br>- Skipping failure simulation<br>- Applying plans without a dwell time
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
