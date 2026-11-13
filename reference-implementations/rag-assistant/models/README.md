# models/

`models/registry/` is created at run time (git-ignored). For a RAG system the versioned artefact is the **retrieval index**:
`docs-index/<version>/{model.joblib, manifest.json, requirements.txt}`. The manifest records the content hash of every
document the index was built from (which is how staleness is detected), the evaluation metrics, and the failed examples.

```bash
cat models/registry/docs-index/index.json               # which index is production, and who promoted it
cat models/registry/docs-index/v0001/manifest.json      # metrics, source documents, failed evaluation examples
```

## System card (fill in for your deployment)

| Item | This reference implementation |
|---|---|
| Intended use | Answer developers' questions about the product from its documentation, with a citation for every sentence |
| Not intended for | Account-specific questions, legal or security advice, anything not written in the indexed documents |
| Knowledge source | 31 synthetic pages from `data/source_system.py` (28 public, 3 internal) |
| Retriever | BM25 + TF-IDF/SVD dense vectors, reciprocal rank fusion, access filter before ranking |
| Generator | Extractive by default; Claude optional (`generation.provider: anthropic`), not exercised by the tests |
| Evaluation | 35 seed questions plus reviewed production questions: recall@5, MRR, correctness, faithfulness, abstention, access leaks |
| Known limitations | The abstention rule is lexical: an off-topic question that shares words with a page can be answered with an irrelevant, but grounded, sentence (one of the seed examples fails this way). Extractive answers quote; they do not synthesise |
| Human oversight | Declined and down-voted answers go to the documentation team; their decisions become evaluation examples |
