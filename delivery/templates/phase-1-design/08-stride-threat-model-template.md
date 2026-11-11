# Threat Modeling Matrix: STRIDE & OWASP LLM Top 10

**Document Code:** `BS-TMPL-DESIGN-08`  
**Phase:** Phase 1 — Architecture & Design (Step 1.4)  

---

## 1. Classical STRIDE Threat Modeling for AI/ML Microservices

| Threat Category | Threat Description | Attack Vector | Technical Control Mitigation | Evidence / Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary impersonates trusted payment gateway | Stolen API key or forged JWT | mTLS mutual TLS authentication + asymmetric RS256 JWT validation with rotating keys | `tests/security/test_jwt_spoofing.py` |
| **Tampering** | Attacker modifies feature vector in transit or in cache | Cache poisoning attack on Redis | Authenticated Redis ACLs, TLS encryption in transit, SHA256 checksum of feature vector | `tests/security/test_feature_tampering.py` |
| **Repudiation** | Operator denies confirming fraudulent case review | Dispute over manual override | Immutable append-only WAL decision ledger with cryptographically signed user IDs | `tests/security/test_audit_repudiation.py` |
| **Info Disclosure** | Attacker extracts proprietary model weights or PII | Model inversion / gradient leakage | Stripping training data from artifact; container hardening with read-only root filesystems | `tests/security/test_model_leakage.py` |
| **Denial of Service** | Volumetric DDOS against inference endpoint | Spike in concurrent scoring requests | Envoy rate limiting, Redis token bucket pacer, and adaptive concurrency shedding | `tests/performance/k6_ddos_spike.js` |
| **Elevation of Priv.**| Attacker tricks service into executing privileged ops | Tool call hijacking in agent | Strict least-privilege RBAC per tool; read-only database connections for agent tools | `tests/security/test_tool_privileges.py` |

---

## 2. OWASP Top 10 for LLM & Agentic Applications

| Threat Code | OWASP LLM Category | Specific Vulnerability | Implemented Architectural Defense |
| :--- | :--- | :--- | :--- |
| **LLM01** | **Prompt Injection** | User input overrides system prompt instructions | Dual-tokenizer isolation, XML tags separating instructions from data, prompt guard filter |
| **LLM02** | **Insecure Output Handling** | LLM output rendered directly in UI or executed in shell | Strict markdown sanitization (DOMPurify), JSON schema validation via Pydantic |
| **LLM03** | **Training Data Poisoning** | Adversary injects biased or malicious docs into corpus | Document checksum verification, source domain whitelisting, and anomaly filtering |
| **LLM04** | **Model Denial of Service** | Complex recursive prompts cause GPU / token exhaustion | Max token output limits, context window truncations, timeout circuit breakers |
| **LLM05** | **Supply Chain Vulnerability** | Compromised Python packages or model weights | Trivy container image scanning, CycloneDX SBOM generation, pinned hashes in lockfiles |
| **LLM06** | **Sensitive Info Disclosure** | LLM memorization leaks customer PII in responses | Microsoft Presidio PII redaction layer before LLM prompt assembly |
| **LLM07** | **Insecure Plugin Design** | Agent calls destructive API without validation | Typed OpenAPI schemas, parameterized queries, and human confirmation approval gates |
| **LLM08** | **Excessive Agency** | Agent granted broad write permissions across tools | Least-privilege IAM credentials; tools scoped strictly to read-only where possible |
| **LLM09** | **Overreliance / Hallucination** | System makes false factual claims without citations | RAG citation verifier; Ragas hallucination score gate (faithfulness ≥ 0.85) |
| **LLM10** | **Model Theft** | Competitor scrapes model outputs to train replica | Rate limiting per user/IP, watermark injection, and prompt auditing |

