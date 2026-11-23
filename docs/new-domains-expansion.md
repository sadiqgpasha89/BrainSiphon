# New domains expansion (unvalidated draft)

Eight domains, 50 blueprints each (400 total), added in one pull request. These were authored without network access, so the repository's build, validators and tests were not run. Run `npm ci && npm run content:build` and fix any findings before merging.

## Telecommunications & Networks (`telecom`)

Network self-healing, predictive customer care, real-time service activation, revenue assurance and edge services for operators running carrier-grade networks.

- Network operations & self-healing (use cases 1-7): Finding, grouping and fixing faults before customers notice, with change risk under control.
- Radio, core & capacity (use cases 8-13): Forecasting traffic, saving energy and planning capacity across cells and the core.
- Customer care & experience (use cases 14-20): Predicting problems, answering them and notifying customers before they call.
- Service provisioning & orders (use cases 21-26): Activating services in real time and clearing order fallout.
- Revenue, fraud & billing (use cases 27-33): Fraud, leakage, billing errors and settlement accuracy.
- Marketing, churn & sales (use cases 34-40): Retention, offers, upgrades and enterprise demand.
- Field force & assets (use cases 41-46): Dispatching technicians, inspecting towers and predicting site and fibre failures.
- Enterprise, edge & governance (use cases 47-50): Enterprise SLAs, edge placement and guardrails for autonomous agents.

## Manufacturing & Industrial (`manufacturing`)

Visual quality, predictive maintenance, process optimisation, planning and shop-floor agents for plants where downtime, scrap and safety dominate the economics.

- Quality & inspection (use cases 1-7): Seeing defects early, with the process cause behind them.
- Predictive maintenance & reliability (use cases 8-14): Predicting failures, triaging work and explaining downtime.
- Process & yield optimisation (use cases 15-21): Setpoints, soft sensors and yield excursions on continuous and batch lines.
- Planning, scheduling & supply (use cases 22-28): Scheduling, forecasting and supply disruption in the plant.
- Robotics, safety & autonomous cells (use cases 29-34): Vision-guided robots, worker safety and fleet traffic.
- Energy, emissions & sustainability (use cases 35-40): Plant energy, leaks, carbon footprint and reporting.
- Engineering knowledge & agents (use cases 41-46): Work instructions, engineering change and shop-floor analytics agents.
- Product, warranty & service (use cases 47-50): Field failures, warranty and connected-product service.

## Energy & Utilities (`energy`)

Outage and fault prediction, load and renewable forecasting, asset health, smart metering, storage dispatch and field-crew agents for electricity, gas and water utilities.

- Grid operations & reliability (use cases 1-7): Predicting outages, locating faults and advising operators.
- Forecasting & markets (use cases 8-14): Load, renewable and price forecasts with honest uncertainty.
- Asset health & inspection (use cases 15-21): Finding failing transformers, lines and turbines before they fail.
- Customer & retail energy (use cases 22-28): Billing, demand response and support with fair treatment of customers.
- Metering & network losses (use cases 29-34): Smart meter data, losses and leak detection in energy and water networks.
- Renewables, storage & EV (use cases 35-40): Batteries, charging, solar and virtual power plants.
- Field, vegetation & wildfire (use cases 41-45): Crews, imagery and wildfire risk for safer networks.
- Regulation & agent governance (use cases 46-50): Filings, interconnection, grid cyber and guardrails for agents.

## Public Sector & Smart Cities (`public-sector`)

Citizen service agents, benefits and tax decision support, traffic and transit, city infrastructure, permits and policy analytics, built around explainable decisions, human caseworkers and public accountability.

- Citizen services (use cases 1-7): Answering, routing and simplifying public services.
- Benefits, tax & licensing (use cases 8-14): Decision support for caseworkers with explained reasons.
- Urban mobility (use cases 15-21): Traffic, transit and parking from aggregated data.
- Infrastructure & environment (use cases 22-27): Flood, air quality, waste and city assets.
- Planning & permits (use cases 28-33): Faster, more consistent permits and land use monitoring.
- Social & public health services (use cases 34-39): Aggregate demand and support for caseworkers.
- Policy & public data (use cases 40-45): Simulation, open data, records and budgets.
- Accountability & agent governance (use cases 46-50): Explanation, fairness audits and guardrails for public sector agents.

