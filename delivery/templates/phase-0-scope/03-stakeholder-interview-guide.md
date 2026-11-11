# Stakeholder Interview Guide & Capture Template

**Document Code:** `BS-TMPL-SCOPE-03`  
**Phase:** Phase 0 — Scope & Discovery (Step 0.2 & 0.3)  

---

## 1. Interview Track A: Executive Sponsor & Business Owner
* **Goal:** Align on financial justification, business risk tolerance, and go/no-go criteria.
* **Core Questions:**
  1. What is the business outcome that makes this project an unequivocal success in 6 months?
  2. If the model had a 1% error rate, what is the maximum acceptable financial loss or brand damage per quarter?
  3. What are the non-negotiable regulatory or reputational boundaries?
  4. What other business initiatives or core system migrations are scheduled that could disrupt this system?
* **Capture Table:**
  | Date | Interviewee | Title & Org | Key Insights / Quotes | Action Items |
  |---|---|---|---|---|
  | `YYYY-MM-DD` | `[Name]` | `[Executive Title]` | `[Insight]` | `[Action]` |

---

## 2. Interview Track B: Operations Leads & Frontline Decision Makers
* **Goal:** Uncover the unwritten heuristics, edge cases, and manual workarounds.
* **Core Questions:**
  1. Walk me through the last 3 hard decisions you had to make. What made them difficult?
  2. What pieces of information do you search for that are NOT in the standard database tables?
  3. What alert or notification do you routinely ignore, and why?
  4. What would cause you to distrust an automated AI recommendation and override it?
* **Capture Table:**
  | Date | Interviewee | Daily Volume | Top 3 Signals Used | Top 3 Frustrations |
  |---|---|---|---|---|
  | `YYYY-MM-DD` | `[Name]` | `[e.g. 80 cases/day]` | `[e.g. device velocity, IP match]` | `[e.g. alert fatigue, slow DB]` |

---

## 3. Interview Track C: Risk, Compliance & Legal Counsel
* **Goal:** Identify regulatory gates, explainability rules, and data handling requirements.
* **Core Questions:**
  1. Which specific regulations govern this decision (e.g., Fair Lending, HIPAA, EU AI Act High Risk)?
  2. Does the model require adverse action notices (explaining to a rejected user why they were declined)?
  3. Are there protected classes or proxy variables that are strictly prohibited from entering the feature store?
  4. What is the required retention period for training datasets and inference logs?
* **Capture Table:**
  | Requirement Category | Applicable Clause / Rule | Mandatory Control | Verification Evidence |
  |---|---|---|---|
  | Data Privacy | GDPR Art. 22 / DPDP | Right to human intervention | Review queue audit logs |
  | Fairness & Bias | Equal Credit Opportunity | Disparate impact ratio ≥ 0.80 | Quarterly bias audit report |

---

## 4. Interview Track D: Enterprise Platform & Infrastructure Engineers
* **Goal:** Uncover architectural constraints, network boundaries, and deployment patterns.
* **Core Questions:**
  1. What is the target hosting environment (AWS VPC, GCP Project, On-prem OpenShift)?
  2. What are the standard CI/CD pipelines, secret managers, and container registries?
  3. Are GPU nodes available in the production cluster, or is inference restricted to CPU?
  4. What is the current latency baseline for internal network calls between microservices?

