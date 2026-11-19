"""Student Knowledge Tracing and Adaptive Mastery Microservice.

Maintains sequential student knowledge states (PFA/DKT), calculates mastery probabilities,
and recommends next learning items based on Zone of Proximal Development (ZPD).
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Literal, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

class InteractionSubmission(BaseModel):
    student_id: str = Field(..., description="Unique student account identifier")
    question_id: int = Field(..., ge=0, description="Question ID")
    skill_id: int = Field(..., ge=0, description="Knowledge Component / Skill ID")
    correct: Literal[0, 1] = Field(..., description="1 if correct, 0 if incorrect")
    timestamp: float = Field(default_factory=time.time)

class MasteryStateResponse(BaseModel):
    student_id: str
    skill_id: int
    mastery_probability: float
    total_attempts: int
    consecutive_correct: int
    is_mastered: bool
    recommended_action: Literal["advance_difficulty", "practice_same_level", "remedial_review"]
    timestamp: float

class SuccessPredictionRequest(BaseModel):
    student_id: str
    skill_id: int
    question_difficulty: float = Field(default=0.0, ge=-3.0, le=3.0, description="IRT question difficulty")

class SuccessPredictionResponse(BaseModel):
    student_id: str
    skill_id: int
    p_correct: float
    confidence_interval: tuple[float, float]
    zpd_appropriate: bool

app = FastAPI(
    title="Knowledge Tracing Student Modeling Service",
    description="Adaptive learning state tracker and mastery evaluation engine",
    version="1.2.0",
)

# In-memory student mastery tracking: (student_id, skill_id) -> state dict
student_states: Dict[tuple[str, int], Dict[str, Any]] = {}

def get_or_create_state(student_id: str, skill_id: int) -> Dict[str, Any]:
    key = (student_id, skill_id)
    if key not in student_states:
        student_states[key] = {
            "attempts": 0,
            "correct_cnt": 0,
            "consecutive_correct": 0,
            "p_mastery": 0.20,  # prior probability of skill mastery
            "last_ts": time.time(),
        }
    return student_states[key]

@app.get("/health/liveness")
def liveness():
    return {"status": "healthy", "service": "knowledge-tracing"}

@app.get("/health/readiness")
def readiness():
    return {"status": "ready", "active_student_sessions": len(student_states)}

@app.post("/v1/trace", response_model=MasteryStateResponse)
def submit_interaction(req: InteractionSubmission) -> MasteryStateResponse:
    state = get_or_create_state(req.student_id, req.skill_id)
    state["attempts"] += 1
    
    # Bayesian Knowledge Tracing update:
    p_prior = state["p_mastery"]
    p_transit = 0.15  # learning transition probability
    p_guess = 0.20
    p_slip = 0.10

    if req.correct == 1:
        state["correct_cnt"] += 1
        state["consecutive_correct"] += 1
        # P(L | C) = (P(L) * (1 - S)) / (P(L)*(1-S) + (1-P(L))*G)
        num = p_prior * (1.0 - p_slip)
        den = num + (1.0 - p_prior) * p_guess
        p_learned = num / max(1e-5, den)
    else:
        state["consecutive_correct"] = 0
        # P(L | W) = (P(L) * S) / (P(L)*S + (1-P(L))*(1-G))
        num = p_prior * p_slip
        den = num + (1.0 - p_prior) * (1.0 - p_guess)
        p_learned = num / max(1e-5, den)

    # Next state transition: P(L_t+1) = P(L_t) + (1 - P(L_t)) * P(T)
    state["p_mastery"] = round(min(0.99, p_learned + (1.0 - p_learned) * p_transit), 4)
    state["last_ts"] = req.timestamp

    is_mastered = state["p_mastery"] >= 0.85
    if is_mastered:
        action = "advance_difficulty"
    elif state["p_mastery"] >= 0.50:
        action = "practice_same_level"
    else:
        action = "remedial_review"

    return MasteryStateResponse(
        student_id=req.student_id,
        skill_id=req.skill_id,
        mastery_probability=state["p_mastery"],
        total_attempts=state["attempts"],
        consecutive_correct=state["consecutive_correct"],
        is_mastered=is_mastered,
        recommended_action=action,
        timestamp=req.timestamp,
    )

@app.post("/v1/predict_success", response_model=SuccessPredictionResponse)
def predict_success(req: SuccessPredictionRequest) -> SuccessPredictionResponse:
    state = get_or_create_state(req.student_id, req.skill_id)
    p_m = state["p_mastery"]
    # Logistic response model combining mastery and question difficulty
    logit = 2.5 * (p_m - 0.5) - req.question_difficulty
    p_correct = round(1.0 / (1.0 + math.exp(-logit)), 3)
    
    # Zone of Proximal Development: optimal learning occurs when success prob is between 0.60 and 0.85
    zpd = 0.55 <= p_correct <= 0.85

    return SuccessPredictionResponse(
        student_id=req.student_id,
        skill_id=req.skill_id,
        p_correct=p_correct,
        confidence_interval=(round(max(0.0, p_correct - 0.08), 3), round(min(1.0, p_correct + 0.08), 3)),
        zpd_appropriate=zpd,
    )
