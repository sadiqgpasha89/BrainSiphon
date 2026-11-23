# Legacy Code Modernisation Planner: model card and data card

> Generated from the blueprint `devtools/legacy-modernisation-planner` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Legacy Code Modernisation Planner · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual analysis by senior engineers and consultants, because it is the standard approach.
- **Production model:** A code analysis pipeline with a dependency graph, LLM-assisted rule extraction with line links, a characterisation test generator and a staged plan with risk ratings.
- **Intended use:** Analyse old codebases such as COBOL, PL/SQL and large Java monoliths to map business rules, dependencies and test gaps and propose a staged modernisation plan for architects to approve.
- **Out of scope:** - Developer name: personal data.<br>- Comment language: weak link.<br>- File name: an artefact.
- **Primary metrics:** - Rule extraction accuracy on audited modules<br>- Dependency recall<br>- Characterisation test coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Missing source<br>- Hidden coupling<br>- Dialect differences
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Analyse old codebases such as COBOL, PL/SQL and large Java monoliths to map business rules, dependencies and test gaps and propose a staged modernisation plan for architects to approve.
- **Label:** For "Legacy Code Modernisation Planner": Analyse old codebases such as COBOL, PL/SQL and large Java monoliths to map business rules, dependencies and test gaps and propose a staged modernisation plan for architects to approve. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Big-bang rewrites.
- **Sources:** - **Source:** Call and data dependency graph inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from static analysis.<br>- **Source:** Change frequency and defect history inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from version control.<br>- **Source:** Test coverage and characterisation inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from CI.<br>- **Source:** Business rule extraction confidence inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the model.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Big-bang rewrites<br>- Rules with no source links<br>- Changes without characterisation tests
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
