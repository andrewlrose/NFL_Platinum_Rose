"""JSON schema for an extracted pick (spec §4).

Used for Ollama response validation and as the contract for downstream
consumers (vault rebuilder, daily brief, BETTING agent tools).
"""

from __future__ import annotations

PICK_SCHEMA: dict = {
    "type": "object",
    "required": [
        "category",
        "subject",
        "selection",
        "confidence",
    ],
    "properties": {
        "category": {
            "type": "string",
            "enum": ["spread", "total", "moneyline", "future", "prop"],
        },
        "subject": {"type": "string", "minLength": 1},
        "subject_market": {"type": ["string", "null"]},
        "selection": {"type": "string", "minLength": 1},
        "team1": {"type": ["string", "null"]},
        "team2": {"type": ["string", "null"]},
        "line": {"type": ["number", "null"]},
        "odds_american": {"type": ["integer", "null"]},
        "summary": {
            "type": ["string", "null"],
            "maxLength": 200,
        },
        "units": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 10,
        },
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
        },
        "season": {"type": ["integer", "null"]},
        "week": {"type": ["integer", "null"]},
        "game_date": {"type": ["string", "null"]},
        "source_chunk_idx": {"type": ["integer", "null"]},
        "source_timestamp_secs": {"type": ["number", "null"]},
        # Set by the quality gate, not by the LLM:
        "quality_score": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 1,
        },
        "needs_review": {"type": ["boolean", "null"]},
    },
    "additionalProperties": True,
}

EXTRACTION_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "required": ["picks"],
    "properties": {
        "picks": {"type": "array", "items": PICK_SCHEMA},
        "intel": {"type": "array", "items": {"type": "string"}},
    },
    "additionalProperties": True,
}
