# Phishing URL & Email Detection: model card and data card

> Generated from the blueprint `cybersecurity/phishing-url-and-email-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing URL & Email Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Blocklists plus keyword heuristics.
- **Production model:** Ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning.
- **Intended use:** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update.
- **Out of scope:** - Email subject length: weak.<br>- Number of recipients: confounded with newsletters.
- **Primary metrics:** - Detection rate at 1 in 100k false positive<br>- Time-to-detect of new campaigns
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Legitimate marketing mail from a new domain<br>- Attackers cloak pages from crawlers
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
- **Purpose:** Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update.
- **Label:** For "Phishing URL & Email Detection": Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Training on old campaigns.
- **Sources:** - **Source:** Domain age and registration pattern inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: WHOIS timing.<br>- **Source:** Brand impersonation score inputs<br>**Owner:** Security data platform<br>**System Of Record:** Email gateway and mail-flow configuration<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: brand corpus.<br>- **Source:** Sender-recipient relationship graph inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: graph as-of.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on old campaigns<br>- Cloaked pages labelled benign
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
