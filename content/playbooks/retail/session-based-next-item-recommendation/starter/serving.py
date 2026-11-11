"""High-performance 2-Stage Session Recommendation Microservice (P99 < 25ms SLA).

Combines co-visitation candidate generation with diversity-aware reranking and bot filtration.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from reranker import rerank_candidates

class SessionRecommendRequest(BaseModel):
    session_id: str = Field(..., description="Unique browser/app session ID")
    current_item_id: int = Field(..., ge=0, description="Item currently viewed")
    session_history: List[int] = Field(default=[], description="List of item IDs previously viewed in session")
    user_agent: Optional[str] = Field(default="Mozilla/5.0", description="User agent string for crawler detection")
    top_k: int = Field(default=5, ge=1, le=20)

class RecommendedItem(BaseModel):
    item_id: int
    score: float
    category: str
    rank: int

class SessionRecommendResponse(BaseModel):
    session_id: str
    recommendations: List[RecommendedItem]
    is_bot_traffic: bool
    model_version: str
    latency_ms: float

app = FastAPI(
    title="Session-Based Next-Item Recommender",
    description="Two-stage candidate retrieval and diversity-constrained ranking service",
    version="1.2.0",
)

MODEL_VERSION = "v1.2.0-covisit-rerank"

# Mock item category mapping
def item_category(item_id: int) -> str:
    categories = ["apparel", "footwear", "electronics", "accessories", "home"]
    return categories[item_id % len(categories)]

# Mock candidate retrieval from transition graph
def retrieve_candidates(current_item: int, history: List[int]) -> List[tuple[int, float, str]]:
    candidates = []
    for i in range(1, 30):
        cand_id = (current_item * 7 + i * 13) % 300
        # Simulated transition strength decaying with distance
        score = round(1.0 / (1.0 + 0.1 * i), 4)
        candidates.append((cand_id, score, item_category(cand_id)))
    return candidates

def is_crawler(user_agent: Optional[str], history_len: int) -> bool:
    if not user_agent:
        return False
    ua = user_agent.lower()
    bot_keywords = ["bot", "crawl", "spider", "slurp", "headless"]
    if any(k in ua for k in bot_keywords):
        return True
    # Unnatural velocity (> 50 items in short session)
    if history_len > 50:
        return True
    return False

@app.get("/health/liveness")
def liveness():
    return {"status": "healthy", "service": "session-recs"}

@app.get("/health/readiness")
def readiness():
    return {"status": "ready", "model_version": MODEL_VERSION}

@app.post("/v1/recommend", response_model=SessionRecommendResponse)
def recommend(req: SessionRecommendRequest) -> SessionRecommendResponse:
    t0 = time.perf_counter()
    full_history = req.session_history + [req.current_item_id]
    
    # 1. Bot crawler detection
    bot = is_crawler(req.user_agent, len(full_history))
    if bot:
        # Fallback to popular static items, avoiding recommendation engine load
        elapsed = (time.perf_counter() - t0) * 1000.0
        fallback_items = [
            RecommendedItem(item_id=idx, score=0.5, category=item_category(idx), rank=r + 1)
            for r, idx in enumerate([101, 102, 103, 104, 105][:req.top_k])
        ]
        return SessionRecommendResponse(
            session_id=req.session_id,
            recommendations=fallback_items,
            is_bot_traffic=True,
            model_version=MODEL_VERSION,
            latency_ms=round(elapsed, 2),
        )

    # 2. Stage 1: Candidate Generation
    candidates = retrieve_candidates(req.current_item_id, req.session_history)

    # 3. Stage 2: Diversity-aware reranking
    reranked = rerank_candidates(
        candidates=candidates,
        history=full_history,
        max_per_category=2,
        top_k=req.top_k,
    )

    elapsed = (time.perf_counter() - t0) * 1000.0

    items = [
        RecommendedItem(item_id=c[0], score=c[1], category=c[2], rank=idx + 1)
        for idx, c in enumerate(reranked)
    ]

    return SessionRecommendResponse(
        session_id=req.session_id,
        recommendations=items,
        is_bot_traffic=False,
        model_version=MODEL_VERSION,
        latency_ms=round(elapsed, 2),
    )

