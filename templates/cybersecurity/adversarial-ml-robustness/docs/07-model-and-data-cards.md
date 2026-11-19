# Adversarial Robustness for Deployed Models: model card and data card

> Generated from the blueprint `cybersecurity/adversarial-ml-robustness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adversarial Robustness for Deployed Models · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Standard training with input validation.
- **Production model:** Domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI.
- **Intended use:** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks.
- **Out of scope:** - Clean accuracy alone: hides vulnerability.<br>- Model size: weak.
- **Primary metrics:** - Robust accuracy under adaptive domain attacks<br>- Clean accuracy retention
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Attacker adapts to the deployed defence<br>- Robust training reduces accuracy on rare classes
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
- **Purpose:** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks.
- **Label:** For "Adversarial Robustness for Deployed Models": Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Non-adaptive attacks only.
- **Sources:** - **Source:** Robust accuracy under constrained attack inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: attack realism.<br>- **Source:** Decision margin distribution inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calibration.<br>- **Source:** Poisoning sensitivity inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: simulation.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Non-adaptive attacks only<br>- Unrealistic perturbation budgets
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
