# models/

`models/registry/` is created at run time (git-ignored). Layout: `<model>/<version>/{model.joblib, manifest.json, requirements.txt}`
and `<model>/index.json` with the production pointer and the promotion history. See `src/bsref/registry.py`.

Useful commands:

```bash
cat models/registry/fraud-scorer/index.json                 # which version is production, and who promoted it
cat models/registry/fraud-scorer/v0001/manifest.json        # metrics, thresholds, lineage, checksum
```

## Model card (fill in for your deployment)

| Item | This reference implementation |
|---|---|
| Intended use | Rank authorisation requests by fraud risk and apply ALLOW / STEP_UP / BLOCK thresholds |
| Not intended for | Credit decisions, customer profiling, any use without the human review of blocks |
| Training data | Synthetic transactions from `data/source_system.py`; labels from chargebacks and analyst verdicts |
| Label definition | Fraud = chargeback filed or analyst-confirmed; genuine = no fraud label 14 days after the transaction |
| Evaluation | Chronological hold-out (last 10 matured days); PR-AUC, recall at the block threshold, false-decline rate |
| Known limitations | About 10% of fraud is never reported (label noise); synthetic data is easier than production |
| Fairness and privacy | No personal attributes are used as features; assess proxies (country, device) for your population |
| Human oversight | Every BLOCK is reviewed by an analyst within the SLA; analysts can overturn it |
