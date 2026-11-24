import type { DeliveryMeasurements, DeliveryMetric, TextEmotionResult } from "../../domain/types";
import TextEmotionSection from "./TextEmotionSection";
import type { TextEmotionState } from "../../viewmodels/useTextEmotion";

// Per-answer feedback. Every value shown comes from a live model or measurement of the actual
// recording; features that are not implemented say so instead of showing invented values.

const MEASURED_SIGNALS: DeliveryMetric["signal"][] = ["speaking_pace", "long_pauses", "filler_words", "volume"];

const MEASURED_LABEL: Record<DeliveryMetric["signal"], string> = {
  speaking_pace: "Speaking pace",
  long_pauses: "Long pauses",
  filler_words: "Filler words",
  volume: "Relative volume",
};

const NOT_MEASURED = "Could not calculate: the recording could not be transcribed, so there were no word timings to measure.";

function measuredValue(m: DeliveryMetric): string {
  if (m.status !== "measured" || m.value === null) return "Could not calculate";
  switch (m.signal) {
    case "speaking_pace":
      return `${m.value} words/min`;
    case "long_pauses":
      return m.value === 1 ? "1 pause of 3 s or more" : `${m.value} pauses of 3 s or more`;
    case "filler_words":
      return m.value === 1 ? "1 filler word" : `${m.value} filler words`;
    default:
      return `${String(m.value).charAt(0).toUpperCase()}${String(m.value).slice(1)}`;
  }
}

/** Delivery measured from the candidate's actual recording; "could not calculate" when unreliable. */
function MeasuredDeliverySection({ report, H }: { report: DeliveryMeasurements | null; H: "h3" | "h4" }) {
  const metrics = MEASURED_SIGNALS.map(
    (signal) =>
      report?.metrics.find((m) => m.signal === signal) ??
      ({ signal, status: "not_available", value: null, unit: "", note: NOT_MEASURED, details: {} } as DeliveryMetric),
  );
  return (
    <section className="feedback__section" aria-label="Delivery observations">
      <div className="feedback__head">
        <H className="feedback__title">Delivery observations</H>
        <span className="badge badge--measured" title="Measured from your recording">
          Measured from your recording
        </span>
      </div>
      <dl className="observations">
        {metrics.map((m) => (
          <div key={m.signal} className={`observation${m.status === "measured" ? "" : " observation--na"}`}>
            <dt>{MEASURED_LABEL[m.signal]}</dt>
            <dd>
              <span className="observation__value">{measuredValue(m)}</span>
              <span className="observation__note">
                {m.status === "measured" ? m.note : m.note.replace(/^Could not calculate:\s*/i, "Reason: ")}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="cue-notice">
        Observable delivery measurements from your recording. They describe how the answer was delivered, not you: they
        do not indicate confidence, anxiety, honesty, passion or suitability for a job, and people speak well in many
        different styles.
      </p>
      <details className="transcript">
        <summary>How these are measured</summary>
        <ul className="small">
          <li>
            <strong>Speaking pace:</strong> recognised words (excluding filler words) divided by speaking time, from the
            first recognised word to the last. Needs at least 10 words over 5 seconds. 120 to 160 words per minute is a
            range many listeners find comfortable; it is a reference, not a rule.
          </li>
          <li>
            <strong>Long pauses:</strong> gaps of 3 seconds or more between two recognised words. Word timings are
            accurate to roughly a quarter of a second.
          </li>
          <li>
            <strong>Filler words:</strong> counts only um, umm, uh, uhh, uhm, er, erm, ah, hmm, hm, mm, mhm, plus “you
            know” and “I mean”. Words such as “like” or “so” are not counted, as they often carry meaning. Speech
            recognition sometimes leaves hesitations out, so this can undercount.
          </li>
          <li>
            <strong>Relative volume:</strong> loudness of your voice during recognised words in the last third of
            speaking time, compared with the first third. A change of 6 dB or more (about half or double the amplitude)
            is reported as lower or higher. It compares you with yourself, not with a standard.
          </li>
          <li>
            Pace, pauses and fillers are not calculated when the speech recogniser was unsure of the words (average
            word confidence under 50%).
          </li>
        </ul>
      </details>
    </section>
  );
}

interface Props {
  /** Heading level of the panel's own section headings. */
  headingLevel?: 3 | 4;
  /**
   * Delivery measured from the actual recording. null: could not be measured;
   * undefined: not measured for this answer (saved by an older version).
   */
  measuredDelivery?: DeliveryMeasurements | null;
  /** The reviewed transcript (interview screen only; the text is not stored). */
  transcript?: string;
  /** Live text emotion analysis (interview screen). */
  textEmotion?: { state: TextEmotionState; onRetry: () => void };
  /** Stored text emotion result (report page). */
  storedTextEmotion?: TextEmotionResult | null;
}

/**
 * Feedback for one answer: transcript, answer quality (not available yet), measured delivery
 * and the experimental text emotion analysis with suggestions from its detected labels.
 */
export default function FeedbackPanel({ headingLevel = 3, measuredDelivery, transcript, textEmotion, storedTextEmotion }: Props) {
  const H = `h${headingLevel}` as "h3" | "h4";

  return (
    <div className="feedback">
      {transcript !== undefined && (
        <section className="feedback__section" aria-label="Transcript">
          <details className="transcript">
            <summary>Your reviewed transcript</summary>
            {transcript ? <p>{transcript}</p> : <p className="muted">No transcript was submitted for this answer.</p>}
          </details>
        </section>
      )}

      <section className="feedback__section" aria-label="Answer quality">
        <div className="feedback__head">
          <H className="feedback__title">Answer quality</H>
          <span className="badge badge--unavailable">Not available yet</span>
        </div>
        <p className="muted">
          Scoring relevance, accuracy and completeness is not implemented yet, so no answer-quality score or
          content suggestions are shown.
        </p>
      </section>

      {measuredDelivery === undefined ? (
        <section className="feedback__section" aria-label="Delivery observations">
          <div className="feedback__head">
            <H className="feedback__title">Delivery observations</H>
            <span className="badge badge--unavailable">Not available</span>
          </div>
          <p className="muted">This answer was saved before delivery was measured, so there are no measurements for it.</p>
        </section>
      ) : (
        <MeasuredDeliverySection report={measuredDelivery} H={H} />
      )}

      {textEmotion ? (
        <TextEmotionSection state={textEmotion.state} onRetry={textEmotion.onRetry} headingLevel={headingLevel} />
      ) : (
        <TextEmotionSection stored={storedTextEmotion ?? null} headingLevel={headingLevel} />
      )}
    </div>
  );
}
