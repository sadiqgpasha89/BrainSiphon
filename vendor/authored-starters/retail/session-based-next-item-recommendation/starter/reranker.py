"""Diversity-aware session reranker with category diversity caps and history deduplication."""

from __future__ import annotations

from typing import Dict, List, Tuple

def rerank_candidates(
    candidates: List[Tuple[int, float, str]],
    history: List[int],
    max_per_category: int = 2,
    top_k: int = 5,
) -> List[Tuple[int, float, str]]:
    """Rerank candidates applying diversity guardrails.

    Candidates: list of (item_id, score, category).
    - Filters out items already seen in current session history
    - Limits items from the same category to `max_per_category`
    """
    seen = set(history)
    category_counts: Dict[str, int] = {}
    selected: List[Tuple[int, float, str]] = []

    # Sort descending by candidate score
    sorted_candidates = sorted(candidates, key=lambda x: x[1], reverse=True)

    for item_id, score, cat in sorted_candidates:
        if item_id in seen:
            continue
        if category_counts.get(cat, 0) >= max_per_category:
            continue

        selected.append((item_id, score, cat))
        category_counts[cat] = category_counts.get(cat, 0) + 1

        if len(selected) >= top_k:
            break

    return selected

