# API Documentation Generation: model card and data card

> Generated from the blueprint `devtools/api-documentation-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Documentation Generation · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Hand-written docs with generated references from comments, because it is the standard practice.
- **Production model:** A generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners.
- **Intended use:** Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI.
- **Out of scope:** - Author name: personal data.<br>- File path wording: an artefact.<br>- Commit time: irrelevant.
- **Primary metrics:** - Example pass rate<br>- Schema agreement<br>- Reviewer edit rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Breaking change<br>- Poor schema<br>- Secrets in examples
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new repositories, rarely used languages, large refactors and first-time contributors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI.
- **Label:** For "API Documentation Generation": Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Prose with no tests.
- **Sources:** - **Source:** Schema and type information inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from code.<br>- **Source:** Test and example results inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from CI.<br>- **Source:** Change diff inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from version control.<br>- **Source:** Usage logs inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregated.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Prose with no tests<br>- Publishing without owners<br>- Examples with real secrets
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
