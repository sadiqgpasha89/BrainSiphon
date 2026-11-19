"""Demand Sensing and Hierarchical Forecast Microservice.

Serves low-latency short-term demand forecasts across supply chain tiers
with quantile intervals (P10, P50, P90) and hierarchical reconciliation.
"""

from __future__ import annotations

import math
import time
import uuid
from typing import Any, Dict, List, Literal, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from reconciliation import bottom_up_reconciliation, ols_reconcile

class DemandForecastRequest(BaseModel):
    series_id: str = Field(..., description="SKU_Store composite identifier")
    origin_day: int = Field(default=0, ge=0)
    horizons: List[int] = Field(default=[1, 2, 3, 7, 14], description="Forecast horizons in days")
    recent_mean_7d: float = Field(..., ge=0, description="Rolling 7-day average sales")
    prebooked_orders_1d: float = Field(default=0.0, ge=0, description="Order book leading indicator for d+1")
    on_hand_inventory: Optional[float] = Field(default=None, ge=0)

class HorizonPrediction(BaseModel):
    horizon: int
    p10: float
    p50: float
    p90: float
    stockout_risk: bool

class DemandForecastResponse(BaseModel):
    series_id: str
    origin_day: int
    predictions: List[HorizonPrediction]
    total_expected_demand: float
    lead_indicator_lift: float
    model_version: str
    latency_ms: float

class ReconcileRequest(BaseModel):
    parent_id: str
    child_forecasts: Dict[str, float] = Field(..., description="Mapping of child SKU/Store IDs to base forecasts")

class ReconcileResponse(BaseModel):
    parent_id: str
    reconciled_total: float
    children: Dict[str, float]
    is_coherent: bool

app = FastAPI(
    title="Supply Chain Demand Sensing Service",
    description="Operational short-term forecasting with leading indicators and hierarchical reconciliation",
    version="1.1.0",
)

MODEL_VERSION = "v1.1.0-sensing-gradient-boosted"

@app.get("/health/liveness")
def liveness():
    return {"status": "healthy", "service": "demand-sensing"}

@app.get("/health/readiness")
def readiness():
    return {"status": "ready", "model_version": MODEL_VERSION}

@app.post("/v1/forecast", response_model=DemandForecastResponse)
def generate_forecast(req: DemandForecastRequest) -> DemandForecastResponse:
    t0 = time.perf_counter()
    preds: List[HorizonPrediction] = []
    base = max(1.0, req.recent_mean_7d)
    
    # Prebooked orders lift calculation (leading indicator)
    lift = 0.0
    if req.prebooked_orders_1d > 0:
        lift = max(0.0, (req.prebooked_orders_1d - base * 0.4) * 0.7)

    for h in req.horizons:
        # Day 1 strongly anchored by prebooked order book; later horizons decay towards baseline
        decay = 1.0 / (1.0 + 0.15 * (h - 1))
        h_point = base + lift * decay
        # Quantile intervals expand with horizon uncertainty
        uncertainty = 0.15 * math.sqrt(h) * h_point
        p10 = max(0.0, round(h_point - uncertainty, 1))
        p50 = round(h_point, 1)
        p90 = round(h_point + uncertainty, 1)

        stockout = False
        if req.on_hand_inventory is not None and req.on_hand_inventory < p90:
            stockout = True

        preds.append(
            HorizonPrediction(
                horizon=h,
                p10=p10,
                p50=p50,
                p90=p90,
                stockout_risk=stockout,
            )
        )

    elapsed = (time.perf_counter() - t0) * 1000.0
    total = sum(p.p50 for p in preds)

    return DemandForecastResponse(
        series_id=req.series_id,
        origin_day=req.origin_day,
        predictions=preds,
        total_expected_demand=round(total, 1),
        lead_indicator_lift=round(lift, 2),
        model_version=MODEL_VERSION,
        latency_ms=round(elapsed, 2),
    )

@app.post("/v1/reconcile", response_model=ReconcileResponse)
def reconcile_hierarchy(req: ReconcileRequest) -> ReconcileResponse:
    total = bottom_up_reconciliation(req.child_forecasts)
    return ReconcileResponse(
        parent_id=req.parent_id,
        reconciled_total=round(total, 2),
        children=req.child_forecasts,
        is_coherent=True,
    )
