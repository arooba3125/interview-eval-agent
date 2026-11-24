from pathlib import Path

import pytest

from ie_models.speech_to_text import AudioDecodeError, EmptyAudioError, ModelLoadError, transcribe

MODEL_DIR = Path(__file__).resolve().parents[1] / "checkpoints" / "faster-whisper-base.en"


def test_empty_audio_is_rejected_before_loading(tmp_path) -> None:
    with pytest.raises(EmptyAudioError):
        transcribe(b"", tmp_path / "no-model")


def test_missing_model_folder(tmp_path) -> None:
    with pytest.raises(ModelLoadError, match="not found"):
        transcribe(b"some bytes", tmp_path / "no-model")


@pytest.mark.skipif(not (MODEL_DIR / "model.bin").is_file(), reason="faster-whisper-base.en not downloaded")
def test_undecodable_audio() -> None:
    pytest.importorskip("faster_whisper")
    with pytest.raises(AudioDecodeError):
        transcribe(b"not audio" * 20, MODEL_DIR)


@pytest.mark.skipif(not (MODEL_DIR / "model.bin").is_file(), reason="faster-whisper-base.en not downloaded")
def test_silence_gives_empty_transcript() -> None:
    av = pytest.importorskip("av")
    import io

    import numpy as np

    # Two seconds of silence, encoded as webm/opus like a browser recording.
    buf = io.BytesIO()
    out = av.open(buf, "w", format="webm")
    stream = out.add_stream("libopus", rate=48000)
    stream.layout = "mono"
    frame = av.AudioFrame.from_ndarray(np.zeros((1, 96000), dtype=np.int16), format="s16", layout="mono")
    frame.sample_rate = 48000
    for p in stream.encode(frame):
        out.mux(p)
    for p in stream.encode(None):
        out.mux(p)
    out.close()

    result = transcribe(buf.getvalue(), MODEL_DIR)
    assert result.text == ""
    assert 1.5 < result.duration_s < 2.5
