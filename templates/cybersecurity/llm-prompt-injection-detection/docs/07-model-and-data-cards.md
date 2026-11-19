# LLM Prompt-Injection & Jailbreak Detection: model card and data card

> Generated from the blueprint `cybersecurity/llm-prompt-injection-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Prompt-Injection & Jailbreak Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword and regex filters for known jailbreak phrases.
- **Production model:** Small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call.
- **Intended use:** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools.
- **Out of scope:** - Prompt length: weak.<br>- Language: weak.
- **Primary metrics:** - Attack detection rate at 0.1% FPR<br>- Robustness to encoded variants
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Attack encoded in base64 or another language<br>- Benign prompts that discuss security flagged<br>- Payload hidden in a retrieved document or MCP tool response<br>- Multi-turn crescendo attack
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new tenants, rare log sources and low-volume languages; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools.
- **Label:** For "LLM Prompt-Injection & Jailbreak Detection": Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Static public jailbreak datasets.
- **Sources:** - **Source:** Instruction-likeness of untrusted content inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: segmentation.<br>- **Source:** Policy violation attempt score inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: red-team data.<br>- **Source:** Tool-call privilege anomaly inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: intent model.<br>- **Source:** Untrusted-source provenance inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: provenance must be attached at retrieval, not inferred later.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Static public jailbreak datasets<br>- Ignoring indirect injection
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
