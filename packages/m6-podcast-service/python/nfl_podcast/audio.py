"""ffmpeg helpers for the transcription pipeline.

Two responsibilities:
  1. Normalize an arbitrary audio file (mp3 / m4a / wav) to 16 kHz mono WAV.
  2. Split a long audio into ~25-min chunks at silence boundaries when total
     duration exceeds 30 min, so we never feed Whisper a >30 min file.

ffmpeg is called via subprocess. The runner is injected to keep tests offline.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Sequence

# Default segmentation parameters (spec §3 Phase 3).
TARGET_SAMPLE_RATE = 16_000
LONG_AUDIO_THRESHOLD_SEC = 30 * 60
TARGET_SEGMENT_SEC = 25 * 60
SILENCE_DB = "-30dB"
SILENCE_MIN_SEC = 0.5


# Subprocess runner: (argv) -> CompletedProcess. Defaults to subprocess.run.
Runner = Callable[[Sequence[str]], "subprocess.CompletedProcess[str]"]


def _default_runner(argv: Sequence[str]) -> "subprocess.CompletedProcess[str]":
    return subprocess.run(
        list(argv),
        check=True,
        capture_output=True,
        text=True,
    )


@dataclass(frozen=True)
class AudioInfo:
    duration_sec: float
    sample_rate: int
    channels: int


def probe_audio(path: str | Path, *, runner: Runner | None = None) -> AudioInfo:
    """Return duration / sample-rate / channels via ffprobe."""
    runner = runner or _default_runner
    proc = runner(
        [
            "ffprobe",
            "-v", "error",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            str(path),
        ]
    )
    data = json.loads(proc.stdout)
    audio_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "audio"),
        None,
    )
    if audio_stream is None:
        raise RuntimeError(f"No audio stream found in {path}")
    duration = float(data.get("format", {}).get("duration") or audio_stream.get("duration") or 0)
    return AudioInfo(
        duration_sec=duration,
        sample_rate=int(audio_stream.get("sample_rate") or 0),
        channels=int(audio_stream.get("channels") or 0),
    )


def normalize_to_wav(
    src: str | Path,
    dst: str | Path,
    *,
    sample_rate: int = TARGET_SAMPLE_RATE,
    runner: Runner | None = None,
) -> Path:
    """Re-encode ``src`` to 16 kHz mono PCM WAV at ``dst``. Overwrites dst."""
    runner = runner or _default_runner
    dst_path = Path(dst)
    runner(
        [
            "ffmpeg",
            "-y",
            "-i", str(src),
            "-ac", "1",
            "-ar", str(sample_rate),
            "-vn",
            "-c:a", "pcm_s16le",
            str(dst_path),
        ]
    )
    return dst_path


_SILENCE_RE = re.compile(r"silence_(start|end):\s*([0-9.]+)")


def detect_silences(
    path: str | Path,
    *,
    db: str = SILENCE_DB,
    min_sec: float = SILENCE_MIN_SEC,
    runner: Runner | None = None,
) -> list[tuple[float, float]]:
    """Return ``[(start, end)]`` of silent regions in seconds."""
    runner = runner or _default_runner
    proc = runner(
        [
            "ffmpeg",
            "-i", str(path),
            "-af", f"silencedetect=noise={db}:d={min_sec}",
            "-f", "null",
            "-",
        ]
    )
    # ffmpeg writes silence info to stderr.
    text = (proc.stderr or "") + (proc.stdout or "")
    starts: list[float] = []
    ends: list[float] = []
    for m in _SILENCE_RE.finditer(text):
        kind, val = m.group(1), float(m.group(2))
        (starts if kind == "start" else ends).append(val)
    pairs: list[tuple[float, float]] = []
    for s, e in zip(starts, ends):
        if e > s:
            pairs.append((s, e))
    return pairs


def pick_split_points(
    duration_sec: float,
    silences: list[tuple[float, float]],
    *,
    target: float = TARGET_SEGMENT_SEC,
) -> list[float]:
    """Choose split timestamps near each ``target`` boundary.

    Strategy: walk every ``target`` seconds; pick the silence midpoint
    closest to that mark within ±target/4. If no silence is in range,
    fall back to the exact target time (forces a split). Always strictly
    increasing; never returns 0 or duration.
    """
    if duration_sec <= target:
        return []
    splits: list[float] = []
    cursor = target
    last = 0.0
    while cursor < duration_sec:
        window = target / 4.0
        candidates = [
            (s + e) / 2.0
            for s, e in silences
            if abs(((s + e) / 2.0) - cursor) <= window
            and (s + e) / 2.0 > last + 1.0
        ]
        if candidates:
            chosen = min(candidates, key=lambda t: abs(t - cursor))
        else:
            chosen = cursor
        if chosen <= last + 1.0:
            chosen = last + 1.0
        if chosen >= duration_sec - 1.0:
            break
        splits.append(round(chosen, 3))
        last = chosen
        cursor += target
    return splits


@dataclass(frozen=True)
class AudioSegment:
    idx: int
    path: Path
    start_sec: float  # offset of this segment in the original file
    duration_sec: float


def slice_audio(
    src: str | Path,
    splits: list[float],
    *,
    out_dir: str | Path,
    duration_sec: float,
    runner: Runner | None = None,
) -> list[AudioSegment]:
    """Cut ``src`` at the given absolute split timestamps via ffmpeg.

    Returns one :class:`AudioSegment` per output, including segment offsets.
    If ``splits`` is empty, returns a single-segment list pointing at ``src``.
    """
    runner = runner or _default_runner
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    if not splits:
        return [AudioSegment(idx=0, path=Path(src), start_sec=0.0, duration_sec=duration_sec)]

    boundaries = [0.0, *splits, duration_sec]
    segments: list[AudioSegment] = []
    src_str = str(src)
    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        seg_path = out_dir_path / f"segment_{i:02d}.wav"
        runner(
            [
                "ffmpeg",
                "-y",
                "-i", src_str,
                "-ss", f"{start:.3f}",
                "-to", f"{end:.3f}",
                "-c", "copy",
                str(seg_path),
            ]
        )
        segments.append(
            AudioSegment(
                idx=i,
                path=seg_path,
                start_sec=start,
                duration_sec=end - start,
            )
        )
    return segments
