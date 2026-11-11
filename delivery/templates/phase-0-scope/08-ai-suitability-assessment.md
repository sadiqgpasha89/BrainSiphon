# AI Suitability Assessment & Paradigm Decision Framework

**Document Code:** `BS-TMPL-SCOPE-08`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.9)  

---

## 1. The Core Engineering Rule: "Why AI, and Why Not Rules?"
Before writing a single line of machine learning code or integrating a foundation model, an engineer must prove that deterministic, rule-based, or heuristic software is inadequate for the problem.

```
Is the problem deterministic with < 20 clear business rules?
  ├── YES ──► STOP: Write deterministic software / SQL rules engine. Do not use AI.
  └── NO
       │
       Does the problem require exact mathematical optimization (e.g. traveling salesman, bin packing)?
         ├── YES ──► STOP: Use Linear Programming / Mixed Integer Programming (MIP) solver.
         └── NO
              │
              Is historical labeled data available or obtainable with signal?
                ├── NO ──► Use Contextual Bandits, Cold-Start Heuristics, or RAG.
                └── YES
                     │
                     Are consequences fatal/regulated requiring 100% human accountability?
                       ├── YES ──► Enforce Human-in-the-Loop (HITL) Decisioning.
                       └── NO  ──► Full Automated Inference with Guardrails.
```

---

## 2. Quantitative Suitability Scoring Matrix

Rate each dimension from 1 (Low) to 5 (High). Total score determines architectural paradigm.

| Dimension | Assessment Question | Score (1–5) | Justification |
| :--- | :--- | :--- | :--- |
| **1. Pattern Complexity** | Are patterns non-linear, multi-factorial, and constantly evolving? | `[Score]` | `[Justification]` |
| **2. Rule Fragility** | Do hand-coded rules decay rapidly, requiring constant developer maintenance? | `[Score]` | `[Justification]` |
| **3. Dimensionality** | Does the decision require evaluating > 30 correlated features simultaneously? | `[Score]` | `[Justification]` |
| **4. Data Availability** | Are there ≥ 100,000 historical examples with trustworthy outcome labels? | `[Score]` | `[Justification]` |
| **5. Latency Feasibility** | Can the model evaluate within the required latency budget (e.g. < 15ms)? | `[Score]` | `[Justification]` |
| **6. Error Tolerance** | Can the business tolerate bounded statistical error (e.g. 0.5% FPR)? | `[Score]` | `[Justification]` |

### Scoring Verdict:
* **Score < 15:** **Do Not Use ML/AI.** Implement deterministic rules, database constraints, or linear heuristics.
* **Score 15 – 22:** **Hybrid Rules + ML.** Use rules for obvious 90% cases; use ML for the ambiguous 10%.
* **Score 23 – 30:** **Primary AI/ML System.** Machine learning is the optimal, high-signal engineering choice.

---

## 3. Paradigm Selection Guide (L1 Archetypes)

| Problem Characteristic | Optimal Paradigm | Why This Paradigm Over Alternatives |
| :--- | :--- | :--- |
| Structured tabular events with delayed labels | **Tabular (Boosted Trees)** | Fast inference (< 10ms), handles tabular sparsity better than neural nets. |
| Time-dependent sensor or demand series | **Time-Series Forecasting** | Models seasonality, autoregression, and hierarchical reconciliation. |
| Highly connected relational / entity networks | **Graph Analytics / GNN** | Captures multi-hop rings and entity relationships that tabular joins miss. |
| Unstructured text, documents, or knowledge bases | **LLM / Hybrid RAG** | Combines semantic retrieval with keyword BM25 precision and citations. |
| Multi-step investigations with tool execution | **Agentic AI** | ReAct state machines execute structured tools with human approval gates. |

