from nfl_podcast.chunk import chunk_transcript, split_sentences


def test_split_sentences_handles_basic_punctuation():
    s = "Hello. How are you? I am fine!"
    assert split_sentences(s) == ["Hello.", "How are you?", "I am fine!"]


def test_split_sentences_empty():
    assert split_sentences("") == []
    assert split_sentences("   ") == []


def test_chunk_transcript_single_short():
    text = "The Chiefs are favored. Mahomes is healthy."
    chunks = chunk_transcript(text, target_tokens=100, overlap_tokens=10)
    assert len(chunks) == 1
    assert chunks[0].idx == 0
    assert "Chiefs" in chunks[0].text


def test_chunk_transcript_splits_long_text():
    # Build a deterministic transcript >> target.
    sentences = [f"Sentence number {i} about the game." for i in range(200)]
    text = " ".join(sentences)
    chunks = chunk_transcript(text, target_tokens=200, overlap_tokens=20)
    assert len(chunks) >= 2
    # Indices are sequential.
    assert [c.idx for c in chunks] == list(range(len(chunks)))
    # Adjacent chunks share at least one sentence (overlap).
    first_tail = chunks[0].text.split(". ")[-3:]
    second_head = chunks[1].text.split(". ")[:5]
    assert any(s.strip() and s.strip() in chunks[1].text for s in first_tail) or any(
        s.strip() in chunks[0].text for s in second_head
    )


def test_chunk_transcript_invalid_overlap():
    import pytest

    with pytest.raises(ValueError):
        chunk_transcript("hi.", target_tokens=10, overlap_tokens=10)
    with pytest.raises(ValueError):
        chunk_transcript("hi.", target_tokens=0, overlap_tokens=0)
