import { MAX_TRANSCRIPT_CHARS } from "../../services/textEmotionApi";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Optional typed transcript, used only for the experimental text emotion analysis. */
export default function TranscriptInput({ value, onChange, disabled }: Props) {
  return (
    <section className="card transcript-input" aria-labelledby="answer-transcript-label">
      <label id="answer-transcript-label" className="field__label" htmlFor="answer-transcript">
        Answer transcript <span className="muted small">(optional)</span>
      </label>
      <p className="field__hint" id="answer-transcript-hint">
        Speech-to-text is not connected yet. Type or paste what you said to run the experimental text emotion
        analysis on it when you submit. It is not used for your other feedback.
      </p>
      <textarea
        id="answer-transcript"
        className="input input--textarea"
        rows={5}
        maxLength={MAX_TRANSCRIPT_CHARS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby="answer-transcript-hint answer-transcript-count"
      />
      <p className="field__hint transcript-input__count" id="answer-transcript-count">
        {value.length.toLocaleString()} / {MAX_TRANSCRIPT_CHARS.toLocaleString()} characters
      </p>
    </section>
  );
}
