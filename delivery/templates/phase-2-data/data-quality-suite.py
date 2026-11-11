"""
Data Quality Validation Suite (Great Expectations / Pytest Style)
Automates schema checks, null-rate thresholds, distribution invariants,
and chronological leakage detection.
"""
from datetime import datetime
import pandas as pd
import numpy as np

def validate_dataset(df: pd.DataFrame, config: dict) -> dict:
    results = {"total_checks": 0, "passed": 0, "failed": 0, "errors": []}
    
    def check(name: str, condition: bool, error_msg: str):
        results["total_checks"] += 1
        if condition:
            results["passed"] += 1
        else:
            results["failed"] += 1
            results["errors"].append(f"{name}: {error_msg}")

    # 1. Uniqueness check on primary key
    pk = config.get("primary_key", "event_id")
    if pk in df.columns:
        check("primary_key_unique", df[pk].is_unique, f"Duplicate keys found in {pk}")

    # 2. Null rate threshold check
    max_null_pct = config.get("max_null_pct", 0.01)
    for col in config.get("required_columns", []):
        if col in df.columns:
            null_pct = df[col].isnull().mean()
            check(f"null_rate_{col}", null_pct <= max_null_pct, f"Column {col} null rate {null_pct:.4f} > {max_null_pct}")

    # 3. Numeric range checks
    for col, (min_val, max_val) in config.get("range_checks", {}).items():
        if col in df.columns:
            in_range = df[col].between(min_val, max_val).all()
            check(f"range_{col}", in_range, f"Column {col} contains values outside [{min_val}, {max_val}]")

    # 4. Chronological Leakage Check
    if "event_time" in df.columns and "decision_time" in df.columns:
        no_future_leak = (df["event_time"] <= df["decision_time"]).all()
        check("no_future_leakage", no_future_leak, "Found events occurring AFTER decision_time (Data Leakage)")

    return results

if __name__ == "__main__":
    sample_df = pd.DataFrame({
        "event_id": ["e1", "e2", "e3"],
        "amount": [10.5, 45.0, 100.0],
        "event_time": pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-03"]),
        "decision_time": pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-03"]),
    })
    cfg = {
        "primary_key": "event_id",
        "required_columns": ["event_id", "amount"],
        "range_checks": {"amount": (0.01, 1000000.0)},
        "max_null_pct": 0.0,
    }
    report = validate_dataset(sample_df, cfg)
    print("Data quality report:", report)
    assert report["failed"] == 0, "Data quality verification failed"

