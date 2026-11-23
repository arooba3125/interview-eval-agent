import type { AnswerFeedback, DeliveryObservation } from "../../domain/types";
import { signalInfo } from "../../domain/scoring";
import { USE_MOCK_API } from "../../services/config";
import ScoreBar from "./ScoreBar";
import CueNotice from "./CueNotice";
import SampleBadge from "./SampleBadge";

function formatValue(o: DeliveryObservation): string {
  const info = signalInfo(o);
  if (typeof o.value === "number" && o.value <= 1 && info.unit === "of answer time") return `${Math.round(o.value * 100)}%`;
  if (typeof o.value === "number") return `${o.value}${info.unit && info.unit !== "count" ? ` ${info.unit}` : ""}`;
  return o.value.charAt(0).toUpperCase() + o.value.slice(1);
}

function ObservationList({ items }: { items: DeliveryObservation[] }) {
  return (
    <dl className="observations">
      {items.map((o) => (
        <div key={o.signal} className="observation">
          <dt>{signalInfo(o).label}</dt>
          <dd>
            <span className="observation__value">{formatValue(o)}</span>
            <span className="observation__note">{o.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface Props {
  feedback: AnswerFeedback;
  /** Heading level of the panel's own section headings. */
  headingLevel?: 3 | 4;
}

/**
 * Per-question feedback in three separate parts. Content scores assess the answer;
 * delivery items are observations, never verdicts about the person.
 */
export default function FeedbackPanel({ feedback, headingLevel = 3 }: Props) {
  const { content, delivery, suggestions } = feedback;
  const H = `h${headingLevel}` as "h3" | "h4";
  const voice = delivery.filter((d) => signalInfo(d).group === "voice");
  const camera = delivery.filter((d) => signalInfo(d).group === "camera");

  return (
    <div className="feedback">
      <section className="feedback__section" aria-label="Answer quality">
        <div className="feedback__head">
          <H className="feedback__title">Answer quality</H>
          <SampleBadge />
        </div>
        <div className="score-grid">
          <ScoreBar label="Relevance" value={content.relevance} description="How directly the answer addressed the question." />
          <ScoreBar label="Accuracy" value={content.correctness} description="Whether the technical points were correct." />
          <ScoreBar label="Completeness" value={content.completeness} description="How many of the expected points were covered." />
        </div>
        <p className="knowledge">
          Estimated knowledge level: <strong className="knowledge__level">{content.knowledge_level}</strong>
        </p>
        <div className="concepts">
          <div>
            <p className="concepts__title">Key concepts you covered</p>
            {content.covered_concepts.length ? (
              <ul className="chips">
                {content.covered_concepts.map((c) => (
                  <li key={c} className="chip chip--covered">
                    <span aria-hidden="true">✓</span> {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None detected.</p>
            )}
          </div>
          <div>
            <p className="concepts__title">Key concepts to add</p>
            {content.missing_concepts.length ? (
              <ul className="chips">
                {content.missing_concepts.map((c) => (
                  <li key={c} className="chip chip--missing">
                    <span aria-hidden="true">+</span> {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing major missing.</p>
            )}
          </div>
        </div>
        <details className="transcript">
          <summary>Transcript</summary>
          {content.transcript ? (
            <p>{content.transcript}</p>
          ) : (
            <p className="muted">
              {USE_MOCK_API
                ? "No transcript in demo mode. Speech-to-text runs in the backend, which is not connected."
                : "No transcript was returned for this answer."}
            </p>
          )}
        </details>
      </section>

      <section className="feedback__section" aria-label="Delivery observations">
        <div className="feedback__head">
          <H className="feedback__title">Delivery observations</H>
          <SampleBadge />
        </div>
        {delivery.length === 0 ? (
          <p className="muted">No delivery observations were returned for this answer.</p>
        ) : (
          <>
            <ObservationList items={voice} />
            {camera.length > 0 && (
              <>
                <p className="observations__group">Camera cues (you opted in)</p>
                <ObservationList items={camera} />
              </>
            )}
          </>
        )}
        <CueNotice />
      </section>

      <section className="feedback__section" aria-label="Suggestions">
        <div className="feedback__head">
          <H className="feedback__title">Suggestions to improve this answer</H>
          <SampleBadge />
        </div>
        {suggestions.length ? (
          <ol className="suggestions">
            {suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No suggestions for this answer.</p>
        )}
      </section>
    </div>
  );
}
