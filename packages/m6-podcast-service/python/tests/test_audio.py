import json
import subprocess

import pytest

from nfl_podcast import audio


def make_runner(canned: list[dict]):
    """Return a (runner, calls) pair.

    canned[i] is matched in order against subsequent runner invocations.
    Each entry is one of:
      {"stdout": "...", "stderr": "..."}              — generic
      {"argv_contains": "ffprobe", "stdout": ...}     — sanity-checked
    """
    calls: list[list[str]] = []
    idx = {"i": 0}

    def runner(argv):
        calls.append(list(argv))
        if idx["i"] >= len(canned):
            raise AssertionError(f"Unexpected runner call: {argv}")
        spec = canned[idx["i"]]
        idx["i"] += 1
        if "argv_contains" in spec:
            assert any(spec["argv_contains"] in a for a in argv), argv
        return subprocess.CompletedProcess(
            args=list(argv),
            returncode=0,
            stdout=spec.get("stdout", ""),
            stderr=spec.get("stderr", ""),
        )

    return runner, calls


def test_probe_audio_parses_ffprobe_json():
    payload = json.dumps(
        {
            "streams": [
                {"codec_type": "audio", "sample_rate": "44100", "channels": 2, "duration": "1234.5"}
            ],
            "format": {"duration": "1234.5"},
        }
    )
    runner, _ = make_runner([{"argv_contains": "ffprobe", "stdout": payload}])
    info = audio.probe_audio("foo.mp3", runner=runner)
    assert info.duration_sec == 1234.5
    assert info.sample_rate == 44100
    assert info.channels == 2


def test_probe_audio_no_audio_stream():
    payload = json.dumps({"streams": [{"codec_type": "video"}], "format": {}})
    runner, _ = make_runner([{"stdout": payload}])
    with pytest.raises(RuntimeError):
        audio.probe_audio("foo.mp4", runner=runner)


def test_normalize_to_wav_invokes_ffmpeg(tmp_path):
    runner, calls = make_runner([{"argv_contains": "ffmpeg"}])
    dst = tmp_path / "out.wav"
    audio.normalize_to_wav("input.mp3", dst, runner=runner)
    argv = calls[0]
    assert "-ac" in argv and "1" in argv
    assert "-ar" in argv and "16000" in argv
    assert str(dst) in argv


def test_detect_silences_parses_stderr():
    stderr = (
        "ffmpeg log...\n"
        "[silencedetect @ 0x1] silence_start: 60.123\n"
        "[silencedetect @ 0x1] silence_end: 61.456 | silence_duration: 1.333\n"
        "[silencedetect @ 0x1] silence_start: 1500.0\n"
        "[silencedetect @ 0x1] silence_end: 1500.8 | silence_duration: 0.8\n"
    )
    runner, _ = make_runner([{"stderr": stderr}])
    pairs = audio.detect_silences("foo.wav", runner=runner)
    assert pairs == [(60.123, 61.456), (1500.0, 1500.8)]


def test_pick_split_points_no_split_when_short():
    assert audio.pick_split_points(120.0, []) == []


def test_pick_split_points_uses_target_when_no_silence():
    # 80 min, no silences → expect ~25 min and ~50 min and ~75 min split points.
    splits = audio.pick_split_points(80 * 60, [], target=25 * 60)
    assert splits == [25 * 60, 50 * 60, 75 * 60]


def test_pick_split_points_snaps_to_silence_within_window():
    duration = 60 * 60  # 60 min → expect splits near 25min and 50min
    target = 25 * 60
    # A silence centered at 24:30, well within ±target/4 = ±6:15 of 25:00.
    silences = [(24 * 60 + 25, 24 * 60 + 35)]
    splits = audio.pick_split_points(duration, silences, target=target)
    assert len(splits) == 2
    # First split snaps to the silence midpoint.
    assert abs(splits[0] - (24 * 60 + 30)) < 0.001
    # Second falls back to the target boundary because no silence near 50min.
    assert splits[1] == 50 * 60


def test_pick_split_points_avoids_returning_endpoints():
    duration = 50 * 60
    target = 25 * 60
    splits = audio.pick_split_points(duration, [], target=target)
    for s in splits:
        assert 0 < s < duration


def test_slice_audio_no_split_returns_single_segment():
    runner, _ = make_runner([])
    segs = audio.slice_audio("src.wav", [], out_dir="/tmp/x", duration_sec=120, runner=runner)
    assert len(segs) == 1
    assert segs[0].start_sec == 0.0
    assert segs[0].duration_sec == 120


def test_slice_audio_emits_one_call_per_segment(tmp_path):
    runner, calls = make_runner([{"argv_contains": "ffmpeg"}, {"argv_contains": "ffmpeg"}])
    segs = audio.slice_audio(
        "src.wav",
        splits=[1500.0],
        out_dir=tmp_path,
        duration_sec=3000.0,
        runner=runner,
    )
    assert len(segs) == 2
    assert segs[0].start_sec == 0.0
    assert segs[0].duration_sec == 1500.0
    assert segs[1].start_sec == 1500.0
    assert segs[1].duration_sec == 1500.0
    assert len(calls) == 2
