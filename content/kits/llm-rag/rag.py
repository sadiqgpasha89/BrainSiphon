"""A small retrieval-augmented answerer with a verifier. The reader is a deterministic extractive stand-in for an
LLM so the harness, guardrails and evaluation are real and testable offline; swap your model in behind `Reader`."""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass

from make_data import FACTS, Chunk

STOP = {"the", "a", "an", "is", "of", "for", "in", "to", "does", "do", "what", "how", "long", "many", "can", "be", "api", "are", "by", "per"}
INTENT = {"rate_limit": ["rate limit", "calls per minute", "requests per minute"], "max_payload": ["payload", "request body"],
          "timeout": ["time out", "times out", "timeout"], "retention": ["retention", "keep"]}


def tokens(s: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", s.lower()) if t not in STOP]


class BM25:
    def __init__(self, docs: list[str], k1: float = 1.4, b: float = 0.75):
        self.docs = [Counter(tokens(d)) for d in docs]
        self.len = [sum(d.values()) for d in self.docs]
        self.avg = sum(self.len) / len(self.len)
        df = Counter(t for d in self.docs for t in d)
        n = len(docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}
        self.k1, self.b = k1, b

    def scores(self, query: str) -> list[float]:
        q = tokens(query)
        out = []
        for d, L in zip(self.docs, self.len):
            s = 0.0
            for t in q:
                if t in d:
                    s += self.idf[t] * d[t] * (self.k1 + 1) / (d[t] + self.k1 * (1 - self.b + self.b * L / self.avg))
            out.append(s)
        return out


class CharNgram:
    """Character 3-gram TF-IDF cosine: tolerant of 'timeout' vs 'times out' and 'retained' vs 'retention'. A stand-in for dense embeddings."""

    def __init__(self, docs: list[str]):
        grams = [self._g(d) for d in docs]
        df = Counter(g for c in grams for g in set(c))
        n = len(docs)
        self.idf = {g: math.log(1 + n / c) for g, c in df.items()}
        self.vecs = [self._norm(c) for c in grams]

    @staticmethod
    def _g(s: str) -> Counter:
        s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
        return Counter(s[i:i + 3] for i in range(len(s) - 2))

    def _norm(self, c: Counter) -> dict:
        v = {g: n * self.idf.get(g, 0.0) for g, n in c.items()}
        z = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {g: x / z for g, x in v.items()}

    def scores(self, query: str) -> list[float]:
        q = self._norm(self._g(query))
        return [sum(w * d.get(g, 0.0) for g, w in q.items()) for d in self.vecs]


def rrf(rankings: list[list[int]], k: int = 60) -> list[int]:
    s: dict[int, float] = defaultdict(float)
    for r in rankings:
        for pos, i in enumerate(r):
            s[i] += 1 / (k + pos + 1)
    return sorted(s, key=lambda i: -s[i])


@dataclass
class Answer:
    value: int | None
    chunk_id: int | None
    sentence: str | None
    abstained: bool
    reason: str = ""


def intent_of(question: str) -> str | None:
    q = question.lower()
    for f, kws in INTENT.items():
        if any(k in q for k in kws):
            return f
    return None


def wants_version(question: str) -> str:
    return "v1" if re.search(r"\bv1\b", question.lower()) else "v2"


class Reader:
    """Extractive stand-in for the generator: choose the best-matching sentence and read its first number."""

    def answer(self, question: str, chunks: list[Chunk], intent: str | None = None) -> Answer:
        q = set(tokens(question))
        best, best_score = None, -1.0
        for c in chunks:
            for sent in re.split(r"(?<=[.])\s+", c.text):
                if not re.search(r"\d", re.sub(r"\bv\d\b", "", sent)):
                    continue
                if intent and FACTS[intent]["unit"] not in sent and intent.replace("_", " ") not in sent:
                    continue
                score = len(q & set(tokens(sent))) / (1 + len(set(tokens(sent))) * 0.05)
                if score > best_score:
                    best, best_score = (c, sent), score
        if best is None:
            return Answer(None, None, None, True, "no supporting sentence")
        c, sent = best
        m = re.search(r"\d+", re.sub(r"\bv\d\b", "", sent))
        return Answer(int(m.group()), c.id, sent, False)


def verify(ans: Answer, chunks_by_id: dict[int, Chunk]) -> bool:
    """The value must literally appear in the chunk it cites."""
    return ans.chunk_id is not None and str(ans.value) in re.findall(r"\d+", chunks_by_id[ans.chunk_id].text)


class Pipeline:
    def __init__(self, chunks: list[Chunk], mode: str):
        self.chunks, self.mode = chunks, mode
        self.by_id = {c.id: c for c in chunks}
        texts = [c.text for c in chunks]
        self.bm25, self.ngram, self.reader = BM25(texts), CharNgram(texts), Reader()

    def retrieve(self, question: str, k: int = 5) -> list[Chunk]:
        b = self.bm25.scores(question)
        rb = sorted(range(len(b)), key=lambda i: -b[i])
        if self.mode == "naive":
            return [self.chunks[i] for i in rb[:k]]
        g = self.ngram.scores(question)
        rg = sorted(range(len(g)), key=lambda i: -g[i])
        fused = rrf([rb[:30], rg[:30]])
        ver = wants_version(question)
        ok = [i for i in fused if self.chunks[i].kind == "reference" and self.chunks[i].version == ver]
        return [self.chunks[i] for i in ok[:k]]

    def answer(self, question: str) -> Answer:
        got = self.retrieve(question)
        if self.mode == "naive":
            return self.reader.answer(question, got)
        intent = intent_of(question)
        if intent is None:
            return Answer(None, None, None, True, "no documented intent")
        a = self.reader.answer(question, got, intent)
        product_ok = a.chunk_id is not None and any(w in self.by_id[a.chunk_id].product for w in tokens(question))
        if a.abstained or not product_ok or not verify(a, self.by_id):
            return Answer(None, None, None, True, "unsupported or wrong source")
        return a
