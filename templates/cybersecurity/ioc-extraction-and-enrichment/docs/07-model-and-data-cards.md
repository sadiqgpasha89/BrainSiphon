# IOC Extraction & Enrichment: model card and data card

> Generated from the blueprint `cybersecurity/ioc-extraction-and-enrichment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IOC Extraction & Enrichment · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Regex extraction with static scoring.
- **Production model:** Transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL.
- **Intended use:** Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting.
- **Out of scope:** - Report length: weak.<br>- Vendor logo: none.
- **Primary metrics:** - Extraction F1 and role precision<br>- Blocklist false-positive rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Shared hosting IPs listed as malicious<br>- Defanging variants break parsers
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new tenants, rare log sources and low-volume languages; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting.
- **Label:** For "IOC Extraction & Enrichment": Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Evaluating extraction without role context.
- **Sources:** - **Source:** Indicator context window inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: parsing.<br>- **Source:** Multi-source corroboration inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source independence.<br>- **Source:** Infrastructure reputation inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data feeds.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating extraction without role context<br>- Ignoring decay
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
