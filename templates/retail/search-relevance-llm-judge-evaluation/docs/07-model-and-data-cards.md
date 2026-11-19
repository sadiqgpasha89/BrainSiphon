# Search Relevance Evaluation with LLM Judges: model card and data card

> Generated from the blueprint `retail/search-relevance-llm-judge-evaluation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Search Relevance Evaluation with LLM Judges · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Click-based implicit relevance metrics.
- **Production model:** Ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation.
- **Intended use:** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale.
- **Out of scope:** - Judge self-reported confidence: uncalibrated.<br>- Length of justification: not accuracy.
- **Primary metrics:** - Kappa vs humans<br>- Ranking-delta agreement
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Judge model update<br>- Long-tail queries misjudged
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale.
- **Label:** For "Search Relevance Evaluation with LLM Judges": Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Judge and ranker share a base model.
- **Sources:** - **Source:** Judge-human agreement inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: refresh anchors quarterly.<br>- **Source:** Rubric attribute coverage inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: parse attributes deterministically.<br>- **Source:** Inter-judge variance inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sampling at fixed temperature.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Judge and ranker share a base model<br>- Anchor set not representative of the tail
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
