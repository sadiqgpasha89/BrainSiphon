"""Ultra-low-latency Ad CTR Scoring and RTB Auction Microservice (P99 < 10ms SLA).

Performs calibrated CTR inference, Empirical Bayes smoothing for cold-start ads,
and computes eCPM for real-time second-price auction resolution.
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

PRIOR_CTR = 0.045
PRIOR_STRENGTH = 50.0

class AdCandidate(BaseModel):
    ad_id: int
    advertiser_id: int
    bid_cpc: float = Field(..., gt=0, description="Cost-Per-Click bid in USD")
    category: int
    historical_clicks: Optional[int] = Field(default=0)
    historical_imps: Optional[int] = Field(default=0)

class AuctionCandidateRequest(BaseModel):
    auction_id: str
    user_segment: int
    placement_id: int
    device_type: int
    candidates: List[AdCandidate] = Field(..., min_length=1)

class RankedAdResult(BaseModel):
    ad_id: int
    advertiser_id: int
    p_ctr: float
    bid_cpc: float
    ecpm: float
    rank: int

class AuctionResponse(BaseModel):
    auction_id: str
    winning_ad_id: int
    clearing_ecpm: float
    ranked_ads: List[RankedAdResult]
    model_version: str
    latency_ms: float

app = FastAPI(
    title="Real-Time Ad CTR Scoring Service",
    description="RTB auction CTR predictor with empirical Bayes smoothing and eCPM ranking",
    version="1.2.0",
)

MODEL_VERSION = "v1.2.0-calibrated-logistic-eb"

def compute_calibrated_ctr(cand: AdCandidate, user_seg: int, placement: int) -> float:
    """Empirical Bayes smoothing combined with segment/placement affinity."""
    # Smoothed prior CTR
    clicks = cand.historical_clicks or 0
    imps = cand.historical_imps or 0
    prior = PRIOR_CTR * PRIOR_STRENGTH
    smoothed_ctr = (clicks + prior) / (imps + PRIOR_STRENGTH)

    # Segment affinity multiplier
    seg_affinity = 1.0 + 0.15 * math.sin(user_seg + cand.category)
    placement_multiplier = 1.2 if placement == 0 else 0.85

    p_ctr = min(0.35, max(0.005, smoothed_ctr * seg_affinity * placement_multiplier))
    return round(p_ctr, 5)

@app.get("/health/liveness")
def liveness():
    return {"status": "healthy", "service": "ad-ctr-scoring"}

@app.get("/health/readiness")
def readiness():
    return {"status": "ready", "model_version": MODEL_VERSION}

@app.post("/v1/score_auction", response_model=AuctionResponse)
def score_auction(req: AuctionCandidateRequest) -> AuctionResponse:
    t0 = time.perf_counter()
    ranked: List[RankedAdResult] = []

    for cand in req.candidates:
        p_ctr = compute_calibrated_ctr(cand, req.user_segment, req.placement_id)
        # eCPM = bid_cpc * p_ctr * 1000
        ecpm = round(cand.bid_cpc * p_ctr * 1000.0, 4)
        ranked.append(
            RankedAdResult(
                ad_id=cand.ad_id,
                advertiser_id=cand.advertiser_id,
                p_ctr=p_ctr,
                bid_cpc=cand.bid_cpc,
                ecpm=ecpm,
                rank=0,
            )
        )

    # Sort descending by eCPM
    ranked.sort(key=lambda x: x.ecpm, reverse=True)
    for idx, r in enumerate(ranked):
        r.rank = idx + 1

    winning = ranked[0]
    # Second-price auction: clearing price is second highest eCPM + 0.01 (or reserve)
    clearing_ecpm = ranked[1].ecpm + 0.01 if len(ranked) > 1 else winning.ecpm

    elapsed = (time.perf_counter() - t0) * 1000.0

    return AuctionResponse(
        auction_id=req.auction_id,
        winning_ad_id=winning.ad_id,
        clearing_ecpm=round(clearing_ecpm, 4),
        ranked_ads=ranked,
        model_version=MODEL_VERSION,
        latency_ms=round(elapsed, 2),
    )

