"""The packaged retrieval index: the versioned artefact of a RAG system.

Hybrid retrieval. A lexical ranking (BM25) and a dense ranking (TF-IDF projected to a low-dimensional latent space with SVD,
cosine similarity) are fused with reciprocal rank fusion. The dense encoder is a small local model so that the implementation
runs offline; swap `encode` for an embedding model and the matrix for a vector database without changing the callers.

Access control is applied BEFORE ranking: a chunk the reader may not see is never a candidate, so it cannot be returned,
cited, or leak through the generator.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np

_TOKEN = re.compile(r"[a-z0-9_]+")
STOP = frozenset("a an the of to in on for and or is are be do does did how what when where which who whom why can i my me you "
                 "your it its this that with from at by as any there will if not".split())


def _stem(t: str) -> str:
    """A deliberately small stemmer: enough for 'deliveries' to match 'delivery' and 'retried' to match 'retries'."""
    for suffix, repl in (("ies", "y"), ("ied", "y"), ("ing", ""), ("ed", ""), ("es", ""), ("s", "")):
        if t.endswith(suffix) and len(t) - len(suffix) >= 3:
            t = t[: -len(suffix)] + repl
            break
    return t[:-1] if t.endswith("e") and len(t) > 3 else t


def tokens(text: str) -> list[str]:
    return [_stem(t) for t in _TOKEN.findall(text.lower()) if t not in STOP]


@dataclass
class RetrievalIndex:
    chunks: list[dict[str, Any]]          # the rows of the doc_chunk feature view
    fields: list[str]
    vectorizer: Any
    svd: Any
    dense: np.ndarray                     # [chunks, dims], L2-normalised
    idf: dict[str, float]
    chunk_tokens: list[list[str]]
    avg_len: float
    rrf_k: int = 60
    max_idf: float = field(default=0.0)

    def encode(self, text: str) -> np.ndarray:
        v = self.svd.transform(self.vectorizer.transform([text]))[0]
        n = np.linalg.norm(v)
        return v / n if n else v

    def _bm25(self, q: list[str], i: int, k1: float = 1.4, b: float = 0.75) -> float:
        toks = self.chunk_tokens[i]
        score = 0.0
        for t in set(q):
            f = toks.count(t)
            if f:
                score += self.idf.get(t, 0.0) * f * (k1 + 1) / (f + k1 * (1 - b + b * len(toks) / self.avg_len))
        return score

    def coverage(self, question: str, i: int) -> float:
        """IDF-weighted share of the question's content words found in chunk i. A word the corpus has never seen counts as
        missing with the highest weight, which is what makes off-topic questions score low."""
        q = set(tokens(question))
        if not q:
            return 0.0
        have = set(self.chunk_tokens[i])
        total = sum(self.idf.get(t, self.max_idf) for t in q)
        return sum(self.idf[t] for t in q if t in have and t in self.idf) / total if total else 0.0

    def search(self, question: str, k: int, visibilities: tuple[str, ...]) -> list[dict[str, Any]]:
        allowed = [i for i, c in enumerate(self.chunks) if c["visibility"] in visibilities]
        if not allowed:
            return []
        q = tokens(question)
        lexical = sorted(allowed, key=lambda i: -self._bm25(q, i))
        sims = self.dense[allowed] @ self.encode(question)
        dense = [allowed[j] for j in np.argsort(-sims)]
        fused: dict[int, float] = {}
        for ranking in (lexical, dense):
            for rank, i in enumerate(ranking):
                fused[i] = fused.get(i, 0.0) + 1.0 / (self.rrf_k + rank + 1)
        top = sorted(fused, key=lambda i: -fused[i])[:k]
        return [{**self.chunks[i], "score": round(fused[i], 5), "coverage": round(self.coverage(question, i), 4)} for i in top]


def build(chunks: list[dict[str, Any]], fields: list[str], dims: int, rrf_k: int) -> RetrievalIndex:
    from sklearn.decomposition import TruncatedSVD
    from sklearn.feature_extraction.text import TfidfVectorizer

    texts = [f"{c['title']}. {c['text']}" for c in chunks]
    vec = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 2), stop_words=list(STOP)).fit(texts)
    X = vec.transform(texts)
    svd = TruncatedSVD(n_components=max(2, min(dims, X.shape[0] - 1, X.shape[1] - 1)), random_state=0).fit(X)
    dense = svd.transform(X)
    dense = dense / np.clip(np.linalg.norm(dense, axis=1, keepdims=True), 1e-12, None)
    toks = [tokens(t) for t in texts]
    n = len(toks)
    df: dict[str, int] = {}
    for ts in toks:
        for t in set(ts):
            df[t] = df.get(t, 0) + 1
    idf = {t: math.log(1 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}
    return RetrievalIndex(chunks, fields, vec, svd, dense, idf, toks, sum(map(len, toks)) / max(1, n), rrf_k,
                          max(idf.values(), default=1.0))
