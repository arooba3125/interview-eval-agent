"""Response shape for POST /api/v1/analysis/gaze."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from ie_models.common.types import GazeResult

GazeDirection = Literal["toward_screen", "left", "right", "up", "down"]

GAZE_NOTICE = (
    "Approximate visual observation of where the eyes appear to point, estimated from camera "
    "frames. It is not a psychological or candidate assessment: it does not measure confidence, "
    "anxiety, passion, honesty, knowledge or job suitability."
)

GAZE_LICENSE = (
    "Gaze model trained on MPIIFaceGaze (MPIIGaze family), CC BY-NC-SA 4.0: non-commercial "
    "scientific use only. Zhang et al., CVPR 2015; Zhang et al., CVPRW 2017."
)


class GazeFrameResponse(BaseModel):
    face_detected: bool
    direction: GazeDirection | None
    horizontal_deg: float = Field(description="+ = toward the image's right, i.e. the candidate's own left")
    vertical_deg: float = Field(description="+ = up")
    confidence: float


class GazeResponse(BaseModel):
    analysis_type: Literal["approximate_gaze_direction"] = "approximate_gaze_direction"
    direction: GazeDirection | None = Field(description="Majority direction; null when no face was found.")
    confidence: float = Field(
        description="0..1 heuristic: agreement across frames x distance from the direction band edges. "
        "Not a calibrated probability."
    )
    horizontal_deg: float
    vertical_deg: float
    face_detected: bool
    frames_received: int
    frames: list[GazeFrameResponse]
    model: str
    processed_locally: bool = True
    frames_stored: bool = False
    notice: str = GAZE_NOTICE
    license: str = GAZE_LICENSE

    @classmethod
    def from_result(cls, result: GazeResult) -> GazeResponse:
        return cls(
            direction=result.direction,
            confidence=result.confidence,
            horizontal_deg=result.horizontal_deg,
            vertical_deg=result.vertical_deg,
            face_detected=result.face_detected,
            frames_received=len(result.frames),
            frames=[
                GazeFrameResponse(
                    face_detected=f.face_detected,
                    direction=f.direction,
                    horizontal_deg=f.horizontal_deg,
                    vertical_deg=f.vertical_deg,
                    confidence=f.confidence,
                )
                for f in result.frames
            ],
            model=result.model,
        )
