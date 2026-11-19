# Supply-Chain Event Monitoring with LLM Agents: data and feature specification

> Generated from the blueprint `supply-chain/supply-chain-news-event-monitoring-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Chain Event Monitoring with LLM Agents · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Supply-Chain Event Monitoring with LLM Agents": Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Evaluation set built from major events only.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Network impact score | exposure of company flows to event location | Prioritisation | Graph join |   |   |   |
| Source corroboration count | independent sources reporting | Credibility | Dedup |   |   |   |
| Event severity classification | severity class | Triage | Taxonomy |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Relevance | Map events to the company's network graph | Generic news summaries | Planners need impact on their lanes and suppliers |
| Verification | Corroboration across independent sources | Single-source alerts | Rumours trigger costly actions |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Article sentiment | not impact |
| Social media volume | rumour amplification |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Network impact score inputs | Supply-chain planning | ERP (orders, inventory, finance) | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: graph join. |
| Source corroboration count inputs | Logistics IT | Warehouse and transport management systems (WMS, TMS) | API lookup with a cached snapshot and a stale-with-flag fallback | Point-in-time rule: dedup. |
| Event severity classification inputs | Master data team | Supplier and EDI network | CDC or event stream (Kafka) with 60 seconds freshness at p95 | Point-in-time rule: taxonomy. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: supply_chain_news_event_monitoring_llm_inputs.v1
owner: supply-chain-planning@example.com
system_of_record: ERP (orders, inventory, finance)
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: network_impact_score, type: double, nullable: false }
    - { name: source_corroboration_count, type: double, nullable: false }
    - { name: event_severity_classification, type: double, nullable: false }
sla:
  freshness_p95: 60 seconds
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Network impact score and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Source corroboration count against ERP (orders, inventory, finance)
- **Dimension:** Freshness<br>**Target:** p95 event-to-feature delay 60 seconds<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Network impact score, traces back to ERP (orders, inventory, finance); the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Backward-transitive compatibility in the schema registry blocks breaking changes at the producer; undecodable records go to a dead-letter topic and replay through a bounded job once fixed.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| Splunk Boss of the SOC v3 (BOTS) | https://github.com/splunk/botsv3 | Splunk dataset terms (see the repository) | A realistic corpus of security logs from a simulated attack with a question set that gives ground truth | One scenario, Splunk format. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| OTRF Security-Datasets (Mordor) | https://github.com/OTRF/Security-Datasets | MIT-style open licence (see the repository) | Pre-recorded telemetry for individual attack techniques mapped to MITRE ATT&CK | Lab-generated, little benign background. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE supply_chain_news_event_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE supply_chain_news_event_steps (
  task_id TEXT NOT NULL REFERENCES supply_chain_news_event_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE supply_chain_news_event_approvals (
  task_id TEXT NOT NULL REFERENCES supply_chain_news_event_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Companies forecast demand to decide how much to make, hold and ship. Long-range planning looks months ahead on statistical models; demand sensing looks 1 to 14 days ahead and tries to react to what is happening this week: sales at the till, orders in the pipeline, promotions and weather. Planners own the numbers and the decisions that follow, so the forecast has to be trusted, add up to the plan and say how sure it is. For this use case, "Supply-Chain Event Monitoring with LLM Agents": Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Logistics networks: nodes, lanes and the physical flow | Goods move through suppliers, factories, ports, distribution centres, cross-docks and last-mile hubs. Each link has a lead time, a capacity and a cost, and disruptions (weather, strikes, congestion) propagate. Visibility data come from scans, telematics and partner feeds with delays and gaps. | Models sit on top of a physical network with hard constraints; plans must be feasible, not just predicted well. |
| Planner overrides and forecast value added | Experienced planners change statistical forecasts when they know about deals, disruptions or launches. Forecast value added (FVA) measures whether each step, including the model and the human override, improved on a naive baseline. | Adoption depends on respecting overrides, recording them and showing, with data, when they help and when they hurt. |
| Agents, tools and permissions | An agent plans, calls tools and observes results. Safety comes from structure around the model: typed tools with narrow permissions, an allow-list, approval for any action that changes something, step and cost budgets, and an audit log. | Assume the model can be fooled; make the worst thing it can do harmless by design. |
| Text classification and extraction in practice | Classification assigns labels to documents; extraction finds spans (names, amounts, codes) and fills fields. Labels are expensive and noisy, classes overlap, and text changes with vocabulary, products and seasons. | Hold out by conversation or document family and by time, and monitor vocabulary drift, or offline scores will not survive deployment. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Network impact score | Exposure of company flows to event location. Prioritisation. | Leakage risk to design against: Graph join. |
| A signal-versus-noise trap in this use case: Relevance | The true signal is map events to the company's network graph; the common noise is generic news summaries. | Planners need impact on their lanes and suppliers. |

**Ask the experts**

- [ ] What exactly does "Source attribution" mean in practice for supply-chain event monitoring with llm agents: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Network impact score" and "Source corroboration count", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Time from event to action" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: evaluation set built from major events only, and who can confirm the cut-off times and splits?
- [ ] How often does "Duplicate reports of one event" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| DC (distribution centre) | A warehouse that receives goods from suppliers and ships to stores or customers. |
| Dwell time | How long a container, truck or parcel waits at a location. |
| Container yard | The area of a port or terminal where containers are stacked and moved. |
| Rehandle | An extra move of a container or pallet needed to reach the one underneath. |
| HS code | Harmonised System code that classifies traded goods for customs duties and rules. |
| Multi-echelon inventory | Inventory held at several levels of a network, such as factory, regional DC and store. |
| Lead-time variability | How much the time to receive goods varies, which drives safety stock. |
| Digital twin | A simulation of a real system calibrated to its data, used to test decisions. |
| Approval gate | A required human sign-off before an agent performs a consequential action. |
| Tool calling | A model's ability to request that an external function be run with chosen arguments. |
| Planner / executor | An agent design in which one component decides the next step and another runs it. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Sentiment analysis | Classifying the attitude expressed in text, such as positive, neutral or negative. |
| Named-entity recognition (NER) | Finding and labelling names of people, organisations, places and other entities in text. |
| Near-duplicate | A text that is almost identical to another, such as a forwarded email, which leaks across random splits. |
| Tokenisation | Splitting text into the units a model processes: words, sub-words or characters. |
| Distribution shift | A change in the data a model sees compared with training. |
| Concept drift | A change in the relationship between inputs and the outcome over time. |
| Threshold / operating point | The score cut-off at which the system acts, chosen from the cost of errors and capacity. |
