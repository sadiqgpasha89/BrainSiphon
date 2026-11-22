# Healthcare Contract Negotiation Intelligence: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-negotiation-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Negotiation Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Negotiators assemble briefs from past contracts and personal notes.
- **Production model:** Hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks.
- **Intended use:** Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points.
- **Out of scope:** - Negotiator seniority: not leverage.<br>- Supplier public statements: not evidence.<br>- Brief length: not value.
- **Primary metrics:** - Citation precision and unsupported-benchmark rate<br>- Brief usefulness rating by negotiators<br>- Fallback-position accuracy against the playbook
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - No approved benchmark exists<br>- Supplier changes terms mid-negotiation<br>- Conflicting playbook versions<br>- Injected instruction in a supplier document
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points.
- **Label:** For "Healthcare Contract Negotiation Intelligence": Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Accepting fluent benchmarks without a source.
- **Sources:** - **Source:** Leverage indicators inputs<br>**Owner:** Procurement<br>**System Of Record:** Contract management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: latest verified data.<br>- **Source:** Performance record inputs<br>**Owner:** Legal<br>**System Of Record:** Clause library and playbook<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: verified records.<br>- **Source:** Term deviation from portfolio norms inputs<br>**Owner:** Contract management<br>**System Of Record:** Procurement and spend system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: normalised terms.<br>- **Source:** Benchmark comparability inputs<br>**Owner:** Finance<br>**System Of Record:** Supplier performance records<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: source metadata.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Accepting fluent benchmarks without a source<br>- Using stale playbooks<br>- Recommending concessions
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
