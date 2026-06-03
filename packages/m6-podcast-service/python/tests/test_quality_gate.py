from nfl_podcast.quality_gate import (
    apply_quality_gate,
    reduce_picks,
    score_pick,
)


def _pick(**over):
    base = {
        "category": "spread",
        "subject": "KC",
        "subject_market": None,
        "selection": "KC",
        "team1": "KC",
        "team2": "LV",
        "line": -3.5,
        "odds_american": None,
        "summary": "x",
        "units": 1,
        "confidence": 0.7,
    }
    base.update(over)
    return base


def test_reduce_picks_dedups_across_chunks():
    p1 = _pick()
    p2 = _pick(confidence=0.9)
    out = reduce_picks(
        [
            (0, "no phrase here", [p1]),
            (1, "I'm taking the Chiefs", [p2]),
        ]
    )
    assert len(out) == 1
    # Confirmed chunk wins even though its base confidence post-merge equals.
    assert out[0]["source_chunk_idx"] == 1


def test_reduce_picks_preserves_distinct_keys():
    a = _pick(category="spread", line=-3.5)
    b = _pick(category="total", subject="KC@LV", selection="OVER", line=47.5)
    out = reduce_picks([(0, "give me", [a, b])])
    assert len(out) == 2


def test_score_pick_drops_low_confidence():
    res = score_pick(_pick(confidence=0.3, _confirmed=False))
    assert res.kept is False
    assert res.pick["quality_score"] < 0.4


def test_score_pick_flags_mid_band():
    res = score_pick(_pick(confidence=0.5, _confirmed=False, team1="KC", team2="LV"))
    assert res.kept is True
    assert res.pick["needs_review"] is True


def test_score_pick_publishes_high_confidence_with_confirmation():
    res = score_pick(_pick(confidence=0.75, _confirmed=True))
    assert res.kept is True
    assert res.pick["needs_review"] is False
    assert res.pick["quality_score"] >= 0.75


def test_score_pick_penalizes_unknown_team():
    res = score_pick(_pick(confidence=0.8, _confirmed=True, team1="ZZZ"))
    assert "unknown team1" in (res.pick.get("_quality_notes") or [""])[0] or any(
        "unknown team1" in n for n in res.pick.get("_quality_notes", [])
    )


def test_score_pick_line_window_penalty():
    res = score_pick(
        _pick(confidence=0.8, _confirmed=True, line=-10.0),
        odds_lines={("KC", "LV"): [-3.0, -3.5, -4.0]},
    )
    # -10 is well outside ±3 of -3..-4 → should drop the score noticeably.
    assert res.pick["quality_score"] < 0.8
    assert any("line outside" in n for n in res.pick.get("_quality_notes", []))


def test_apply_quality_gate_episode_summary():
    picks = [
        _pick(confidence=0.8, _confirmed=True),                # keep, clean
        _pick(category="total", selection="OVER", line=47.5,
              confidence=0.5, _confirmed=False),               # flag
        _pick(category="moneyline", selection="LV",
              confidence=0.2, _confirmed=False),               # drop
    ]
    out = apply_quality_gate(picks)
    assert len(out.kept) == 2
    assert len(out.dropped) == 1
    assert 0.0 < out.episode_quality <= 1.0


def test_apply_quality_gate_triggers_cloud_fallback_on_low_quality():
    picks = [
        _pick(confidence=0.45, _confirmed=False),
        _pick(category="total", selection="OVER", line=47.5,
              confidence=0.45, _confirmed=False),
    ]
    out = apply_quality_gate(picks)
    assert out.needs_cloud_fallback is True
