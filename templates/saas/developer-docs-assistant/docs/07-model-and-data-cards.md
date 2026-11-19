# Developer Documentation Assistant: model card and data card

> Generated from the blueprint `saas/developer-docs-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Developer Documentation Assistant · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Docs search with keyword matching.
- **Production model:** Version-aware retrieval over docs and OpenAPI specs, code generation with API-existence validators and sandbox execution.
- **Intended use:** Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.
- **Out of scope:** - Optimise for answer length or friendly greetings: verbosity hides the one fact the developer needs, and the extra tokens are a direct cost at this scale.<br>- Retrieve only the latest docs for every user: a version mismatch is the most common way correct-looking code breaks.<br>- Trust generated code without running it: language models invent plausible API calls, and a pass in the sandbox is the only evidence that matters.<br>- Judge by retrieval recall at five alone: it is easy on small corpora and silent about stale or invented answers.
- **Primary metrics:** - Snippet execution pass rate<br>- Hallucinated API rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Deprecated API still in older docs<br>- SDK differences across languages<br>- Changelog quotes both old and new values<br>- Question phrased outside the known vocabulary
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.
- **Label:** Each golden question carries the product, fact, version and the exact expected value, or none when the docs never state it. A response is correct only when it gives the expected value for the right version, or abstains on an unanswerable question. Citations are checked separately for support, because a cited passage can still give the wrong version.
- **Sources:** - **Source:** API existence check inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: use the OpenAPI spec for the user's version.<br>- **Source:** Snippet execution pass inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: run against the pinned SDK version in a test harness.<br>- **Source:** Version match inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: read the version from request context, not from the question text alone.<br>- **Source:** Citation supports the value inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: A valid citation alone is not proof, because a changelog can cite both the old and the new value.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on questions from docs headings<br>- Not executing the code
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
