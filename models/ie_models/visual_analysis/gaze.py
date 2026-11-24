"""Approximate gaze direction from camera frames (appearance-based, full-face).

Pipeline (after Zhang et al., MPIIFaceGaze; implementation follows ptgaze, MIT):
  1. MediaPipe Face Landmarker finds 468 face landmarks.
  2. OpenCV solvePnP fits a 3D face template to them -> head pose.
  3. The face is warped to a "normalised" 224x224 view (virtual camera facing the face).
  4. A pretrained ResNet-based model (trained on MPIIFaceGaze) predicts gaze pitch/yaw.
  5. The gaze vector is rotated back to the real camera and mapped to a coarse direction.

Everything runs locally on the CPU and frames are only held in memory.

LICENCE: the model weights were trained on MPIIFaceGaze (derived from MPIIGaze), distributed
under CC BY-NC-SA 4.0 for non-commercial scientific use only. Cite:
  X. Zhang, Y. Sugano, M. Fritz, A. Bulling. Appearance-based Gaze Estimation in the Wild. CVPR 2015.
  X. Zhang, Y. Sugano, M. Fritz, A. Bulling. It's Written All Over Your Face: Full-Face
  Appearance-Based Gaze Estimation. CVPRW 2017.

The output is an approximate visual observation of where the eyes point. It is not an
assessment of confidence, anxiety, passion, honesty, knowledge or job suitability.
"""
from __future__ import annotations

import math
import threading
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np

from ie_models.common.types import GazeFrame, GazeResult

MAX_FRAMES = 5
MAX_SIDE_PX = 1280  # larger frames are scaled down before analysis
NORMALIZED_SIZE = 224
# Virtual camera of the MPIIFaceGaze normalisation (ptgaze normalized_camera_params/mpiifacegaze.yaml).
NORMALIZED_CAMERA = np.array([[1600.0, 0.0, 112.0], [0.0, 1600.0, 112.0], [0.0, 0.0, 1.0]])
NORMALIZED_DISTANCE = 1.0
# BGR channel order, ImageNet statistics (as in training).
MEAN_BGR = np.array([0.406, 0.456, 0.485], dtype=np.float32)
STD_BGR = np.array([0.225, 0.224, 0.229], dtype=np.float32)

# Direction bands in degrees, from the camera's point of view. A webcam usually sits above
# the screen, so looking at the screen reads as slightly downward.
CENTER_H_DEG = 15.0
CENTER_UP_DEG = 12.0
CENTER_DOWN_DEG = 25.0

DIRECTIONS = ("toward_screen", "left", "right", "up", "down")


class GazeError(Exception):
    """Base class for gaze estimation errors."""


class InvalidFrameError(GazeError, ValueError):
    """No frames, too many frames, or a frame that is not a decodable image."""


class ModelLoadError(GazeError, RuntimeError):
    """The gaze model or face landmarker could not be loaded."""


# --------------------------------------------------------------------------- network

