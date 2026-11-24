import type { TextEmotionResult } from "../../domain/types";
import type { TextEmotionState } from "../../viewmodels/useTextEmotion";
import StatusMessage from "./StatusMessage";

const TOP_N = 6;

const STANDING_NOTICE =
  "Experimental text emotion analysis. It describes emotions expressed in the words of your typed transcript, " +
  "using a model trained on Reddit comments. It is not a measure of your knowledge, correctness, confidence, " +
  "anxiety, passion or job suitability, and it does not change any other part of your feedback.";

function labelName(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatProbability(p: number): string {
  if (p > 0 && p < 0.01) return "<1%";
  return `${Math.round(p * 100)}%`;
}

function ScoreList({ rows, detected, label }: { rows: [string, number][]; detected: Set<string>; label: string }) {
  return (
    <ul className="emotion-scores" aria-label={label}>
      {rows.map(([name, p]) => (
        <li key={name} className={`emotion-score${detected.has(name) ? " is-detected" : ""}`}>
          <span className="emotion-score__label">
            {labelName(name)}
            {detected.has(name) && <span className="visually-hidden"> (detected)</span>}
          </span>
          <span className="score__track" aria-hidden="true">
            <span className="score__fill score__fill--emotion" style={{ width: `${Math.round(p * 100)}%` }} />
          </span>
          <span className="emotion-score__value">{formatProbability(p)}</span>
        </li>
      ))}
    </ul>
  );
}

function EmotionResult({ result, transcript }: { result: TextEmotionResult; transcript: string }) {
  const rows = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
  const detected = new Set(result.detected_labels);
  return (
    <div className="emotion">
      <div>
        <p className="concepts__title">Detected in the wording</p>
        {result.detected_labels.length ? (
          <ul className="chips">
            {result.detected_labels.map((l) => (
              <li key={l} className="chip chip--emotion">
                {labelName(l)} <span className="chip__score">{formatProbability(result.scores[l] ?? 0)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No emotion label reached the model's threshold of {formatProbability(result.threshold)}.</p>
        )}
      </div>
      <p>
        Highest-scoring label: <strong>{labelName(result.top_label.label)}</strong> ({formatProbability(result.top_label.score)})
      </p>
      <ScoreList rows={rows.slice(0, TOP_N)} detected={detected} label={`Top ${TOP_N} label scores`} />
      <details className="transcript">
        <summary>All {rows.length} label scores</summary>
        <ScoreList rows={rows} detected={detected} label="All label scores" />
      </details>
      <details className="transcript">
        <summary>Analysed transcript</summary>
        <p>{transcript}</p>
      </details>
      <p className="muted small">
        Model: {result.model}. Scores are probabilities from 0 to 100%; a label counts as detected at{" "}
        {formatProbability(result.threshold)} or above.
        {result.chunks > 1 && ` This long answer was analysed in ${result.chunks} overlapping parts.`}
      </p>
    </div>
  );
}

interface Props {
  state: TextEmotionState;
  onRetry: () => void;
  headingLevel?: 3 | 4;
}

/** Live output of the experimental text emotion model, kept apart from the (sample) feedback. */
export default function TextEmotionSection({ state, onRetry, headingLevel = 3 }: Props) {
  const H = `h${headingLevel}` as "h3" | "h4";
  return (
    <section className="feedback__section" aria-label="Experimental text emotion analysis" aria-busy={state.status === "loading"}>
      <div className="feedback__head">
        <H className="feedback__title">Text emotion analysis</H>
        <span className="badge badge--experimental" title="Live output from an experimental model">
          Experimental · live model
        </span>
      </div>

      {(state.status === "idle" || state.status === "skipped") && (
        <p className="muted">
          No transcript was typed for this answer, so the text emotion analysis did not run. Add a transcript before
          submitting the next answer to try it.
        </p>
      )}

      {state.status === "loading" && (
        <StatusMessage variant="loading" compact title="Running the experimental text emotion model…">
          The first request can take about 10 seconds while the model loads.
        </StatusMessage>
      )}

      {state.status === "error" && (
        <StatusMessage
          variant="error"
          compact
          title="Text emotion analysis did not complete"
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
              Try again
            </button>
          }
        >
          {state.error && /[.!?]$/.test(state.error) ? state.error : `${state.error}.`} The rest of your feedback is
          not affected.
        </StatusMessage>
      )}

      {state.status === "success" && state.result && <EmotionResult result={state.result} transcript={state.transcript} />}

      <p className="cue-notice">{STANDING_NOTICE}</p>
    </section>
  );
}
