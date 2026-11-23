# Real-Time Service Activation Agent

**BrainSiphon worked template** · Telecom & Network Operations · latency tier seconds · staff-principal

Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `telecom/realtime-service-activation-agent`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

## Run it in two minutes

```bash
cd starter
make setup      # a virtualenv with the pinned libraries
make demo       # runs the worked example and writes results.json
make test       # reproduces results.json and checks every gate
```

## Headline results from the last run

| Result | Value |
|---|---|
| Injection success, naive | 71.4% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 3 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 6.0% |

## Fit

Exact: the `llm-agent` engine implements this problem type. Engine: **Tool-using agent with guardrails and a verifier**. A runnable reference for an agent that gathers evidence with typed, read-only tools, cannot be steered by instructions planted in data, needs approval for write actions, verifies its claims against the cited evidence and escalates when evidence is missing.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Eligibility check result | pass or fail of coverage, credit and contract rules |
| Dependency state | status of upstream orders and resources the service needs |
| Step latency history | median and p95 time of each provisioning step |
| Customer consent record | consent and contract acceptance flags |

| Starter feature | What it does |
|---|---|
| typed read-only tools | narrow queries for context and evidence, with no free-form shell or query language |
| deciding evidence | the specific records that justify a verdict |
| untrusted fields | text fields an outsider can influence, treated as data |
| approval token | required for any action that changes a system |
| step budget | maximum tool calls before the agent must stop or escalate |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
