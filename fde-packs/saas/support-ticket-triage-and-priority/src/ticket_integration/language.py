"""Multilingual handling: detect the language, and map the customer's taxonomy per language. A heuristic detector is enough to *route* (the classifier model handles content); anything it is unsure of goes to the multilingual path."""
from __future__ import annotations

import re
from typing import Dict, Optional, Tuple

STOP = {"en": {"the", "and", "is", "to", "of", "my", "not", "can", "please", "with"}, "es": {"el", "la", "no", "de", "que", "puedo", "mi", "por", "con", "los", "al"}, "de": {"der", "die", "und", "ich", "nicht", "das", "mit", "kann", "ist", "zu"},
        "fr": {"le", "la", "et", "je", "ne", "pas", "de", "mon", "pour", "avec"}, "pt": {"o", "a", "não", "de", "que", "meu", "com", "para", "uma"}}
SCRIPTS = [("ja", r"[぀-ヿ]"), ("zh", r"[一-鿿]"), ("ko", r"[가-힯]"), ("ar", r"[؀-ۿ]"), ("hi", r"[ऀ-ॿ]"), ("ru", r"[Ѐ-ӿ]")]


def detect(text: str) -> Tuple[str, float]:
    for lang, rx in SCRIPTS:
        hits = len(re.findall(rx, text))
        if hits and hits / max(len(text), 1) > 0.2:
            return lang, 0.9
    words = re.findall(r"\w+", text.lower())
    if not words:
        return "unknown", 0.0
    scores = {l: sum(1 for w in words if w in s) / len(words) for l, s in STOP.items()}
    best = max(scores, key=scores.get)
    return (best, round(min(scores[best] * 4, 0.95), 2)) if scores[best] > 0 else ("unknown", 0.0)


class Taxonomy:
    """The customer's categories, with the label each language's agents use and a per-language confidence floor below which a human picks."""

    def __init__(self, categories: Dict[str, Dict[str, str]], floors: Optional[Dict[str, float]] = None):
        self.categories, self.floors = categories, floors or {"en": 0.6}

    def label(self, cat: str, lang: str) -> str:
        return self.categories[cat].get(lang, self.categories[cat]["en"])

    def needs_human(self, lang: str, confidence: float) -> bool:
        return confidence < self.floors.get(lang, 0.75)
