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
| `SMALL_RUN = True` (default) | 2,000 train, 500 validation, 500 test, 2 epochs | check the pipeline end to end | minutes on CPU |
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
```

`<run>` is `bert-goemotions-small` or `bert-goemotions-full`.

## Evaluation

Model selection uses validation micro F1. Reported on the test split, at threshold 0.5 and
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
