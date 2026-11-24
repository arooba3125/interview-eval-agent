import type { TextEmotionResult } from "../../domain/types";
import {
  MAX_DISPLAYED_EMOTIONS,
  NO_SIGNAL_TEXT,
  NO_SUGGESTION_TEXT,
  RELEVANT_EMOTIONS,
  selectDisplayedEmotions,
  suggestionsFor,
} from "../../domain/emotionFeedback";
import type { TextEmotionState } from "../../viewmodels/useTextEmotion";
import StatusMessage from "./StatusMessage";

const STANDING_NOTICE =
  "Experimental. The model detects emotional wording in your transcript. It was trained on Reddit comments " +
  "(GoEmotions), so its results may not generalise to spoken interview answers. It does not measure your knowledge, " +
  "correctness, confidence, anxiety, passion or job suitability.";

function labelName(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatProbability(p: number): string {
  if (p > 0 && p < 0.01) return "<1%";
  return `${Math.round(p * 100)}%`;
}

function TechnicalDetails({ result, transcript }: { result: TextEmotionResult; transcript?: string }) {
  const rows = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
  const detected = new Set(result.detected_labels);
  return (
    <details className="transcript">
      <summary>Technical details</summary>
      <div className="stack-sm">
        <p className="muted small">
          Full model output: all {rows.length} GoEmotions labels. A label counts as detected at{" "}
          {formatProbability(result.threshold)} or above. The feedback above shows only these labels:{" "}
          {Object.values(RELEVANT_EMOTIONS)
            .map((r) => r.display)
            .join(", ")}
          ; at most {MAX_DISPLAYED_EMOTIONS}, and only when detected.
        </p>
        <ul className="emotion-scores" aria-label="All label scores">
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
        <p className="muted small">
          Model: {result.model}.{result.chunks > 1 && ` This long answer was analysed in ${result.chunks} overlapping parts.`}
        </p>
        {transcript && (
          <>
            <p className="concepts__title">Analysed transcript</p>
            <p className="small">{transcript}</p>
          </>
        )}
      </div>
    </details>
  );
}

/** The concise result: up to three allowlisted labels and the suggestions tied to them. */
export function EmotionSummary({ result, transcript }: { result: TextEmotionResult; transcript?: string }) {
  const shown = selectDisplayedEmotions(result);
  const suggestions = suggestionsFor(shown);
  return (
    <div className="emotion">
      <div>
        <p className="concepts__title">Emotional wording detected</p>
        {shown.length ? (
          <ul className="chips">
            {shown.map((e) => (
              <li key={e.label} className="chip chip--emotion">
                {e.display} <span className="chip__score">{formatProbability(e.score)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{NO_SIGNAL_TEXT}</p>
        )}
      </div>
      <div>
        <p className="concepts__title">Suggestions from the wording</p>
        {suggestions.length ? (
          <ul className="suggestions suggestions--plain">
            {suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{NO_SUGGESTION_TEXT}</p>
        )}
      </div>
      <TechnicalDetails result={result} transcript={transcript} />
    </div>
  );
}

interface Props {
  /** Live analysis on the interview screen. */
  state?: TextEmotionState;
  onRetry?: () => void;
  /** A stored result (report page). null = it did not run or did not complete for this answer. */
  stored?: TextEmotionResult | null;
  headingLevel?: 3 | 4;
}

/** Experimental text emotion analysis, kept apart from the other feedback. */
export default function TextEmotionSection({ state, onRetry, stored, headingLevel = 3 }: Props) {
  const H = `h${headingLevel}` as "h3" | "h4";
  const status = state ? state.status : stored ? "success" : "unavailable";
  const result = state ? state.result : stored ?? null;

  return (
    <section className="feedback__section" aria-label="Experimental text emotion analysis" aria-busy={status === "loading"}>
      <div className="feedback__head">
        <H className="feedback__title">Text emotion analysis</H>
        <span className="badge badge--experimental" title="Live output from an experimental model">
          Experimental · live model
        </span>
      </div>

      {(status === "idle" || status === "skipped") && (
        <p className="muted">
          This answer was submitted with an empty transcript, so the text emotion analysis did not run.
        </p>
      )}

      {status === "unavailable" && <p className="muted">Not available for this answer.</p>}

      {status === "loading" && (
        <StatusMessage variant="loading" compact title="Running the experimental text emotion model…">
          The first request can take about 10 seconds while the model loads.
        </StatusMessage>
      )}

      {status === "error" && state && (
        <StatusMessage
          variant="error"
          compact
          title="Text emotion analysis did not complete"
          actions={
            onRetry && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
                Try again
              </button>
            )
          }
        >
          {state.error && /[.!?]$/.test(state.error) ? state.error : `${state.error}.`} The rest of your feedback is
          not affected.
        </StatusMessage>
      )}

      {status === "success" && result && <EmotionSummary result={result} transcript={state?.transcript} />}

      <p className="cue-notice">{STANDING_NOTICE}</p>
    </section>
  );
}