## Public Safety & Security (`public-safety`)

Emergency call and dispatch support, fire and disaster response, road safety, physical security analytics, courts administration and oversight controls, designed with no individual risk scoring and no face identification.

- Emergency calls & dispatch (use cases 1-7): Supporting call takers and dispatchers without taking the decision.
- Fire & disaster response (use cases 8-13): Early detection, evacuation planning and situation awareness.
- Investigations & evidence support (use cases 14-20): Document and evidence handling with no person scoring.
- Road safety (use cases 21-26): Network-level crash analysis and hazard alerting.
- Physical security operations (use cases 27-32): Anonymised video analytics and security operations.
- Courts & justice administration (use cases 33-38): Scheduling, documents and access to justice.
- Scams, online harm & victim support (use cases 39-44): Triage and demand planning that routes people to help.
- Oversight & agent governance (use cases 45-50): Impact assessments, bias audits, misuse detection and guardrails.

## Software Engineering & DevTools (`devtools`)

Coding assistants and agents, code review, test automation, CI/CD reliability, application security and platform tooling, with sandboxed agents, human merge approval and no individual developer scoring.

- Coding assistance (use cases 1-7): Completion, explanation, migration and documentation with repository context.
- Code review & quality (use cases 8-14): Review aid, risk signals and debt prioritisation that keep humans deciding.
- Testing & verification (use cases 15-21): Generating, selecting and triaging tests.
- CI/CD & release (use cases 22-27): Faster, safer pipelines and rollouts.
- Application security & supply chain (use cases 28-33): Vulnerabilities, secrets and dependency risk.
- Issues & team productivity (use cases 34-39): Triage and flow metrics at team level.
- Platform & internal tools (use cases 40-45): Developer portals, data access and compliance scanning.
- Coding agent governance (use cases 46-50): Sandboxes, provenance, injection defence, evaluation and guardrails.

## IT Operations & Infrastructure (`it-ops`)

Incident and alert intelligence, service desk agents, capacity and cloud cost, change and configuration, security operations and network health, with human-approved remediation and no individual employee scoring.

- Incidents & observability (use cases 1-7): Alert correlation, anomaly detection and diagnosis that cut noise and time to restore.
- Service desk (use cases 8-14): Helpdesk agents, routing and fulfilment with human escalation.
- Capacity & FinOps (use cases 15-21): Forecasting, rightsizing and cost control for cloud and data centre estates.
- Change & configuration (use cases 22-27): Safer changes, patching and an accurate CMDB.
- Security operations (use cases 28-34): Alert triage, phishing, endpoint and access analytics with human response.
- Network & infrastructure (use cases 35-40): Network health, hardware failure and facility efficiency.
- End-user computing (use cases 41-45): Device health, licences and application portfolio at group level.
- AIOps governance (use cases 46-50): Approval-gated remediation, evaluation and guardrails for IT agents.

## Engineering, Design & Projects (`engineering`)

Design exploration and simulation, drawing and BIM intelligence, construction scheduling and cost, site safety and inspection, estimating and contracts and project portfolio management, with licensed engineers signing off and no individual worker scoring.

- Design & simulation (use cases 1-7): Design exploration, surrogate models and engineering knowledge with verified outputs.
- Drawings & BIM (use cases 8-14): Digitisation, clash, quantity and compliance checks across drawings and models.
- Construction delivery (use cases 15-21): Schedule, cost, progress and supply chain risk on live projects.
- Site safety & quality (use cases 22-27): Hazard and defect detection at scene level with no individual worker scoring.
- Asset & structural integrity (use cases 28-33): Structural monitoring, inspection and remaining life estimation.
- Estimating & contracts (use cases 34-39): Cost estimates, bids, clauses and claims with commercial approval.
- Project & portfolio management (use cases 40-45): Status, risk, capacity and lessons learned across the portfolio.
- Engineering AI governance (use cases 46-50): Sign-off, validation and guardrails for AI-assisted engineering work.

