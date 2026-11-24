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
  speech_to_text/    audio -> transcript (+ word timestamps)          Whisper base.en via faster-whisper (local, CPU)
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

## Speech-to-text setup

`pip install -e "../models[speech]"` installs faster-whisper (with CTranslate2, PyAV for decoding
webm/opus/mp4 without a system ffmpeg, and onnxruntime for the bundled voice-activity filter).
The pretrained weights (about 140 MB) are downloaded once into the git-ignored `checkpoints/`:

```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-base.en', local_dir='checkpoints/faster-whisper-base.en')"
```

After that, transcription runs entirely on this machine (int8 on CPU, roughly 0.15x real time
on a laptop i7 once loaded) and makes no network calls. The transcript records what was said;
it does not assess knowledge, correctness, confidence, anxiety, passion or job suitability.

## Delivery measurements (vocal_analysis)

`vocal_analysis.measure_delivery(audio, transcript)` measures how an answer was delivered, from
the decoded recording (16 kHz mono) and the Whisper word timestamps. Each metric is either
`measured` or `not_available` with a reason; nothing is estimated or filled in.

| Metric | How | Threshold / rule |
|---|---|---|
| Speaking pace | non-filler words ÷ speaking time (first word start → last word end) | needs ≥ 10 words over ≥ 5 s; 120–160 wpm shown as a common comfortable range, not a rule |
| Long pauses | gaps between consecutive recognised words | gap ≥ 3.0 s; word timings are accurate to roughly ±0.25 s |
| Filler words | token match on the transcript | `um umm uh uhh uhm er erm ah hmm hm mm mhm` + "you know", "I mean". "like", "so", "basically", "actually", "well", "right" are **not** counted (often meaningful). Whisper sometimes drops hesitations, so this can undercount |
| Relative volume | RMS dBFS of 250 ms windows inside recognised words; median of last third vs first third of speaking time | ≥ 6 dB change (≈ half/double amplitude) → "lower"/"higher", else "steady"; needs ≥ 6 s of speech; not calculated if speech median < −60 dBFS |

Pace, pauses and fillers are withheld when the mean word confidence is below 50%. Volume is
relative to the speaker's own start (the browser records with automatic gain control off so
real changes are kept). None of these indicates confidence, anxiety, honesty, passion or job
suitability.

Transcription settings that matter here: segments with average log-probability < −1.0 and
no-speech probability > 0.3 (or mostly zero-length words) are dropped as hallucinations, and
temperature fallback is off (it only re-decoded trailing noise and tripled the run time).

## Gaze direction (visual_analysis)

`visual_analysis.estimate_gaze(frames, model_dir, landmarker_path)` takes 1 to 5 JPEG/PNG
frames and returns an **approximate** gaze direction (`toward_screen`, `left`, `right`, `up`,
`down`, or `None` when no face is found) with a confidence value. Pipeline: MediaPipe Face
Landmarker → head pose with OpenCV `solvePnP` and a 3D face template → MPIIFaceGaze
normalisation to a 224×224 face → pretrained ResNet gaze model (pitch, yaw) → direction band.
The model is used as-is (no fine-tuning; the BERT text model already covers fine-tuning).

- **Confidence** is a heuristic: the share of frames that agree on the direction × how far the
  estimates sit from the band edges. It is not a calibrated probability.
- **Accuracy**: about 4.8° mean error on MPIIFaceGaze (author's leave-one-person-out
  result). Expect more on webcams: the camera intrinsics are unknown (focal length is assumed
  to equal the image width), and lighting, glasses and camera position all matter.
- **Privacy**: frames are decoded and processed in memory and never written anywhere.
- **What it is not**: an approximate visual observation only. It never measures or implies
  confidence, anxiety, passion, honesty, knowledge or job suitability.

Setup (`pip install -e "../models[visual]"`, about 100 MB of packages incl. opencv-contrib), then the
two model files into the git-ignored `checkpoints/` (about 15 MB in total):

```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download('hysts/ptgaze-mpiifacegaze-resnet-simple', local_dir='checkpoints/gaze-mpiifacegaze-resnet-simple')"
curl -L -o checkpoints/mediapipe/face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

The MPIIGaze dataset itself (2.1 GB) is **not** downloaded: no training is done.

## Third-party models, data and licences

| Component | Source | Licence |
|---|---|---|
| Gaze model weights `model.safetensors` (11 MB) | [hysts/ptgaze-mpiifacegaze-resnet-simple](https://huggingface.co/hysts/ptgaze-mpiifacegaze-resnet-simple) | MIT for the weights' author rights; **trained on MPIIFaceGaze, CC BY-NC-SA 4.0** |
| Network definition, normalisation steps, 3D face template (`visual_analysis/gaze.py`, `face_model.py`) | Adapted from [ptgaze](https://github.com/hysts/pytorch_mpiigaze_demo) | MIT, © hysts |
| Face landmarker `face_landmarker.task` (3.6 MB) | Google MediaPipe | Apache 2.0 |
| Speech model (Whisper base.en) | OpenAI Whisper via Systran/faster-whisper | MIT |

**Non-commercial restriction.** MPIIGaze and MPIIFaceGaze are distributed by the Max Planck
Institute for Informatics under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0
International licence, for non-commercial scientific purposes only. The gaze model is trained on
that data, so this project treats the gaze feature as **non-commercial research use only**: do not
use it in a commercial product without checking the licensing yourself.

**Required attribution** (cite when using the gaze feature):

- X. Zhang, Y. Sugano, M. Fritz and A. Bulling. *Appearance-based Gaze Estimation in the Wild.*
  Proc. IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 2015, pp. 4511–4520.
- X. Zhang, Y. Sugano, M. Fritz and A. Bulling. *It's Written All Over Your Face: Full-Face
  Appearance-Based Gaze Estimation.* Proc. IEEE CVPR Workshops (CVPRW), 2017. arXiv:1611.08860.

## Design rule for delivery signals

`vocal_analysis` and `visual_analysis` return **measurements** (e.g. "speaking pace 185 wpm",
"looked away from the screen 40% of the answer"), not labels such as "anxious" or
"not confident". Expressions, eye movement and gestures alone can't reliably show
confidence, anxiety or passion, and they vary across people and cultures. `feedback/`
turns measurements into neutral observations and practical suggestions.

Knowledge and correctness come from `answer_scoring`, which assesses what the candidate said.
