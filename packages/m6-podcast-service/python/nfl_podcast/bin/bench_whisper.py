"""Manual Whisper bench (spec §3 Phase 3, "Bench task").

Not run in CI — invoked once on M6 with a hand-picked 60-min sample to pick
the daily-driver Whisper model. Records WER (vs a human-edited reference
transcript) and wall-clock time.

Usage:
    python -m nfl_podcast.bin.bench_whisper \\
        --audio /var/lib/nfl/audio/<sample>.mp3 \\
        --reference /var/lib/nfl/transcripts/<sample>.reference.txt \\
        --models large-v3 large-v3-turbo distil-large-v3 \\
        --out /var/lib/nfl/bench/<sample>.json

Default winner per spec: ``large-v3-turbo`` unless WER delta vs ``large-v3``
exceeds 2 percentage points.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

from nfl_podcast.transcribe import (
    load_faster_whisper_backend,
    transcribe_audio,
    write_outputs,
)


_TOKEN_RE = re.compile(r"[A-Za-z0-9']+")


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def _wer(reference: str, hypothesis: str) -> float:
    """Word error rate via Levenshtein distance on token streams.

    Returns 0..1 (or higher if hypothesis adds many words). Pure-python; the
    bench audio is 60 min so the dynamic-programming table fits in memory.
    """
    ref = _tokens(reference)
    hyp = _tokens(hypothesis)
    n, m = len(ref), len(hyp)
    if n == 0:
        return 0.0 if m == 0 else 1.0
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        curr = [i] + [0] * m
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            curr[j] = min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            )
        prev = curr
    return prev[m] / n


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Bench Whisper models on a sample episode.")
    p.add_argument("--audio", required=True)
    p.add_argument("--reference", required=True, help="Path to human-edited reference transcript")
    p.add_argument(
        "--models",
        nargs="+",
        default=["large-v3", "large-v3-turbo", "distil-large-v3"],
    )
    p.add_argument("--model-dir", default="/var/lib/nfl/models")
    p.add_argument("--out", required=True)
    p.add_argument(
        "--scratch",
        default=None,
        help="Working dir for transcription outputs (default: /tmp/bench-whisper)",
    )
    args = p.parse_args(argv)

    reference = Path(args.reference).read_text(encoding="utf-8")
    scratch_root = Path(args.scratch) if args.scratch else Path("/tmp/bench-whisper")
    scratch_root.mkdir(parents=True, exist_ok=True)

    results: list[dict] = []
    for model_name in args.models:
        print(f"[bench] running {model_name}…")
        backend = load_faster_whisper_backend(
            model_name=model_name,
            model_dir=args.model_dir,
        )
        t0 = time.monotonic()
        result = transcribe_audio(
            args.audio,
            backend=backend,
            model_name=model_name,
            work_dir=scratch_root / model_name,
        )
        wall_sec = time.monotonic() - t0
        write_outputs(
            result,
            episode_id=f"bench-{model_name}",
            out_dir=scratch_root / "transcripts",
        )
        wer = _wer(reference, result.text)
        ref_word_count = len(_tokens(reference))
        hyp_word_count = len(_tokens(result.text))
        results.append(
            {
                "model": model_name,
                "wall_sec": round(wall_sec, 2),
                "audio_duration_sec": result.audio_duration_sec,
                "rtf": round(wall_sec / result.audio_duration_sec, 3)
                if result.audio_duration_sec
                else None,
                "wer": round(wer, 4),
                "ref_word_count": ref_word_count,
                "hyp_word_count": hyp_word_count,
                "word_count_delta_pct": round(
                    (hyp_word_count - ref_word_count) / max(ref_word_count, 1) * 100, 2
                ),
                "chunked": result.chunked,
                "segment_count": len(result.segments),
            }
        )
        print(f"  WER={wer:.3f}  wall={wall_sec:.1f}s  rtf={results[-1]['rtf']}")

    # Recommend a winner per spec (default to large-v3-turbo).
    by_name = {r["model"]: r for r in results}
    winner = None
    if "large-v3-turbo" in by_name and "large-v3" in by_name:
        delta = by_name["large-v3-turbo"]["wer"] - by_name["large-v3"]["wer"]
        if delta <= 0.02:
            winner = "large-v3-turbo"
        else:
            winner = "large-v3"
    if winner is None:
        winner = min(by_name.values(), key=lambda r: r["wer"])["model"]

    summary = {
        "winner": winner,
        "results": results,
    }
    Path(args.out).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
