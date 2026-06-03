"""Tests for the transcribe pipeline with mocked ffmpeg + Whisper."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from nfl_podcast import audio, transcribe
from nfl_podcast.transcribe import WhisperSegment


class FakeBackend:
    """Returns canned segments per audio path."""

    def __init__(self, by_path: dict[str, list[WhisperSegment]] | None = None,
                 default: list[WhisperSegment] | None = None):
        self.by_path = by_path or {}
        self.default = default or []
        self.calls: list[Path] = []

    def transcribe(self, audio_path):
        path = Path(audio_path)
        self.calls.append(path)
        # Match by exact path or by filename if absolute paths drift in tmp dirs.
        return self.by_path.get(str(path), self.default)


def _ffprobe_payload(duration: float) -> str:
    return json.dumps(
        {
            "streams": [{"codec_type": "audio", "sample_rate": "16000", "channels": 1,
                         "duration": str(duration)}],
            "format": {"duration": str(duration)},
        }
    )


def make_runner(events: list[dict]):
    """events is an ordered list; each entry returns a CompletedProcess."""
    idx = {"i": 0}
    calls: list[list[str]] = []

    def runner(argv):
        calls.append(list(argv))
        if idx["i"] >= len(events):
            return subprocess.CompletedProcess(args=list(argv), returncode=0, stdout="", stderr="")
        spec = events[idx["i"]]
        idx["i"] += 1
        return subprocess.CompletedProcess(
            args=list(argv),
            returncode=0,
            stdout=spec.get("stdout", ""),
            stderr=spec.get("stderr", ""),
        )

    return runner, calls


def test_transcribe_short_file_no_chunking(tmp_path):
    src = tmp_path / "ep.mp3"
    src.write_bytes(b"fake")
    backend = FakeBackend(
        default=[
            WhisperSegment(start=0.0, end=5.0, text="Hello world."),
            WhisperSegment(start=5.0, end=10.0, text="Second sentence."),
        ]
    )
    runner, _ = make_runner(
        [
            {"stdout": ""},                              # ffmpeg normalize
            {"stdout": _ffprobe_payload(900.0)},         # ffprobe (15 min, no chunk)
        ]
    )
    result = transcribe.transcribe_audio(
        src,
        backend=backend,
        model_name="large-v3-turbo",
        work_dir=tmp_path / "work",
        runner=runner,
    )
    assert result.chunked is False
    assert len(result.segments) == 2
    assert result.segments[0]["start"] == 0.0
    assert "Hello world." in result.text


def test_transcribe_long_file_splits_and_offsets_timestamps(tmp_path):
    src = tmp_path / "ep.mp3"
    src.write_bytes(b"fake")
    duration = 60 * 60  # 60 min
    runner, _ = make_runner(
        [
            {"stdout": ""},                              # normalize
            {"stdout": _ffprobe_payload(duration)},      # probe
            {"stderr": ""},                              # silencedetect — no silences
            {"stdout": ""},                              # ffmpeg slice 0
            {"stdout": ""},                              # ffmpeg slice 1
            {"stdout": ""},                              # ffmpeg slice 2 (only 2 splits → 3 segs? actually 25/50/* w/ duration 60 → 2 splits)
        ]
    )
    backend = FakeBackend(default=[WhisperSegment(start=0.0, end=10.0, text="chunk text.")])
    result = transcribe.transcribe_audio(
        src,
        backend=backend,
        model_name="large-v3-turbo",
        work_dir=tmp_path / "work",
        runner=runner,
    )
    assert result.chunked is True
    # All segments should have absolute timestamps offset by chunk start.
    starts = [s["start"] for s in result.segments]
    # 60 min / 25 min target → splits at 1500s and 3000s → 3 chunks; second chunk
    # contributes a segment offset by 1500.
    assert any(s >= 1500 for s in starts)
    # Whisper backend was called once per chunk.
    assert len(backend.calls) >= 2


def test_write_outputs_creates_txt_and_segments(tmp_path):
    result = transcribe.TranscriptionResult(
        text="hello world",
        segments=[{"start": 0.0, "end": 1.0, "text": "hello world", "segment_idx": 0}],
        audio_duration_sec=1.0,
        model="large-v3-turbo",
        chunked=False,
    )
    txt, seg = transcribe.write_outputs(result, episode_id="ep-1", out_dir=tmp_path)
    assert txt.read_text(encoding="utf-8").strip() == "hello world"
    payload = json.loads(seg.read_text(encoding="utf-8"))
    assert payload["episode_id"] == "ep-1"
    assert payload["model"] == "large-v3-turbo"
    assert len(payload["segments"]) == 1


def test_transcribe_rejects_non_monotonic(tmp_path, monkeypatch):
    src = tmp_path / "ep.mp3"
    src.write_bytes(b"fake")
    runner, _ = make_runner(
        [
            {"stdout": ""},
            {"stdout": _ffprobe_payload(60.0)},
        ]
    )

    class BadBackend:
        def transcribe(self, audio_path):
            return [
                WhisperSegment(start=10.0, end=20.0, text="late"),
                WhisperSegment(start=0.0, end=1.0, text="rewind"),
            ]

    with pytest.raises(RuntimeError):
        transcribe.transcribe_audio(
            src,
            backend=BadBackend(),
            model_name="large-v3-turbo",
            work_dir=tmp_path / "work",
            runner=runner,
        )


def test_transcribe_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        transcribe.transcribe_audio(
            tmp_path / "no.mp3",
            backend=FakeBackend(),
            model_name="x",
        )
