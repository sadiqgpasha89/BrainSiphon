# Engineering Agent Evaluation Harness: data and feature specification

> Generated from the blueprint `engineering/engineering-agent-evaluation-harness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Agent Evaluation Harness · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

The contract between the data owner and the modelling team: what is a feature, what is the label, what time each is known, and what must never be used.

## Label definition

For "Engineering Agent Evaluation Harness": Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Model-written answers as truth.

## Feature specification

| Feature | Definition | Why it carries signal | As-of rule and leakage risk | Source table | Owner | Available at decision time? (y/n) |
|---|---|---|---|---|---|---|
| Answer correctness | match to expert answer | Core | From the harness |   |   |   |
| Calculation verification | tool recomputation result | Core | From calculators |   |   |   |
| Citation accuracy | clause and edition correctness | Quality | From the standards library |   |   |   |
| Safety violations | policy breaches in runs | Safety | From gateway logs |   |   |   |

## Signal versus noise

| Concept | True signal | Common noise | Why engineers fail here |
|---|---|---|---|
| Truth | Expert answers and verified calculations | Model-written answers | The model may grade itself wrongly |
| Metrics | Correctness, citation, safety and cost | Fluency | Fluent answers can be wrong |
| Coverage | Real hard tasks | Textbook questions | Real work is messier |

## Features to drop

| Feature | Why it is noise |
|---|---|
| Task author | irrelevant |
| Run id | an identifier |
| Model name alone | needs outcome data |

## Data sources

| Source | Owner | System Of Record | Ingestion | Quality |
|---|---|---|---|---|
| Answer correctness inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the harness. |
| Calculation verification inputs | Project delivery | Project scheduling and cost control platform | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from calculators. |
| Citation accuracy inputs | Health, safety and quality | Quality, safety and inspection records | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from the standards library. |
| Safety violations inputs | Engineering management | CAD, BIM and document management system | Daily partition (CDC snapshot or file drop) with a manifest and row counts | Point-in-time rule: from gateway logs. |

## Data contract

The contract below is a starting point; the owner edits and versions it.

```yaml
contract: engineering_agent_evaluation_harness_inputs.v1
owner: engineering-management@example.com
system_of_record: CAD, BIM and document management system
schema:
  registry_compatibility: BACKWARD_TRANSITIVE
  fields:
    - { name: event_id, type: string, unique: true }
    - { name: event_time, type: timestamp, required: true, tz: UTC }
    - { name: answer_correctness, type: double, nullable: false }
    - { name: calculation_verification, type: double, nullable: false }
    - { name: citation_accuracy, type: double, nullable: false }
sla:
  freshness_p95: available_before_run
  completeness: ">=99.5%"
  duplicates: "<0.01%"
