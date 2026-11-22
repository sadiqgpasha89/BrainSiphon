# Patient Safety Event Root-Cause Discovery: model card and data card

> Generated from the blueprint `healthcare/patient-safety-event-root-cause-discovery` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Safety Event Root-Cause Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword counts by event category and month.
- **Production model:** Embedding-based topic clustering with stability checks, a contributing-factor graph with co-occurrence and temporal analytics, evidence links to source reports and an investigator workbench that records hypotheses and outcomes.
- **Intended use:** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation.
- **Out of scope:** - Reporter identity: not a system factor.<br>- Rare words unique to one report: outliers.<br>- Report author department: confounds reporting culture with safety.
- **Primary metrics:** - Topic coherence and cluster stability across resamples<br>- Agreement of cluster factors with investigator-coded factors<br>- Hypothesis hit rate in follow-up reviews
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Reporting culture change<br>- Small clusters<br>- Re-identification risk in free text<br>- Spurious cluster driven by a template
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation.
- **Label:** For "Patient Safety Event Root-Cause Discovery": Find recurring contributing factors and system patterns across de-identified safety events, giving investigators hypotheses and evidence links without asserting causality from correlation. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Reporting a correlation as a cause.
- **Sources:** - **Source:** Semantic cluster membership inputs<br>**Owner:** Patient safety office<br>**System Of Record:** Incident reporting system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: de-identified text only.<br>- **Source:** Temporal concentration inputs<br>**Owner:** Quality<br>**System Of Record:** Root-cause analysis case repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event time.<br>- **Source:** Process-step co-occurrence inputs<br>**Owner:** Human factors and clinical engineering<br>**System Of Record:** Process and workflow data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: mapped by taxonomy.<br>- **Source:** Factor co-occurrence graph inputs<br>**Owner:** Patient safety office<br>**System Of Record:** Safety causal taxonomy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: only taxonomy-coded factors.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Reporting a correlation as a cause<br>- Evaluating clusters only by visual inspection<br>- Mixing identified and de-identified text
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
