# Macroeconomic Scenario Generation for Stress Tests: model card and data card

> Generated from the blueprint `bfsi/macro-scenario-generation-for-stress-tests` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Macroeconomic Scenario Generation for Stress Tests · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Regulator-provided scenarios and a scalar severity multiplier, because they are mandated.
- **Production model:** A Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval.
- **Intended use:** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models.
- **Out of scope:** - Daily market noise: irrelevant for quarterly paths.<br>- Social sentiment: too noisy for macro drivers.<br>- Forecaster consensus stale values: already priced into baselines.
- **Primary metrics:** - Out-of-sample path likelihood<br>- Consistency checks pass rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Structural break<br>- Missing data for emerging markets<br>- Conflicting narratives
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models.
- **Label:** For "Macroeconomic Scenario Generation for Stress Tests": Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Fitting on 2010-2019 gives mild shocks.
- **Sources:** - **Source:** VAR impulse responses inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: short histories give unstable estimates.<br>- **Source:** Historical analogues inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: few crises exist per country.<br>- **Source:** Regime indicator inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: regime labelling is subjective.<br>- **Source:** Narrative-to-shock mapping inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: must be validated by economists.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fitting on 2010-2019 gives mild shocks<br>- LLM-drafted shocks may be fluent but not calibrated
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
