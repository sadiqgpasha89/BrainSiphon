# MEC Edge Workload Placement: model card and data card

> Generated from the blueprint `telecom/mec-edge-workload-placement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** MEC Edge Workload Placement · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Place each workload at the nearest site with enough capacity, because it is the simplest scheme.
- **Production model:** A constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates.
- **Intended use:** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity.
- **Out of scope:** - Workload name: an identifier.<br>- Site name: an identifier.<br>- Tenant brand: irrelevant.
- **Primary metrics:** - Constraint violation rate in simulation<br>- Latency target attainment<br>- Forecast error
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Demand spike at one site<br>- Site failure<br>- Migration storm
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
- **Purpose:** Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity.
- **Label:** For "MEC Edge Workload Placement": Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity. The reference kit's label: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Design around this trap first: Cost-only placement.
- **Sources:** - **Source:** Latency to users inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: live measurements.<br>- **Source:** Site capacity headroom inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: live.<br>- **Source:** Workload demand forecast inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: per workload.<br>- **Source:** Residency rules inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from contracts.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Cost-only placement<br>- Ignoring migration cost<br>- No simulation
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
