# Automated Red-Team Attack Simulation: data and feature specification

> Generated from the blueprint `cybersecurity/red-team-attack-simulation-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Red-Team Attack Simulation · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Automated Red-Team Attack Simulation": Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Rewarding unrealistic exploits.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Technique success probability | success per technique and control | Reward | Environment |   |   |   |
| Detection events triggered | alerts raised per step | Coverage | SIEM feedback |   |   |   |
| Path cost | steps to target | Efficiency | Graph |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Realism | Environment built from real topology and controls | Toy network simulators | Findings in toys don't transfer |
| Purpose | Measure detection gaps | Count compromised hosts | The value is in what defenders missed |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Host display name | none |
| Episode seed | none |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Technique success probability inputs | Detection engineering | SIEM and security data lake | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: environment. |
| Detection events triggered inputs | Security data platform | Asset inventory (CMDB) and identity directory | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: SIEM feedback. |
| Path cost inputs | Identity and access team | Case and ticketing system (SOAR) | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: graph. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: red_team_attack_simulation_rl_inputs.v1
owner: detection-engineering@example.com
system_of_record: SIEM and security data lake
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: technique_success_probability, type: double, nullable: false }
    - { name: detection_events_triggered, type: double, nullable: false }
    - { name: path_cost, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Technique success probability and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Detection events triggered against SIEM and security data lake
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Technique success probability, traces back to SIEM and security data lake; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| IBM AMLSim (anti-money-laundering simulator) | https://github.com/IBM/AMLSim | Apache 2.0 (see the repository) | A simulator that generates transaction networks with injected laundering patterns | Synthetic; patterns reflect the simulator's assumptions. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| MIPLIB 2017 | https://miplib.zib.de/ | Per-instance terms (see the site) | A library of mixed-integer programming instances for testing optimisers | Hard to relate to a specific business problem. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| Azure Public Dataset | https://github.com/Azure/AzurePublicDataset | CC BY 4.0 (see the repository) | Anonymised VM, workload and resource utilisation traces from Azure | One cloud and period. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
CREATE TABLE red_team_attack_simulation_rl_problem_snapshots (
  snapshot_id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, demand_forecast_ref TEXT NOT NULL,
  constraints_version TEXT NOT NULL, inputs_uri TEXT NOT NULL, inputs_sha256 TEXT NOT NULL
);

CREATE TABLE red_team_attack_simulation_rl_plans (
  plan_id TEXT PRIMARY KEY, snapshot_id UUID NOT NULL REFERENCES red_team_attack_simulation_rl_problem_snapshots, status TEXT NOT NULL,
  objective_value DOUBLE PRECISION, gap_pct REAL, solver_version TEXT NOT NULL, solve_seconds REAL, published_at TIMESTAMPTZ
);

CREATE TABLE red_team_attack_simulation_rl_assignments (
  plan_id TEXT NOT NULL REFERENCES red_team_attack_simulation_rl_plans, resource_id TEXT NOT NULL, task_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, cost DOUBLE PRECISION,
  PRIMARY KEY (plan_id, resource_id, task_id)
);

-- what the executed world looked like: the gap between plan and actual drives re-planning
CREATE TABLE red_team_attack_simulation_rl_executions (
  plan_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ, deviation_reason TEXT,
  PRIMARY KEY (plan_id, task_id)
);
```

## Domain knowledge to learn first

