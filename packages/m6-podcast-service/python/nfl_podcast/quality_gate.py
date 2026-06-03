"""Reducer + quality gate for extracted picks.

Spec §3 Phase 4 step 4–7.

Two phases:
  reduce_picks(...)          — dedup duplicate picks emitted by overlapping chunks
  apply_quality_gate(...)    — score each pick, drop or flag, score the episode

A pick is identified by the tuple
    (category, subject, subject_market, selection, line)
Picks with confirmation-phrase chunks are preferred over picks without.
"""

from __future__ import annotations

from dataclasses import dataclass

# Confirmation phrases — must be lowercase. Keep this list aligned with prompts.py.
CONFIRMATION_PHRASES = (
    "i'm taking",
    "give me",
    "lock",
    "i'm on",
    "best bet",
    "lay the points",
    "hammer",
    "my pick is",
    "i'll back",
    "fade",
    "play",
)

# Drop / flag thresholds.
DROP_BELOW = 0.4          # confidence < 0.4 → drop entirely
NEEDS_REVIEW_BELOW = 0.6  # confidence in [0.4, 0.6) → publish but flag

# Episode-level cloud-fallback thresholds (spec §3 Phase 4 step 7).
CLOUD_FALLBACK_QUALITY = 0.5   # mean episode quality below this triggers fallback
CLOUD_FALLBACK_FAIL_RATIO = 0.5  # >50% of LLM picks dropped/flagged also triggers


def _pick_key(p: dict) -> tuple:
    return (
        (p.get("category") or "").lower(),
        (p.get("subject") or "").lower(),
        (p.get("subject_market") or "").lower(),
        (p.get("selection") or "").lower(),
        p.get("line"),
    )


def _has_confirmation(text: str | None) -> bool:
    if not text:
        return False
    t = text.lower()
    return any(phrase in t for phrase in CONFIRMATION_PHRASES)


def reduce_picks(
    picks_per_chunk: list[tuple[int, str, list[dict]]],
) -> list[dict]:
    """Dedup picks across chunks; prefer the chunk with confirmation phrases.

    picks_per_chunk: [(chunk_idx, chunk_text, [pick_dict, ...]), ...]

    Returns a flat list of picks with ``source_chunk_idx`` set and
    a derived ``_confirmed`` boolean tagged on for the quality gate to use.
    """
    best: dict[tuple, dict] = {}
    for chunk_idx, chunk_text, picks in picks_per_chunk:
        confirmed = _has_confirmation(chunk_text)
        for p in picks:
            tagged = dict(p)
            tagged["source_chunk_idx"] = chunk_idx
            tagged["_confirmed"] = confirmed
            key = _pick_key(tagged)
            existing = best.get(key)
            if existing is None:
                best[key] = tagged
                continue
            # Prefer confirmed; tiebreak by higher confidence.
            ec = existing.get("_confirmed", False)
            tc = tagged["_confirmed"]
            if (tc and not ec) or (
                tc == ec
                and (tagged.get("confidence", 0) or 0) > (existing.get("confidence", 0) or 0)
            ):
                best[key] = tagged
    return list(best.values())


# Known team abbrs — used to bind ``subject`` to a real team for sides/totals.
NFL_TEAMS = frozenset(
    {
        "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
        "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
        "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
        "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
    }
)


def _within(value: float | None, window: list[float], tolerance: float = 3.0) -> bool:
    if value is None or not window:
        return False
    return any(abs(value - w) <= tolerance for w in window)


@dataclass
class PickGateResult:
    pick: dict          # the (possibly mutated) pick dict
    kept: bool          # False → dropped, True → kept (possibly with needs_review=True)


def score_pick(
    p: dict,
    *,
    odds_lines: dict[tuple[str, str], list[float]] | None = None,
) -> PickGateResult:
    """Compute quality_score + needs_review for a single pick.

    ``odds_lines`` maps (team1, team2) abbr pairs to a list of known book lines
    for sides/totals validation. Pass ``None`` to skip line validation (M6 will
    pass real data; tests can omit).
    """
    confidence = float(p.get("confidence") or 0.0)
    confirmed = bool(p.get("_confirmed", False))
    category = (p.get("category") or "").lower()

    score = confidence
    notes: list[str] = []

    # Confirmation phrase → +0.1 (capped at 1.0)
    if confirmed:
        score = min(1.0, score + 0.1)
    else:
        notes.append("no confirmation phrase")

    # Sides/totals: prefer when team abbrs resolve and line is in the book window.
    if category in ("spread", "total", "moneyline"):
        t1 = (p.get("team1") or "").upper()
        t2 = (p.get("team2") or "").upper()
        if t1 and t1 not in NFL_TEAMS:
            score -= 0.15
            notes.append(f"unknown team1: {p.get('team1')}")
        if t2 and t2 not in NFL_TEAMS:
            score -= 0.15
            notes.append(f"unknown team2: {p.get('team2')}")
        if odds_lines is not None and category in ("spread", "total"):
            window = (
                odds_lines.get((t1, t2))
                or odds_lines.get((t2, t1))
                or []
            )
            if window:
                if not _within(p.get("line"), window):
                    score -= 0.2
                    notes.append("line outside ±3 of book lines")
            else:
                # No book line at all is suspicious for sides/totals.
                score -= 0.1
                notes.append("no book line found for matchup")

    # Futures + props: low penalty for missing market binding (we'll get there in v1.1).
    if category in ("future", "prop") and not (p.get("subject_market") or "").strip():
        score -= 0.1
        notes.append("missing subject_market")

    score = max(0.0, min(1.0, score))

    out = dict(p)
    out.pop("_confirmed", None)
    out["quality_score"] = round(score, 3)
    if score < DROP_BELOW:
        return PickGateResult(pick=out, kept=False)
    out["needs_review"] = score < NEEDS_REVIEW_BELOW
    if notes:
        out.setdefault("_quality_notes", notes)
    return PickGateResult(pick=out, kept=True)


@dataclass
class GateOutcome:
    kept: list[dict]
    dropped: list[dict]
    episode_quality: float       # mean of kept picks' quality_score (0 if none kept)
    fail_ratio: float            # dropped + flagged / total
    needs_cloud_fallback: bool


def apply_quality_gate(
    picks: list[dict],
    *,
    odds_lines: dict[tuple[str, str], list[float]] | None = None,
) -> GateOutcome:
    kept: list[dict] = []
    dropped: list[dict] = []
    flagged = 0
    for p in picks:
        result = score_pick(p, odds_lines=odds_lines)
        if result.kept:
            kept.append(result.pick)
            if result.pick.get("needs_review"):
                flagged += 1
        else:
            dropped.append(result.pick)
    total = len(picks)
    if kept:
        mean_q = sum(p["quality_score"] for p in kept) / len(kept)
    else:
        mean_q = 0.0
    fail_ratio = (len(dropped) + flagged) / total if total else 0.0
    needs_cloud = (
        total > 0
        and (
            mean_q < CLOUD_FALLBACK_QUALITY
            or fail_ratio > CLOUD_FALLBACK_FAIL_RATIO
        )
    )
    return GateOutcome(
        kept=kept,
        dropped=dropped,
        episode_quality=round(mean_q, 3),
        fail_ratio=round(fail_ratio, 3),
        needs_cloud_fallback=needs_cloud,
    )
