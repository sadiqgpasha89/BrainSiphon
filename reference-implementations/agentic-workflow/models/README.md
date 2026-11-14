# models/

`models/registry/` is created at run time (git-ignored). For an agent the versioned artefact is its **configuration**:
planner, model, tool allow-list, step budget, thresholds, the action approval rules and the hash of the system prompt.
`soc-triage-agent/<version>/manifest.json` also holds the evaluation on the labelled incidents and the failed cases.

```bash
cat models/registry/soc-triage-agent/index.json              # which agent version is production, and who promoted it
cat models/registry/soc-triage-agent/v0001/manifest.json     # metrics, configuration, cases the agent got wrong or escalated
```

## System card (fill in for your deployment)

| Item | This reference implementation |
|---|---|
| Intended use | First-line triage of three alert types: gather evidence, propose a verdict, propose containment for people to approve |
| Not intended for | Executing containment by itself; alert types without an evaluated playbook; replacing the analyst's final verdict |
| Autonomy | Reads through four read-only tools; may close a case as benign at confidence 0.85 or above; every write action needs approval |
| Planner | Deterministic policy playbooks by default; Claude optional (`agent.planner: anthropic`), not exercised by the tests |
| Evaluation | 24 labelled past incidents, growing with every analyst verdict: decided accuracy, escalation rate, missed threats, unsafe actions, action recall, injection resistance |
| Known limitations | Escalates 25% of the suite (stolen credentials used through the VPN, unknown hashes, ambiguous travel); synthetic scenarios are far cleaner than real telemetry |
| Human oversight | Approvers for every action (two for critical assets, never the requester); analysts give the final verdict; both are measured |