A security operations centre (SOC) receives thousands of alerts a day from detection tools, and analysts decide which are real attacks, which are harmless and which need action. An investigation agent helps by gathering evidence and proposing a verdict. Because the agent reads logs that attackers can influence and may be allowed to act on systems, the domain knowledge that matters most is how analysts judge evidence, what the tools can and cannot prove, and which actions must never happen without a human. For this use case, "Automated Red-Team Attack Simulation": Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Vulnerability and risk management | Organisations track thousands of software vulnerabilities (CVEs), score their severity, and decide what to patch first. Few are ever exploited; exploit likelihood, asset criticality, exposure and compensating controls decide priority. Attack-path analysis shows how weaknesses chain together. | Prioritising by severity alone creates unmanageable lists; prioritising by exploit evidence and asset value cuts work and risk. |
| Securing AI systems themselves | Machine-learning models can be attacked: adversarial inputs, data poisoning, model extraction, prompt injection and over-permissioned agents. Defences include robustness training, rate limits and monitoring, input and output filters, and strict tool permissions. | Any model that reads untrusted input or can take actions needs its own threat model and tests. |
| What an alert verdict means | A true positive is a real malicious event, a false positive is a mistaken detection and a benign true positive is a correct detection of authorised activity, such as a pentest or an administrator's script. Closing an alert as benign without evidence is the most dangerous mistake, because an active attack then goes unnoticed. | Define verdicts with the SOC. Ground truth for evaluation must come from analyst conclusions backed by cited log lines, not satisfaction scores. |
| Decisions, policies and rewards | A policy chooses an action in each situation to maximise long-run reward (revenue, learning gain, safety). The reward is a modelling choice: optimising a proxy (clicks, time spent) can damage the real goal, and delayed rewards make credit assignment hard. | Write the reward with the business owner, include costs and constraints, and track the metrics the reward does not capture. |
| Graphs: nodes, edges and what they mean | A graph represents entities (accounts, devices, people, products) as nodes and relationships (transfers, shared devices, co-purchases) as edges. Structure carries signal that no single record shows: rings, hubs, bridges and communities. | Define edges carefully: an edge from a shared public Wi-Fi address means much less than one from a shared phone number. |
| Offline evaluation versus the real world | Offline metrics are computed on historical data; the business cares about outcomes after deployment. The two differ because of leakage, selection bias, delayed labels, distribution shift and feedback loops, which is why launches go through shadow mode and controlled experiments. | Treat every offline number as an estimate with a known direction of bias, and plan the online test before you trust it. |
| This use case's strongest signal: Technique success probability | Success per technique and control. Reward. | Leakage risk to design against: Environment. |
| A signal-versus-noise trap in this use case: Realism | The true signal is environment built from real topology and controls; the common noise is toy network simulators. | Findings in toys don't transfer. |

**Ask the experts**

- [ ] What exactly does "Safe, isolated or production-safe techniques" mean in practice for automated red-team attack simulation: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Technique success probability" and "Detection events triggered", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Detection gaps closed" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: rewarding unrealistic exploits, and who can confirm the cut-off times and splits?
- [ ] How often does "Emulated action causes real outage" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Attack path | A chain of weaknesses and permissions that lets an attacker move from an entry point to a valuable asset. |
| Kill chain | A model of attack stages from reconnaissance to action on objectives. |
| Crown jewels | The assets whose loss would most harm the organisation. |
| NIDS / IDS | Network intrusion detection system: monitors traffic for attacks and policy violations. |
| Alert fatigue | Analysts ignoring alerts because too many are false or low value. |
| Simulation / digital twin | A model of the environment used to test policies safely before deployment. |
| Policy | The rule that maps a situation to an action. |
| Reward | The number the system tries to maximise over time. |
| Markov decision process | A mathematical model of sequential decisions with states, actions, rewards and transitions. |
| Node / edge | The entities in a graph and the relationships between them. |
| Degree | The number of edges attached to a node; very high degree marks a hub. |
| Connected component | A set of nodes in which each can reach every other through edges. |
| Personalised PageRank | PageRank that restarts from chosen seed nodes, used to spread risk from known bad nodes. |
| Holdout / control group | A group deliberately not treated, used to measure the true effect of a system. |
| Calibration | Predicted probabilities matching observed frequencies, so a score of 30% means about 30%. |
| Expected calibration error (ECE) | The average gap between predicted probability and observed frequency across probability bins. |
