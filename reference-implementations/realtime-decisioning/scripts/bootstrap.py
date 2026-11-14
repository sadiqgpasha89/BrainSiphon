"""First-time load for a fresh environment (compose / Kubernetes): seed the simulated source, ingest, train, promote.
With a real source system, skip the seed: point SOURCE_DATABASE_URL at it and run `python -m data.worker` then `python -m training.train`."""

import json

from bsref import db
from data import source_system, worker
from training import train

db.init_schema()
print(json.dumps({"seed": source_system.seed(), "ingest": worker.run_once(), "train": train.run()}, indent=2, default=str))
