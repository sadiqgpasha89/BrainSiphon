"""First-time load for a fresh environment (compose / Kubernetes): seed the simulated ERP, ingest, train, promote, forecast.
With a real source system, skip the seed: point SOURCE_DATABASE_URL at it and run the worker, the training and the batch job."""

import json

from bsref import db
from data import source_system, worker
from serving import batch
from training import train

db.init_schema()
print(json.dumps({"seed": source_system.seed(), "ingest": worker.run_once(), "train": train.run(), "run": batch.run("bootstrap")},
                 indent=2, default=str))
