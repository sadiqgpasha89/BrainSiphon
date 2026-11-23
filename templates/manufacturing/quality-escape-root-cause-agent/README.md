# Quality Escape Root-Cause Agent

**BrainSiphon worked template** · Manufacturing & Industry 4.0 · latency tier seconds · staff-principal

When a defect reaches a customer or a late test, trace the affected lots through genealogy, line data and supplier records, rank likely causes and draft the containment and corrective actio…

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `manufacturing/quality-escape-root-cause-agent`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

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
| Injection success, naive | 100.0% |
| Injection success, guarded | 0.0% |
| Unsafe actions, naive versus guarded | 8 vs 0 |
| Accuracy on auto-decided cases, guarded | 100.0% |
| Escalation rate, guarded | 4.0% |

## Fit

Adaptable: the `llm-agent` engine implements a neighbouring problem; see FIT.md. Engine: **Tool-using agent with guardrails and a verifier**. A runnable reference for an agent that gathers evidence with typed, read-only tools, cannot be steered by instructions planted in data, needs approval for write actions, verifies its claims against the cited evidence and escalates when evidence is missing.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Genealogy coverage | lots linked to the suspect part, material or tool |
| Process excursion overlap | alarms and excursions on the affected lots |
| Supplier lot association | incoming material lots shared by affected parts |
| Past similar escapes | earlier cases with confirmed causes |

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
