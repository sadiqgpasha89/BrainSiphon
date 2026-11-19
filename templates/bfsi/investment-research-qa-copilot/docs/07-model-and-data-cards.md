# Investment Research Q&A Copilot: model card and data card

> Generated from the blueprint `bfsi/investment-research-qa-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Research Q&A Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword search across the research portal, because analysts use it today.
- **Production model:** Hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin.
- **Intended use:** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention.
- **Out of scope:** - Note length: A style of the author and not a mark of relevance.<br>- Author: Weak signal once the content is matched, and it invites bias to star analysts.<br>- Rating word frequency: Counts of words like buy reflect the author's tone and not the facts.
- **Primary metrics:** - Citation validity<br>- Retrieval recall at 10
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Restricted-list company<br>- Conflicting estimates<br>- Prompt injection in a document
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
- **Purpose:** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention.
- **Label:** For "Investment Research Q&A Copilot": Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Evaluating on questions where the relevant notes are known flatters retrieval.
- **Sources:** - **Source:** Citation validity inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A passage may exist and not support the claim, so test entailment.<br>- **Source:** Retrieval recall inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: gold sets are costly to build, so sample across sectors.<br>- **Source:** Abstention precision inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: over-refusal lowers usefulness, so track both.<br>- **Source:** Freshness inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dating metadata are often missing or wrong.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on questions where the relevant notes are known flatters retrieval<br>- Entitlements differ by tester, so a test run by a senior user hides access failures
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