def _build_network():
    """Truncated ResNet-18 (stages 1-3) with a spatial-weights head; keys match the checkpoint."""
    import torch
    from torch import nn
    import torch.nn.functional as F  # noqa: N812

    class BasicBlock(nn.Module):
        def __init__(self, cin: int, cout: int, stride: int) -> None:
            super().__init__()
            self.conv1 = nn.Conv2d(cin, cout, 3, stride, 1, bias=False)
            self.bn1 = nn.BatchNorm2d(cout)
            self.conv2 = nn.Conv2d(cout, cout, 3, 1, 1, bias=False)
            self.bn2 = nn.BatchNorm2d(cout)
            self.relu = nn.ReLU(inplace=True)
            self.downsample = None
            if stride != 1 or cin != cout:
                self.downsample = nn.Sequential(nn.Conv2d(cin, cout, 1, stride, bias=False), nn.BatchNorm2d(cout))

        def forward(self, x):
            identity = x if self.downsample is None else self.downsample(x)
            out = self.relu(self.bn1(self.conv1(x)))
            out = self.bn2(self.conv2(out))
            return self.relu(out + identity)

    class Trunk(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.conv1 = nn.Conv2d(3, 64, 7, 2, 3, bias=False)
            self.bn1 = nn.BatchNorm2d(64)
            self.relu = nn.ReLU(inplace=True)
            self.maxpool = nn.MaxPool2d(3, 2, 1)
            self.layer1 = nn.Sequential(BasicBlock(64, 64, 1), BasicBlock(64, 64, 1))
            self.layer2 = nn.Sequential(BasicBlock(64, 128, 2), BasicBlock(128, 128, 1))
            self.layer3 = nn.Sequential(BasicBlock(128, 256, 2), BasicBlock(256, 256, 1))

        def forward(self, x):
            x = self.maxpool(self.relu(self.bn1(self.conv1(x))))
            return self.layer3(self.layer2(self.layer1(x)))

    class GazeNet(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.feature_extractor = Trunk()
            self.conv = nn.Conv2d(256, 1, 1)
            self.fc = nn.Linear(256 * 14 * 14, 2)  # 224x224 input -> 14x14 features

        def forward(self, x):
            x = self.feature_extractor(x)
            x = x * F.relu(self.conv(x))
            return self.fc(x.flatten(1))

    return torch, GazeNet()


# --------------------------------------------------------------------------- geometry

def _unit(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v)


def gaze_angles_to_vector(pitch: float, yaw: float) -> np.ndarray:
    return np.array([-math.cos(pitch) * math.sin(yaw), -math.sin(pitch), -math.cos(pitch) * math.cos(yaw)])


def classify(horizontal_deg: float, vertical_deg: float) -> tuple[str, float]:
    """Map angles (camera view; + horizontal = image right, + vertical = up) to a direction.

    Returns (direction, margin_deg): the margin is how far the estimate is from the nearest
    band edge, used for the confidence value.
    """
    inside_h = CENTER_H_DEG - abs(horizontal_deg)
    inside_v = min(CENTER_UP_DEG - vertical_deg, vertical_deg + CENTER_DOWN_DEG)
    if inside_h >= 0 and inside_v >= 0:
        return "toward_screen", min(inside_h, inside_v)
    # Outside the central band: the axis that is further out wins.
    h_out = -inside_h
    v_out = -inside_v
    if h_out >= v_out:
        # Image right is the candidate's own left (the backend sees unmirrored frames).
        return ("left" if horizontal_deg > 0 else "right"), h_out
    return ("up" if vertical_deg > 0 else "down"), v_out


def _frame_confidence(margin_deg: float) -> float:
    # 0.5 on a band edge, rising to ~0.95 at 15 degrees inside a band. Not a calibrated probability.
    return round(0.5 + 0.45 * min(max(margin_deg, 0.0), 15.0) / 15.0, 3)


# --------------------------------------------------------------------------- estimator

class GazeEstimator:
    """Loads the face landmarker and the gaze model once; call estimate() per frame sequence."""

    def __init__(self, model_dir: str | Path, landmarker_path: str | Path) -> None:
        self.model_dir = Path(model_dir)
        self.landmarker_path = Path(landmarker_path)
        weights = self.model_dir / "model.safetensors"
        if not weights.is_file():
            raise ModelLoadError(f"Gaze model not found: {weights}. See models/README.md to download it.")
        if not self.landmarker_path.is_file():
            raise ModelLoadError(
                f"Face landmarker not found: {self.landmarker_path}. See models/README.md to download it."
            )
        try:
            import cv2
            import mediapipe as mp
            from mediapipe.tasks.python import BaseOptions, vision
            from safetensors.torch import load_file
        except ImportError as exc:
            raise ModelLoadError('Gaze estimation needs mediapipe and torch: pip install -e "../models[visual,text]"') from exc
        self._cv2 = cv2
        self._mp = mp
        try:
            self._torch, self.net = _build_network()
            self.net.load_state_dict(load_file(str(weights)), strict=True)
            self.net.eval()
            options = vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(self.landmarker_path)),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
            )
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
        except Exception as exc:  # noqa: BLE001 - one clear error for any loading failure
            raise ModelLoadError(f"Could not load the gaze model or face landmarker: {exc}") from exc
        from ie_models.visual_analysis.face_model import LANDMARKS_3D, LEYE_INDICES, MOUTH_INDICES, REYE_INDICES

        self._template = LANDMARKS_3D
        self._center_idx = np.concatenate([REYE_INDICES, LEYE_INDICES, MOUTH_INDICES])
        self._lock = threading.Lock()  # FaceLandmarker is not thread-safe
        self.model_name = "ResNet (MPIIFaceGaze, ptgaze resnet_simple) + MediaPipe Face Landmarker"

    # -- one frame
    def decode(self, data: bytes) -> np.ndarray:
        if not data:
            raise InvalidFrameError("A frame is empty.")
        image = self._cv2.imdecode(np.frombuffer(data, np.uint8), self._cv2.IMREAD_COLOR)
        if image is None:
            raise InvalidFrameError("A frame could not be decoded as an image (send JPEG or PNG).")
        h, w = image.shape[:2]
        scale = MAX_SIDE_PX / max(h, w)
        if scale < 1:
            image = self._cv2.resize(image, (round(w * scale), round(h * scale)), interpolation=self._cv2.INTER_AREA)
        return image

    def _landmarks(self, bgr: np.ndarray) -> np.ndarray | None:
        rgb = np.ascontiguousarray(bgr[:, :, ::-1])
        mp_image = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=rgb)
        with self._lock:
            result = self.landmarker.detect(mp_image)
        if not result.face_landmarks:
            return None
        h, w = bgr.shape[:2]
        return np.array([(p.x * w, p.y * h) for p in result.face_landmarks[0][:468]], dtype=np.float64)

    def analyze_frame(self, bgr: np.ndarray) -> GazeFrame:
        cv2 = self._cv2
        pts = self._landmarks(bgr)
        if pts is None:
            return GazeFrame(face_detected=False)
        h, w = bgr.shape[:2]
        # Webcam intrinsics are unknown: assume focal length = image width, centre at the middle.
        camera = np.array([[w, 0, w / 2], [0, w, h / 2], [0, 0, 1]], dtype=np.float64)
        ok, rvec, tvec = cv2.solvePnP(
            self._template, pts, camera, np.zeros((1, 5)),
            np.zeros(3), np.array([0.0, 0.0, 1.0]), useExtrinsicGuess=True, flags=cv2.SOLVEPNP_ITERATIVE,
        )
        if not ok:
            return GazeFrame(face_detected=True)
        head_rot, _ = cv2.Rodrigues(np.asarray(rvec, dtype=np.float64).reshape(3))
        model3d = self._template @ head_rot.T + np.asarray(tvec, dtype=np.float64).reshape(3)
        center = model3d[self._center_idx].mean(axis=0)

        # Normalising rotation (rows = new axes), see Zhang et al. ETRA 2018, section 4.2.
        z = _unit(center)
        y = _unit(np.cross(z, head_rot[:, 0]))
        x = _unit(np.cross(y, z))
        norm_rot = np.vstack([x, y, z])
        scale = np.diag([1.0, 1.0, NORMALIZED_DISTANCE / np.linalg.norm(center)])
        warp = NORMALIZED_CAMERA @ scale @ norm_rot @ np.linalg.inv(camera)
        face = cv2.warpPerspective(bgr, warp, (NORMALIZED_SIZE, NORMALIZED_SIZE))

        tensor = (face.astype(np.float32) / 255.0 - MEAN_BGR) / STD_BGR
        tensor = self._torch.from_numpy(tensor.transpose(2, 0, 1).copy()).unsqueeze(0)
        with self._torch.no_grad():
            pitch, yaw = self.net(tensor)[0].tolist()

        gaze = norm_rot.T @ gaze_angles_to_vector(pitch, yaw)  # back to camera coordinates
        horizontal = math.degrees(math.atan2(gaze[0], -gaze[2]))
        vertical = math.degrees(math.asin(max(-1.0, min(1.0, -gaze[1]))))
        direction, margin = classify(horizontal, vertical)
        return GazeFrame(
            face_detected=True,
            direction=direction,
            horizontal_deg=round(horizontal, 1),
            vertical_deg=round(vertical, 1),
            confidence=_frame_confidence(margin),
        )

    # -- a short sequence
    def estimate(self, frames: list[bytes]) -> GazeResult:
        if not frames:
            raise InvalidFrameError("Send at least one frame.")
        if len(frames) > MAX_FRAMES:
            raise InvalidFrameError(f"Send at most {MAX_FRAMES} frames per request.")
        images = [self.decode(f) for f in frames]  # validate all before running the models
        results = [self.analyze_frame(img) for img in images]
        return summarize(results, self.model_name)


