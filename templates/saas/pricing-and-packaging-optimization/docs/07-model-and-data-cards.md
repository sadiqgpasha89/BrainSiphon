# Pricing & Packaging Optimisation: model card and data card

> Generated from the blueprint `saas/pricing-and-packaging-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pricing & Packaging Optimisation · **Domain:** saas · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Competitor-based and cost-plus pricing.
- **Production model:** Hierarchical choice model combining conjoint, test and usage data with segment-level optimisation and grandfathering simulations.
- **Intended use:** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction.
- **Out of scope:** - Rep discount rates: negotiation noise.<br>- Competitor list price only: ignores bundles.
- **Primary metrics:** - Backtested revenue under counterfactual prices<br>- Choice model calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Legacy customers perceive an unfair increase<br>- Competitor launches a cheaper plan
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction.
- **Label:** For "Pricing & Packaging Optimisation": Estimate willingness-to-pay and feature value to design plans, limits and price points that maximise revenue and satisfaction. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Observational prices confounded by deal size.
- **Sources:** - **Source:** Feature usage by plan inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: telemetry.<br>- **Source:** Willingness-to-pay estimate inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: survey bias.<br>- **Source:** Price elasticity by segment inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: test design.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Observational prices confounded by deal size<br>- Ignoring cannibalisation
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
