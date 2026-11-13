"""First-time load for a fresh environment (compose / Kubernetes): seed the simulated security stack, evaluate and promote the
agent, ingest and investigate. With real systems, skip the seed and import your own closed incidents as the labelled suite."""

import json

from bsref import db
from data import source_system, worker
from training import train

db.init_schema()
out = {"seed": source_system.seed(), "evaluate": train.run(), "worker": worker.run_once()}
print(json.dumps(out, indent=2, default=str))
