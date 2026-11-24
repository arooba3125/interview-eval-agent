# Text emotion model: BERT fine-tuned on GoEmotions

The project's transfer-learning component. `finetune_goemotions.ipynb` fine-tunes
`bert-base-uncased` for **multi-label** text emotion classification (27 emotions + neutral;
a comment can have several) and saves the model, tokenizer and evaluation results.
It is not connected to the interview interface yet.

## Setup (Windows PowerShell)

Install Python 3.11 or 3.12 from python.org first, then from the repository root:

```powershell
cd model-training\text
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
jupyter notebook finetune_goemotions.ipynb
```

On Google Colab, upload the notebook, pick a GPU runtime and run all cells; the first cell
installs what Colab is missing.

## Runs

| Setting | Data | Purpose | Time |
|---|---|---|---|
| `SMALL_RUN = True` (default) | 2,000 train, 500 validation, 500 test, 5 epochs at learning rate 5e-5 | check the pipeline end to end | about 2 min on a Colab T4 |
| `SMALL_RUN = False` | full official splits (43,410 / 5,426 / 5,427), up to 4 epochs with early stopping | real model | about 15–25 min per epoch on a Colab T4 GPU |

Splits, subsets and training use a fixed seed (42), and every run writes its config and
library versions into its metrics file.

## Outputs

```
model-training/text/
  outputs/<run>/model/            weights, config (id2label), tokenizer, inference_config.json   (git-ignored)
  outputs/<run>/checkpoints/      Trainer checkpoints                                            (git-ignored)
  results/<run>_metrics.json      validation + test metrics, tuned threshold, config, versions   (commit)
  results/<run>_per_label.csv     per-emotion precision / recall / F1 on test                    (commit)
  downloads/<run>.zip             model/ + results/ in one file; on Colab it downloads itself    (git-ignored)
```

On Colab these paths are under `/content/` and are deleted when the runtime stops, so the
last cells download the two results files and the zip to your computer (and optionally
copy them to Google Drive with `SAVE_TO_DRIVE = True`).

`<run>` is `bert-goemotions-small` or `bert-goemotions-full`.

## Evaluation

The best epoch is chosen by validation macro ROC-AUC, which doesn't depend on a threshold
(F1 at 0.5 is often 0 for every epoch early in training, which would make the choice arbitrary). Reported on the test split, at threshold 0.5 and
at a single threshold tuned on validation: micro / macro / weighted / samples F1, micro and
macro precision and recall, subset accuracy, Hamming loss and macro ROC-AUC, plus a
per-emotion report. Reference point: the GoEmotions paper's BERT baseline reaches about
0.46 macro F1 on this 28-label setup.

## Input/output pattern

```
predict_emotions(texts: list[str]) -> list[{text, labels, scores, top}]
```

`labels` are the emotions at or above the saved threshold, `scores` holds a probability per
emotion. These are emotions expressed in the wording, not a judgement of how the candidate feels.
