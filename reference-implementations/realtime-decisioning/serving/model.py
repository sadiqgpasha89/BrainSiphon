"""The packaged model: a classifier, its probability calibrator and the two decision thresholds, as one object.

Packaging them together means a version in the registry is a complete decision function. Nobody can deploy a new classifier
with the previous classifier's thresholds.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np


@dataclass
class FraudModel:
    classifier: Any
    calibrator: Any  # isotonic regression fitted on the validation window
    features: list[str]
    step_up_threshold: float
    block_threshold: float

    def score(self, rows: np.ndarray) -> np.ndarray:
        """Calibrated probability of fraud for a 2-D array whose columns follow `features`."""
        raw = self.classifier.predict_proba(rows)[:, 1]
        return np.clip(self.calibrator.predict(raw), 0.0, 1.0)

    def action(self, score: float) -> str:
        if score >= self.block_threshold:
            return "BLOCK"
        if score >= self.step_up_threshold:
            return "STEP_UP"
        return "ALLOW"
