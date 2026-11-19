# Transaction Monitoring Alert Triage with LLM Agents: model card and data card

> Generated from the blueprint `fintech/transaction-monitoring-alert-triage-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transaction Monitoring Alert Triage with LLM Agents · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Template-based narrative generator with rule-driven pre-disposition, which is auditable and cheap.
- **Production model:** Tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims.
- **Intended use:** Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases.
- **Out of scope:** - Long free-text KYC notes: stale and contradictory, retrieve structured fields first.<br>- Full transaction dump in prompt: blows context and dilutes attention, summarise windows instead.
- **Primary metrics:** - Citation precision and recall<br>- Disposition agreement with senior analysts
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Prompt injection inside a payment reference field<br>- Model update changes narrative style
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases.
- **Label:** For "Transaction Monitoring Alert Triage with LLM Agents": Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Golden set written by the same team that prompts the model.
- **Sources:** - **Source:** Evidence coverage inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: coverage must be computed on the final text not the draft.<br>- **Source:** Rule-hit context inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: include scenario version to stay point-in-time.<br>- **Source:** Customer behaviour baseline inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: baseline excludes the alert month.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Golden set written by the same team that prompts the model<br>- Measuring fluency instead of factual support
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
