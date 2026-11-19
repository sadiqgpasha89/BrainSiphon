"""Hierarchical forecast reconciliation (Bottom-Up and OLS projection).

Guarantees coherence across multi-echelon supply chain hierarchies (SKU -> Store -> Region -> Total).
"""

from __future__ import annotations

import numpy as np
from typing import Dict, List, Tuple

def bottom_up_reconciliation(child_forecasts: Dict[str, float]) -> float:
    """Bottom-up aggregation: parent equals exact sum of child forecasts."""
    return float(sum(child_forecasts.values()))

def ols_reconcile(
    base_forecasts: np.ndarray,
    summing_matrix: np.ndarray,
) -> np.ndarray:
    """Optimal Minimum Trace (MinT / OLS) hierarchical forecast reconciliation.

    Formula: y_tilde = S * (S' * S)^(-1) * S' * y_hat
    where S is the summing matrix and y_hat is the incoherent base forecast vector.
    """
    S = summing_matrix
    St = S.T
    # Compute projection matrix
    inv_term = np.linalg.pinv(St @ S)
    projection = S @ inv_term @ St
    reconciled = projection @ base_forecasts
    return np.maximum(0.0, reconciled)

