"""Transcript chunking.

We avoid a hard tokenizer dependency (tiktoken pulls Rust) and use a
character-budget heuristic: ~4 chars/token for English transcripts, which
is close enough for chunk sizing. Chunks are split on sentence boundaries
when possible, with a configurable token budget and overlap.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Empirically ~4 chars per token for spoken-English transcripts. Off by 10%
# is fine — the LLM's context window is much bigger than our chunks.
CHARS_PER_TOKEN = 4

# Sentence break detection. Audio transcripts often lack punctuation, so we
# also fall back to splitting on long pauses ("..." or " - ") and double newlines.
_SENT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z])|\n{2,}")


@dataclass(frozen=True)
class Chunk:
    idx: int
    text: str
    start_char: int  # offset into the original transcript
    end_char: int


def split_sentences(text: str) -> list[str]:
    """Best-effort sentence split. Empty input yields []."""
    text = text.strip()
    if not text:
        return []
    parts = [p.strip() for p in _SENT_RE.split(text) if p and p.strip()]
    return parts or [text]


def chunk_transcript(
    text: str,
    *,
    target_tokens: int = 6000,
    overlap_tokens: int = 400,
) -> list[Chunk]:
    """Split a transcript into overlapping ~target_tokens windows.

    Sentences are kept whole when possible. The final chunk may be shorter
    than target_tokens. Overlap is measured in characters via
    CHARS_PER_TOKEN.
    """
    if target_tokens <= 0:
        raise ValueError("target_tokens must be > 0")
    if overlap_tokens < 0 or overlap_tokens >= target_tokens:
        raise ValueError("overlap_tokens must be in [0, target_tokens)")

    target_chars = target_tokens * CHARS_PER_TOKEN
    overlap_chars = overlap_tokens * CHARS_PER_TOKEN

    sentences = split_sentences(text)
    if not sentences:
        return []

    # Build (sentence, absolute_offset) pairs by re-locating in source.
    sent_offsets: list[tuple[str, int]] = []
    cursor = 0
    for s in sentences:
        idx = text.find(s, cursor)
        if idx < 0:
            idx = cursor  # shouldn't happen, but be defensive
        sent_offsets.append((s, idx))
        cursor = idx + len(s)

    chunks: list[Chunk] = []
    i = 0
    next_idx = 0
    while i < len(sent_offsets):
        start_offset = sent_offsets[i][1]
        buf_parts: list[str] = []
        buf_len = 0
        j = i
        while j < len(sent_offsets) and buf_len + len(sent_offsets[j][0]) + 1 <= target_chars:
            buf_parts.append(sent_offsets[j][0])
            buf_len += len(sent_offsets[j][0]) + 1
            j += 1
        if not buf_parts:
            # Single sentence longer than target — emit it whole rather than splitting.
            buf_parts = [sent_offsets[j][0]]
            j += 1
        end_offset = sent_offsets[j - 1][1] + len(sent_offsets[j - 1][0])
        chunks.append(
            Chunk(
                idx=next_idx,
                text=" ".join(buf_parts),
                start_char=start_offset,
                end_char=end_offset,
            )
        )
        next_idx += 1
        if j >= len(sent_offsets):
            break
        # Roll back i by overlap_chars worth of sentences.
        rollback = 0
        k = j
        while k > i and rollback < overlap_chars:
            rollback += len(sent_offsets[k - 1][0]) + 1
            k -= 1
        i = max(k, i + 1)  # ensure forward progress
    return chunks
