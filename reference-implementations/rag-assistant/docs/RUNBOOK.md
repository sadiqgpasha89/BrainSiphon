# Runbook

Every alert in `monitoring/alerts.yaml` links to a section here. First steps for any alert: open the staff page (`/ui/` as
`writer`), run `make monitor`, and read the API log (JSON lines; filter by `request_id`).

## Roll back the index

```bash
curl -X POST $API/v1/index/rollback -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"<incident reference and what you saw>"}'
```

The previous index is serving within seconds. A rolled-back index is older than the documents: expect `RagIndexStale`.

## Index stale

Documents changed since the serving index was built, so answers can be out of date. `make reindex` (or
`POST /v1/index/rebuild`). If the new index fails its gates it is kept as a candidate and the old one keeps serving: read
`failures` in the output; usually a changed page broke an evaluation example, which a writer must update.

## Answer quality low

Correctness on the evaluation set is low, or users are down-voting. Read the failing examples
(`GET /v1/index` -> `failures`). Separate retrieval failures (the right page is not in the top 5: chunking or encoder)
from generation failures (the page is there, the answer is wrong) from documentation gaps (no page answers it).

## Access control leak

An internal passage was retrieved for a public reader. This pages because it is a confidentiality incident. Roll back,
then check how the chunk got the wrong visibility (the source event, the contract) before re-indexing.

## Abstain rate high

Many questions are declined. Look at the review queue: a cluster of similar questions is a documentation gap; scattered
declines after a deploy are a retrieval fault (wrong threshold, an empty or wrong index).

## Unsupported sentences

The generator is producing sentences its citations do not support. They are removed before the user sees them, so this is a
quality signal, not a leak: check the prompt, the model version and whether retrieved chunks are too long or too many.

## Latency high

With the extractive generator this means the database or the host is struggling. With an LLM generator, check the
provider's status and your rate limits first.

## Dead letters

A document event failed three times. Read `dead_letters.error` and `payload`, fix the cause, re-publish with a new event id.

## Reviews overdue

Questions have waited past the SLA. Nothing is broken for users, but the feedback loop has stopped.
