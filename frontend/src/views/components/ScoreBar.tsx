import { percent, scoreBand, SCORE_BAND_LABEL } from "../../domain/scoring";

/** A labelled 0..1 score. The number and band are text, so colour is never the only cue. */
export default function ScoreBar({ label, value, description }: { label: string; value: number; description?: string }) {
  const band = scoreBand(value);
  return (
    <div className="score">
      <div className="score__head">
        <span className="score__label">{label}</span>
        <span className="score__value">
          {percent(value)} <span className={`band band--${band}`}>{SCORE_BAND_LABEL[band]}</span>
        </span>
      </div>
      <div className="score__track" aria-hidden="true">
        <span className={`score__fill score__fill--${band}`} style={{ width: percent(value) }} />
      </div>
      {description && <p className="score__desc">{description}</p>}
    </div>
  );
}
