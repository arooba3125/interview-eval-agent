"""Visible-behaviour measurements from video, run only with the candidate's consent.

Planned: MediaPipe Face Mesh for gaze direction and facial movement, MediaPipe Hands
for hand movement. Outputs are measurements such as "gaze off-screen 35% of the time".
"""
from ie_models.common.types import Observation


def analyze(video_bytes: bytes) -> list[Observation]:
    raise NotImplementedError
