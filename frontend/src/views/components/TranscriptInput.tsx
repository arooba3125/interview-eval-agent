import { MAX_TRANSCRIPT_CHARS } from "../../services/textEmotionApi";
import type { TranscriptionState } from "../../viewmodels/useTranscription";
import StatusMessage from "./StatusMessage";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Speech-to-text of the current take. */
  transcription: TranscriptionState;
  /** True once a take has been recorded. */
  hasRecording: boolean;
  onRetry: () => void;
  disabled?: boolean;
}

function hint(p: Props): string {
  if (!p.hasRecording) {
    return "When you stop recording, your answer is transcribed here on this computer. You can also type it yourself.";
  }
  switch (p.transcription.status) {
    case "loading":
      return "Transcribing your recording…";
    case "success":
      return p.transcription.result?.speech_detected
        ? "Automatic transcript. It can mishear words, so check it and correct anything wrong before you submit."
        : "No speech was detected in this recording. Type what you said, or record again.";
    case "error":
      return "Automatic transcription did not work. Type what you said, or try again.";
    default:
      return "Type or correct what you said.";
  }
}

/**
 * Transcript of the current take: filled in by local speech-to-text, then reviewed and edited by
 * the candidate. Used only for the experimental text emotion analysis when they submit.
 */
export default function TranscriptInput(p: Props) {
  const { transcription: t } = p;
  const busy = t.status === "loading";
  return (
    <section className="card transcript-input" aria-labelledby="answer-transcript-label" aria-busy={busy}>
      <label id="answer-transcript-label" className="field__label" htmlFor="answer-transcript">
        Answer transcript <span className="muted small">(review before submitting)</span>
      </label>
      <p className="field__hint" id="answer-transcript-hint" aria-live="polite">
        {hint(p)}
      </p>

      {busy && (
        <StatusMessage variant="loading" compact title="Transcribing your recording…">
          Speech-to-text runs on this computer; your audio is not sent anywhere else. The first answer can take
          around 10 seconds while the model loads.
        </StatusMessage>
      )}

      {t.status === "error" && (
        <StatusMessage
          variant="error"
          compact
          title="The recording could not be transcribed"
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={p.onRetry}>
              Try again
            </button>
          }
        >
          {t.error && /[.!?]$/.test(t.error) ? t.error : `${t.error}.`} You can still type the transcript yourself.
        </StatusMessage>
      )}

      {t.status === "success" && t.result && !t.result.speech_detected && (
        <StatusMessage variant="warning" compact title="No speech detected">
          The model heard no words in this {Math.round(t.result.duration_s)}-second recording.
        </StatusMessage>
      )}

      <textarea
        id="answer-transcript"
        className="input input--textarea"
        rows={5}
        maxLength={MAX_TRANSCRIPT_CHARS}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        disabled={p.disabled || busy}
        placeholder={busy ? "Transcribing…" : undefined}
        aria-describedby="answer-transcript-hint answer-transcript-count"
      />
      <p className="field__hint transcript-input__count" id="answer-transcript-count">
        {p.value.length.toLocaleString()} / {MAX_TRANSCRIPT_CHARS.toLocaleString()} characters
        {t.status === "success" && t.result?.speech_detected && ` · ${t.result.model}, processed locally`}
      </p>
      <p className="muted small">
        The transcript records what you said. It is used only for the experimental text emotion analysis; it does not
        assess your knowledge, correctness, confidence, anxiety, passion or job suitability.
      </p>
    </section>
  );
}
