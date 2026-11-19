# Credit Committee Memo Drafting Copilot: model card and data card

> Generated from the blueprint `bfsi/credit-committee-memo-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Committee Memo Drafting Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A fixed memo template filled by analysts from the spreading system, because it is the current process and defines the quality bar.
- **Production model:** Planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step.
- **Intended use:** Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment.
- **Out of scope:** - Draft length: longer drafts are not better, committees prefer concise memos.<br>- Model self-reported confidence: not calibrated for factual correctness.<br>- Style similarity to old memos: copies old weaknesses along with the form.
- **Primary metrics:** - Citation validity rate<br>- Figure exact-match rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Contradictory sources<br>- Confidential deal information<br>- Prompt injection in a filing
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
- **Purpose:** Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment.
- **Label:** For "Credit Committee Memo Drafting Copilot": Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Evaluating on memos the retriever has seen inflates grounding.
- **Sources:** - **Source:** Citation coverage inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: links must be checked against the retrieved text, not just present.<br>- **Source:** Figure match rate inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rounding rules differ by section.<br>- **Source:** Section completeness inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A filled section can still be empty of substance.<br>- **Source:** Analyst edit distance inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: low distance can mean rubber-stamping, review a sample.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on memos the retriever has seen inflates grounding<br>- Edit distance rewards agreeable drafts
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
