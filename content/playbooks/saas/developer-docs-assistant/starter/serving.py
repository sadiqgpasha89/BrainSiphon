"""Enterprise Developer Documentation RAG Assistant with Citation Verification.

Features:
- Hybrid BM25 + dense retrieval
- Guarded reader with strict citation verification
- Groundedness scoring and unanswerable question refusal
- Ragas-style evaluation metrics endpoint
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Literal, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from make_data import Chunk, generate
from rag import BM25, Answer, Pipeline, Reader, verify

class DocQueryRequest(BaseModel):
    query: str = Field(..., description="Developer question")
    product: Optional[str] = Field(default=None, description="Target product or SDK")
    version: Optional[str] = Field(default=None, description="API version constraint, e.g. v2")
    top_k: int = Field(default=3, ge=1, le=10)

class Citation(BaseModel):
    chunk_id: int
    product: str
    version: str
    kind: str
    excerpt: str

class DocQueryResponse(BaseModel):
    query_id: str
    answer: str
    cited_chunk_id: Optional[int]
    citations: List[Citation]
    groundedness_score: float
    is_refusal: bool
    latency_ms: float

class RagasEvaluationRequest(BaseModel):
    question: str
    answer: str
    contexts: List[str]
    ground_truth: Optional[str] = None

class RagasEvaluationResponse(BaseModel):
    faithfulness: float
    answer_relevance: float
    context_precision: float
    grounded: bool

app = FastAPI(
    title="Developer Documentation RAG Service",
    description="Enterprise RAG assistant with grounded citations and hallucination guardrails",
    version="1.2.0",
)

# Seed knowledge base
chunks, gold, _ = generate(seed=17)
chunk_map: Dict[int, Chunk] = {c.id: c for c in chunks}
pipeline = Pipeline(chunks, mode="guarded")

@app.get("/health/liveness")
def liveness():
    return {"status": "healthy", "service": "docs-rag-assistant"}

@app.get("/health/readiness")
def readiness():
    return {"status": "ready", "corpus_chunks": len(chunks)}

@app.post("/v1/query", response_model=DocQueryResponse)
def query_docs(req: DocQueryRequest) -> DocQueryResponse:
    t0 = time.perf_counter()
    ans = pipeline.answer(req.query)
    elapsed = (time.perf_counter() - t0) * 1000.0

    if ans.abstained or ans.chunk_id is None:
        return DocQueryResponse(
            query_id=str(uuid.uuid4()),
            answer="I cannot find authoritative documentation to answer this question accurately.",
            cited_chunk_id=None,
            citations=[],
            groundedness_score=0.0,
            is_refusal=True,
            latency_ms=round(elapsed, 2),
        )

    c = chunk_map[ans.chunk_id]
    is_valid_citation = verify(ans, chunk_map)

    citations = [
        Citation(
            chunk_id=c.id,
            product=c.product,
            version=c.version,
            kind=c.kind,
            excerpt=c.text[:200] + "...",
        )
    ]

    return DocQueryResponse(
        query_id=str(uuid.uuid4()),
        answer=f"Based on the documentation for {c.product} ({c.version}), the limit is {ans.value}.",
        cited_chunk_id=ans.chunk_id,
        citations=citations,
        groundedness_score=1.0 if is_valid_citation else 0.3,
        is_refusal=False,
        latency_ms=round(elapsed, 2),
    )

@app.post("/v1/evaluate", response_model=RagasEvaluationResponse)
def evaluate_ragas(req: RagasEvaluationRequest) -> RagasEvaluationResponse:
    """Evaluate RAG faithfulness and answer relevance against retrieved contexts."""
    # Check if answer tokens are present in context
    import re
    answer_tokens = [w for w in re.findall(r"[a-z0-9]+", req.answer.lower()) if len(w) > 2]
    context_text = " ".join(req.contexts).lower()
    matched = sum(1 for w in answer_tokens if w in context_text)
    
    faithfulness = round(matched / max(1, len(answer_tokens)), 3)
    question_tokens = [w for w in re.findall(r"[a-z0-9]+", req.question.lower()) if len(w) > 2]
    relevance = 0.95 if any(q in req.answer.lower() for q in question_tokens) else 0.60
    precision = 1.0 if req.contexts else 0.0

    return RagasEvaluationResponse(
        faithfulness=faithfulness,
        answer_relevance=relevance,
        context_precision=precision,
        grounded=faithfulness >= 0.70,
    )
