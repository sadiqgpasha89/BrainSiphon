# Architecture Decision Record (ADR) Template

**ADR Code:** `ADR-001-[TITLE]`  
**Status:** `[PROPOSED | ACCEPTED | SUPERSEDED | DEPRECATED]`  
**Deciders:** Principal Architect, Lead ML Engineer, Platform SRE Lead  
**Date:** `YYYY-MM-DD`  

---

## 1. Context & Problem Statement
*Describe the technical, business, or operational context requiring an architectural decision. What forces are in tension (e.g., latency budget vs model complexity; operational overhead vs feature freshness)?*

## 2. Decision Drivers
1. **Driver 1 (Latency SLA):** Must achieve P99 < 15ms at 5,000 requests/second.
2. **Driver 2 (Operational Overhead):** Small engineering team (3 FTEs); cannot manage distributed deep learning GPU clusters.
3. **Driver 3 (Regulatory Requirement):** Model must generate local feature attributions (SHAP) for adverse action notices.
4. **Driver 4 (Cost Ceiling):** Total monthly compute spend cannot exceed $10,000.

## 3. Options Considered
* **Option A: Gradient Boosted Decision Trees (LightGBM) on CPU with ONNX Runtime**
  * *Pros:* Sub-5ms scoring on commodity CPU, native TreeSHAP support, low memory footprint, zero GPU dependency.
  * *Cons:* Cannot process raw unstructured text/image features directly without pre-computed embeddings.
* **Option B: Deep Neural Network (TabNet / MLP) on GPU Cluster (Triton Model Server)**
  * *Pros:* Can train end-to-end representations across multi-modal data.
  * *Cons:* Requires dedicated GPU node pools ($$$), cold-start latency spikes, P99 latency variable (25–40ms), high ops complexity.
* **Option C: Hardcoded SQL / Rules Engine**
  * *Pros:* Ultra-fast (< 2ms), 100% deterministic, zero ML infrastructure needed.
  * *Cons:* High false-positive rate (8.2%), fails to detect novel coordinated fraud rings, brittle maintenance.

## 4. Decision Outcome
**Chosen Option:** **Option A (LightGBM on CPU with ONNX Runtime).**

### Justification:
Option A is the only approach that comfortably satisfies our 15ms hard latency SLA on standard Kubernetes CPU nodes while keeping monthly compute spend under $2,500. Furthermore, native TreeSHAP extraction allows instant regulatory compliance without the expensive kernel approximations required by neural networks.

## 5. Consequences & Trade-offs
* **Positive Consequences:**
  - Deployment is lightweight and horizontal pod autoscaling (HPA) triggers in < 10 seconds.
  - No GPU capacity bottlenecks or cloud stockout risks.
  - Direct interpretability out-of-the-box.
* **Negative Consequences / Mitigations:**
  - If unstructured text features (e.g. merchant descriptions) are introduced in Phase 2, they must be pre-embedded asynchronously into Redis rather than computed synchronously in the request path.

