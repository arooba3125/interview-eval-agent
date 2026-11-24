"""Visible-behaviour measurements from video, run only with the candidate's consent.

Implemented: approximate gaze direction per frame sequence (see gaze.py). Planned: facial and
hand movement. Outputs are measurements such as "gaze toward the screen in 7 of 9 samples",
never judgements about confidence, anxiety, passion, honesty, knowledge or suitability.
"""
from ie_models.common.types import Observation


def analyze(video_bytes: bytes) -> list[Observation]:
    raise NotImplementedError("Whole-video analysis is not implemented; use gaze.estimate_gaze on frames.")