on_breach: { notify: owner, action: quarantine_and_serve_stale, escalate_after: 30m }
```

## Quality SLAs

- **Dimension:** Completeness<br>**Target:** 99.5% of required fields populated<br>**Check:** Null-rate assertion on Answer correctness and the event key, evaluated per partition
- **Dimension:** Accuracy<br>**Target:** Values sampled and reconciled weekly<br>**Check:** Reconcile aggregates for Calculation verification against CAD, BIM and document management system
- **Dimension:** Freshness<br>**Target:** Inputs landed before the run window opens<br>**Check:** Measured at the consumer (not the producer) and alerted against the contract
- **Dimension:** Uniqueness<br>**Target:** Duplicate event_id rate below 0.01%<br>**Check:** Idempotent consumers plus a duplicate-rate assertion
- **Dimension:** Validity<br>**Target:** Zero schema violations reach the model plane<br>**Check:** Registry compatibility check in CI; violating rows go to a quarantine table with a reason
- **Dimension:** Point-in-time correctness<br>**Target:** Every training feature is reproducible from data known at decision time<br>**Check:** Replay the logged feature vector for a sample and compare with the offline join

## Lineage, schema change, corrections, privacy

- **Lineage:** Capture source-to-target and column-level lineage (OpenLineage events from every job) so that any served feature, such as Answer correctness, traces back to CAD, BIM and document management system; the decision ledger links each decision to the feature-vector hash and dataset snapshot.
- **On schema change:** Producers publish a new contract version; consumers run the compatibility check in CI and the data-quality gate before each run. A breaking change gets a migration window, never a silent flip.
- **Corrections and backfills:** Late corrections and backfills write to a versioned namespace at a capped share of store IOPS; a pointer flips only after count and distribution checks pass, and the decision ledger is never rewritten.
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.

## Public datasets to prototype on

| Dataset | URL | Licence | What it gives | Caveat |
|---|---|---|---|---|
| SWE-bench | https://www.swebench.com/ | MIT licence (see the repository) | Real GitHub issues with the pull requests that fixed them and runnable tests | Python repositories only. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| HumanEval | https://github.com/openai/human-eval | MIT licence (see the repository) | 164 hand-written programming problems with unit tests for evaluating code generation | Small and widely contaminated; use for harness checks. Matched by domain and task type, not made for this exact use case: check the fit before committing. |
| PubMedQA | https://pubmedqa.github.io/ | MIT licence (see the repository) | Biomedical research questions with abstracts and yes/no/maybe answers | Research abstracts, not clinical notes. Matched by domain and task type, not made for this exact use case: check the fit before committing. |

## Reference data model (illustrative)

```sql
-- a task is a state machine; every transition is stored so a run can be resumed, replayed and audited
CREATE TABLE engineering_agent_evaluation_tasks (
  task_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, goal TEXT NOT NULL, state TEXT NOT NULL,   -- PLANNING | ACTING | AWAITING_APPROVAL | DONE | ESCALATED | FAILED
  autonomy_level TEXT NOT NULL, step_budget SMALLINT NOT NULL, cost_budget_usd NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE engineering_agent_evaluation_steps (
  task_id TEXT NOT NULL REFERENCES engineering_agent_evaluation_tasks, step_no SMALLINT NOT NULL, agent TEXT NOT NULL, tool TEXT, args_hash TEXT,
  result_ref TEXT, status TEXT NOT NULL, tokens_in INT, tokens_out INT, started_at TIMESTAMPTZ NOT NULL, checkpoint JSONB,
  PRIMARY KEY (task_id, step_no)
);

CREATE TABLE engineering_agent_evaluation_approvals (
  task_id TEXT NOT NULL REFERENCES engineering_agent_evaluation_tasks, step_no SMALLINT NOT NULL, proposed_action JSONB NOT NULL,
  approver_id TEXT, decision TEXT, reason TEXT, decided_at TIMESTAMPTZ,
  PRIMARY KEY (task_id, step_no)
);
```

## Domain knowledge to learn first

Engineering and construction deliver one-off projects with long lead times, many parties and high consequences of error. Data lives in drawings, models, schedules and site records of uneven quality, and licensed engineers carry professional liability, so tools assist and verify and people sign. For this use case, "Engineering Agent Evaluation Harness": Evaluate engineering assistants and agents on real past questions, reviews and calculations with expert answers, safety checks and cost so changes are judged on evidence before rollout. The terms and ideas below are the ones to learn before you talk to the people who own the data and the decision.

**Concepts**

| Concept | Explanation | Why it matters here |
|---|---|---|
| Professional engineers are accountable for the design | Codes and law require a licensed engineer to design, check and seal critical work. Software supports calculations and checks, and responsibility cannot be handed to a tool. | Any AI output used in design needs independent verification and a named signer. |
| Drawings and models carry the design information | Information sits in CAD drawings, PDFs and BIM models, often in different revisions and disciplines. Reading it reliably is a prerequisite for most automation. | Using the wrong revision is a common and costly error. |
| Clashes between disciplines are common | Structure, services and architecture are modelled by different teams, and their elements collide. Not every clash needs action, and the important ones sit among thousands of minor ones. | Prioritising by impact and construction timing makes coordination meetings useful. |
| Evaluating language-model systems | Evaluation uses a held-out golden set that includes adversarial, unanswerable and edge cases, automatic checks (does the code run, does the number match the source), calibrated model judges and human review. Prompts and models change often, so evaluation runs as regression tests. | Cases used to tune prompts cannot be used to report quality; keep a frozen test set and add every production failure to the tuning set. |
| Imbalanced classification and the metrics that survive it | When positives are 1% or fewer, accuracy and ROC-AUC mislead. Precision, recall, PR-AUC and recall at a fixed false-positive rate describe the operating region that matters, and class weighting or resampling changes calibration, so probabilities must be recalibrated. | A model that never flags anything looks 99% accurate; the business metric is cost at a capacity limit. |
| Baselines, ablations and the cost of complexity | A simple model sets the cost floor and explains itself; a complex model has to beat it by more than its noise, serving cost and maintenance burden. Report gains with intervals, over several seeds and on the metric the business uses. | A model that wins by a tenth of a point on a leaderboard metric and doubles latency is usually a loss. |
| This use case's strongest signal: Answer correctness | Match to expert answer. Core. | Leakage risk to design against: From the harness. |
| A signal-versus-noise trap in this use case: Truth | The true signal is expert answers and verified calculations; the common noise is model-written answers. | The model may grade itself wrongly. |

**Ask the experts**

- [ ] What exactly does "Tasks built from real past work with expert-approved answers" mean in practice for engineering agent evaluation harness: who owns the requirement, how is it measured and what happens when it is missed?
- [ ] Which systems feed "Answer correctness" and "Calculation verification", how fresh is each at decision time and who owns them?
- [ ] How is the outcome behind "Project regressions caught before rollout" measured, how long after the decision is it known, and which cases never receive a label?
- [ ] Which of our data or evaluation habits could cause this: model-written answers as truth, and who can confirm the cut-off times and splits?
- [ ] How often does "Stale standards" happen here, and who handles it today?

**Glossary**

| Term | Definition |
|---|---|
| Change order | A formal change to scope, cost or time. |
| Health and safety plan | A plan for managing risk on a project. |
| Engineer of record | The licensed engineer responsible for a design. |
| BIM | Building information modelling: a digital model of a building or asset with data. |
| IFC | An open file format for exchanging BIM data. |
| Specification | A written description of required materials and workmanship. |
| Variation | A change to the work required by the client. |
| Earned value | A method that compares work done with plan and cost. |
| Contingency | An allowance for uncertain costs. |
| Estimate | A prediction of project cost. |
| Guardrail | A check on a model's input or output, or a limit on its actions, that enforces a policy. |
| Step budget | A cap on how many tool calls or reasoning steps an agent may take. |
| Golden set | A fixed set of questions with verified answers used to score versions of a system. |
| LLM-as-judge | Using a language model to grade outputs, which must itself be calibrated against humans. |
| Precision / recall | The share of flagged cases that are real, and the share of real cases that are flagged. |
| Focal loss | A loss that down-weights easy examples so rare, hard positives matter more. |
| Class weighting | Giving rare positives more weight in the loss, which shifts predicted probabilities upward. |
| Quantile regression | Predicting a chosen percentile of the outcome rather than the average. |
| Bootstrap confidence interval | An uncertainty range for a metric obtained by resampling the evaluation data. |
| Data leakage | Information in the training data that would not be available at prediction time, making offline results unrealistically good. |
| Cost matrix | The money value of each kind of decision error, used to choose thresholds. |
| Prompt injection | Instructions hidden in input data that try to take control of the model. |
