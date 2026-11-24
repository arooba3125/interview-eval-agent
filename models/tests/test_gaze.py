from pathlib import Path

import pytest

from ie_models.common.types import GazeFrame
from ie_models.visual_analysis import InvalidFrameError, ModelLoadError, classify, estimate_gaze, summarize

CKPT = Path(__file__).resolve().parents[1] / "checkpoints"
MODEL_DIR = CKPT / "gaze-mpiifacegaze-resnet-simple"
LANDMARKER = CKPT / "mediapipe" / "face_landmarker.task"
HAVE_MODELS = (MODEL_DIR / "model.safetensors").is_file() and LANDMARKER.is_file()


@pytest.mark.parametrize(
    ("h", "v", "expected"),
    [
        (0, 0, "toward_screen"),
        (5, -20, "toward_screen"),  # a little below the camera: looking at the screen
        (30, 0, "left"),  # image right = the candidate's own left
        (-30, 0, "right"),
        (0, 25, "up"),
        (0, -40, "down"),
    ],
)
def test_classify(h, v, expected) -> None:
    assert classify(h, v)[0] == expected


def test_summarize_majority_and_agreement() -> None:
    frames = [
        GazeFrame(True, "toward_screen", 1, -5, 0.9),
        GazeFrame(True, "toward_screen", 3, -7, 0.7),
        GazeFrame(True, "left", 30, 0, 0.8),
    ]
    r = summarize(frames)
    assert r.direction == "toward_screen"
    assert r.confidence == pytest.approx(2 / 3 * 0.8, abs=1e-3)
    assert r.horizontal_deg == 2.0


def test_summarize_no_face() -> None:
    r = summarize([GazeFrame(False), GazeFrame(False)])
    assert r.direction is None and r.confidence == 0.0 and not r.face_detected


def test_frame_count_checked_before_loading(tmp_path) -> None:
    with pytest.raises(InvalidFrameError):
        estimate_gaze([], tmp_path, tmp_path / "x")
    with pytest.raises(InvalidFrameError):
        estimate_gaze([b"x"] * 6, tmp_path, tmp_path / "x")


def test_missing_model(tmp_path) -> None:
    with pytest.raises(ModelLoadError, match="not found"):
        estimate_gaze([b"x"], tmp_path, tmp_path / "x")


@pytest.mark.skipif(not HAVE_MODELS, reason="gaze model / face landmarker not downloaded")
def test_bad_image_and_no_face() -> None:
    np = pytest.importorskip("numpy")
    cv2 = pytest.importorskip("cv2")
    with pytest.raises(InvalidFrameError):
        estimate_gaze([b"not an image"], MODEL_DIR, LANDMARKER)
    ok, blank = cv2.imencode(".jpg", np.full((240, 320, 3), 128, np.uint8))
    r = estimate_gaze([blank.tobytes()], MODEL_DIR, LANDMARKER)
    assert r.direction is None and not r.face_detected


@pytest.mark.skipif(not HAVE_MODELS, reason="gaze model / face landmarker not downloaded")
def test_sample_portrait_reads_as_toward_screen() -> None:
    mpl = pytest.importorskip("matplotlib")
    portrait = Path(mpl.get_data_path()) / "sample_data" / "grace_hopper.jpg"
    if not portrait.is_file():
        pytest.skip("matplotlib sample portrait not available")
    r = estimate_gaze([portrait.read_bytes()], MODEL_DIR, LANDMARKER)
    assert r.face_detected
    assert r.direction == "toward_screen"
    assert 0.5 <= r.confidence <= 1.0