def summarize(frames: list[GazeFrame], model: str = "") -> GazeResult:
    """Combine per-frame estimates: majority direction, confidence = agreement x mean frame confidence."""
    analysed = [f for f in frames if f.direction]
    if not analysed:
        return GazeResult(direction=None, confidence=0.0, frames=frames, face_detected=any(f.face_detected for f in frames), model=model)
    counts = Counter(f.direction for f in analysed)
    direction, n = counts.most_common(1)[0]
    agreeing = [f for f in analysed if f.direction == direction]
    agreement = n / len(frames)  # frames without a face count against confidence
    confidence = agreement * sum(f.confidence for f in agreeing) / len(agreeing)
    return GazeResult(
        direction=direction,
        confidence=round(confidence, 3),
        horizontal_deg=round(sum(f.horizontal_deg for f in agreeing) / len(agreeing), 1),
        vertical_deg=round(sum(f.vertical_deg for f in agreeing) / len(agreeing), 1),
        frames=frames,
        face_detected=True,
        model=model,
    )


@lru_cache(maxsize=2)
def _cached_estimator(model_dir: str, landmarker_path: str) -> GazeEstimator:
    # Failed loads raise and are not cached, so fixing the files works on the next call.
    return GazeEstimator(model_dir, landmarker_path)


_load_lock = threading.Lock()


def load_estimator(model_dir: str | Path, landmarker_path: str | Path) -> GazeEstimator:
    # Serialise the first load: concurrent requests must not load the models twice at once.
    with _load_lock:
        return _cached_estimator(str(Path(model_dir).resolve()), str(Path(landmarker_path).resolve()))


def estimate_gaze(frames: list[bytes], model_dir: str | Path, landmarker_path: str | Path) -> GazeResult:
    """Entry point: validate the request, load the models once, return the combined estimate."""
    if not frames:
        raise InvalidFrameError("Send at least one frame.")
    if len(frames) > MAX_FRAMES:
        raise InvalidFrameError(f"Send at most {MAX_FRAMES} frames per request.")
    return load_estimator(model_dir, landmarker_path).estimate(frames)
