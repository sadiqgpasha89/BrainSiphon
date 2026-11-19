# Contact-Centre Call QA & Summarisation: model card and data card

> Generated from the blueprint `bfsi/contact-centre-call-qa-and-summarisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contact-Centre Call QA & Summarisation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Random sampling of calls scored by supervisors, because that is the standard.
- **Production model:** ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list.
- **Intended use:** Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes.
- **Out of scope:** - Call length: Weakly related to quality once the topic is known.<br>- Agent accent: Not a quality measure and scoring on it is unfair.<br>- Hold music: An audio artefact and not a speech signal.
- **Primary metrics:** - Item F1<br>- Summary faithfulness
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Noisy audio<br>- Dialects and languages<br>- Customer with vulnerability
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes.
- **Label:** For "Contact-Centre Call QA & Summarisation": Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears.
- **Sources:** - **Source:** Disclosure detection inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: speech recognition errors cause misses, so use fuzzy matching.<br>- **Source:** Summary faithfulness inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: needs an entailment check, not only overlap.<br>- **Source:** Sentiment shift inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: weak and noisy, so use with other signals.<br>- **Source:** Silence and talk ratio inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: noisy, as silence is often legitimate.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears<br>- Speech recognition tested on clean audio overstates accuracy on real calls
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
