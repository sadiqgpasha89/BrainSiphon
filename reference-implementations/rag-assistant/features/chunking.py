"""Document -> retrievable passages, plus the screening that keeps instruction-like text out of the index.

Chunks follow paragraph boundaries and carry a short overlap so that a fact split across two paragraphs is still retrievable.
The screen is a deliberately simple first layer (patterns for text addressed to the model). It is not the only defence:
retrieved text is passed to the generator strictly as quoted data, and every answer sentence must be supported by the chunk
it cites (serving/answer.py).
"""

from __future__ import annotations

import re

_INJECTION = re.compile(
    r"ignore (all |any )?(the )?(previous|prior|above) (instructions|prompts)|disregard (the|your) (system|previous)"
    r"|you are now (in|a|an)\b|reveal (the|your|any) .{0,40}(key|password|secret|token|prompt)|system prompt",
    re.IGNORECASE,
)
_SENT = re.compile(r"(?<=[.!?])\s+")


def looks_like_injection(text: str) -> bool:
    return bool(_INJECTION.search(text))


def sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT.split(text.replace("\n", " ")) if s.strip()]


def chunk(body: str, target_words: int, overlap_words: int) -> list[str]:
    """Greedy paragraph packing up to about `target_words`, each chunk starting with the last sentence(s) of the previous one."""
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    out: list[str] = []
    current: list[str] = []
    for p in paragraphs:
        words = sum(len(x.split()) for x in current)
        if current and words + len(p.split()) > target_words:
            out.append(" ".join(current))
            # overlap: carry whole trailing sentences (never a fragment) up to `overlap_words`
            tail: list[str] = []
            for s in reversed(sentences(" ".join(current))):
                if sum(len(x.split()) for x in tail) + len(s.split()) > overlap_words:
                    break
                tail.insert(0, s)
            current = [" ".join(tail)] if tail else []
        current.append(p)
    if current:
        out.append(" ".join(current))
    return out
