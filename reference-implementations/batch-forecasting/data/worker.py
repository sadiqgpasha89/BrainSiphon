"""The data-plane worker: CDC relay, then the ingestion consumer (run nightly after the ERP closes the day).

    python -m data.worker            run once (drain everything pending) and print what happened
    python -m data.worker --loop     keep running (compose / Kubernetes), polling every WORKER_POLL_SECONDS
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time

from bsref import bus, cdc, db
from bsref.observability import configure_logging
from data import ingest

log = logging.getLogger("worker")


def run_once() -> dict:
    db.init_schema()
    relayed = cdc.relay(ingest.TOPIC_FOR)
    ing = ingest.Ingestor()
    consumed = bus.consume(ingest.TOPIC, ingest.GROUP, ing.handle, batch=2000, flush=ing.flush, reset=ing.reset)
    return {"cdc": relayed, "consumer": consumed, "ingest": ing.stats}


if __name__ == "__main__":
    configure_logging()
    if "--loop" in sys.argv:
        poll = float(os.environ.get("WORKER_POLL_SECONDS", "2"))
        while True:
            out = run_once()
            if out["consumer"]["processed"] or out["consumer"]["dead_lettered"]:
                log.info("worker cycle", extra=out)
            time.sleep(poll)
    print(json.dumps(run_once(), indent=2))
