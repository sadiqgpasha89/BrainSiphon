"""First-time load for a fresh environment (compose / Kubernetes): seed the simulated CMS, ingest, build and promote the index.
With a real source, skip the seed: point SOURCE_DATABASE_URL at it and run the worker, then `python -m training.train`."""

import json

from bsref import db
from data import source_system, worker
from training import train

db.init_schema()
out = {"seed": source_system.seed(), "ingest": worker.run_once(), "index": train.run()}
out["index"].pop("failures", None)
print(json.dumps(out, indent=2, default=str))
