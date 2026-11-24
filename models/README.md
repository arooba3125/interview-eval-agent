# Models (deep learning)

The analysis pipelines, packaged as `ie_models` so the backend can import them
(`pip install -e ../models`). Training code and experiments live beside the package
and are never imported by the backend.

## Why a pipeline-per-folder layout

ML code doesn't fit MVC well. Instead each analysis path is a self-contained module
with the same shape (`preprocess -> model -> postprocess`, exposed through one function),
so each can be trained, tested and replaced on its own.

```
ie_models/
  speech_to_text/    audio -> transcript (+ word timestamps)          e.g. Whisper
  answer_scoring/    question + transcript -> relevance, correctness,
                     completeness, knowledge level, missing concepts   e.g. sentence embeddings + LLM/rubric
  vocal_analysis/    audio -> pace (wpm), pauses, volume, pitch variation   e.g. librosa / pyannote
  visual_analysis/   video frames -> gaze direction, facial movement,
                     hand movement                                     e.g. MediaPipe Face Mesh / Hands
  text_emotion/      transcript -> emotions expressed in the wording (EXPERIMENTAL)  BERT fine-tuned on GoEmotions
  feedback/          combines the above into suggestions and observations
  common/            shared types, audio/video loading, config
training/            scripts to train or fine-tune each model
notebooks/           exploration and evaluation (not imported anywhere)
configs/             YAML configs per pipeline
data/                datasets (git-ignored)
checkpoints/         trained weights (git-ignored)
tests/
```

## Design rule for delivery signals

`vocal_analysis` and `visual_analysis` return **measurements** (e.g. "speaking pace 185 wpm",
"looked away from the screen 40% of the answer"), not labels such as "anxious" or
"not confident". Expressions, eye movement and gestures alone can't reliably show
confidence, anxiety or passion, and they vary across people and cultures. `feedback/`
turns measurements into neutral observations and practical suggestions.

Knowledge and correctness come from `answer_scoring`, which assesses what the candidate said.
