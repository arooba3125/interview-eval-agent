import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSessionReport } from "../../viewmodels/useSessionReport";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, labelFor } from "../../domain/options";
import { formatDuration } from "../../domain/scoring";
import FeedbackPanel from "../components/FeedbackPanel";
import StatusMessage from "../components/StatusMessage";
import StepIndicator from "../components/StepIndicator";

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" });

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card stat">
      <span className="stat__label">{label}</span>
      <span className="stat__big">{value}</span>
      {note && <span className="muted small">{note}</span>}
    </div>
  );
}

// Step 4: what was answered, measured delivery across answers, and a question-by-question review.
export default function SummaryPage() {
  const { sessionId = "" } = useParams();
  const headingRef = usePageTitle("Interview report");
  const vm = useSessionReport(sessionId);

  if (vm.status === "not-found" || !vm.record) {
    return (
      <div className="narrow stack-lg">
        <h1 ref={headingRef} tabIndex={-1}>
          Report not found
        </h1>
        <StatusMessage
          variant="empty"
          title="There is no report for this session on this device"
          actions={
            <Link to="/history" className="btn btn--primary">
              Previous sessions
            </Link>
          }
        />
      </div>
    );
  }

  const { record, results, delivery } = vm;
  const s = record.session;
  const totalTime = results.reduce((t, r) => t + r.answer_duration_s, 0);
  const unmeasured = results.length - delivery.measuredAnswers;

  return (
    <div className="stack-xl">
      <StepIndicator current={3} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Interview report</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {s.job_role}
          </h1>
          <p className="muted">
            {labelFor(EXPERIENCE_LEVELS, s.experience_level)} · {labelFor(INTERVIEW_TYPES, s.interview_type)} ·{" "}
            <time dateTime={record.started_at}>{dateFmt.format(new Date(record.started_at))}</time>
          </p>
        </div>
        <div className="btn-row no-print">
          <button type="button" className="btn btn--secondary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <Link to="/setup" className="btn btn--primary">
            Practise again
          </Link>
        </div>
      </div>

      {results.length === 0 ? (
        <StatusMessage
          variant="empty"
          title="No answers were submitted"
          actions={
            <Link to="/setup" className="btn btn--primary">
              Start a new interview
            </Link>
          }
        >
          The interview ended before any answer was submitted, so there is nothing to report yet.
        </StatusMessage>
      ) : (
        <>
          <section aria-labelledby="overview-title" className="stack-md">
            <div className="section-head">
              <h2 id="overview-title">Overview</h2>
            </div>
            <div className="stat-grid">
              <Stat label="Questions answered" value={`${results.length} of ${vm.totalQuestions}`} />
              <Stat label="Total answer time" value={formatDuration(totalTime)} />
              <Stat
                label="Average speaking pace"
                value={delivery.averagePace === null ? "Could not calculate" : `${delivery.averagePace} words/min`}
                note={delivery.averagePace === null ? undefined : "Measured from your recordings"}
              />
              <Stat
                label="Long pauses (3 s or more)"
                value={delivery.longPauses === null ? "Could not calculate" : String(delivery.longPauses)}
              />
              <Stat
                label="Filler words"
                value={delivery.fillerWords === null ? "Could not calculate" : String(delivery.fillerWords)}
              />
            </div>
            <p className="muted small">
              Delivery figures combine the answers that could be measured
              {unmeasured > 0 ? ` (${unmeasured} of ${results.length} could not be)` : ""}. They describe how answers
              were delivered, not you. An overall answer-quality score and written strengths or areas to improve are{" "}
              <strong>not available yet</strong>.
            </p>
          </section>

          <section aria-labelledby="review-title" className="stack-md">
            <h2 id="review-title">Question-by-question review</h2>
            <ol className="review-list">
              {results.map((r) => (
                <li key={r.question.id}>
                  <details className="card review">
                    <summary className="review__summary">
                      <span className="review__num">Q{r.question.index}</span>
                      <span className="review__text">
                        <span className="review__topic">{r.question.topic}</span>
                        <span className="review__q">{r.question.text}</span>
                      </span>
                      <span className="review__score">{formatDuration(r.answer_duration_s)}</span>
                    </summary>
                    <div className="review__body">
                      <FeedbackPanel
                        headingLevel={4}
                        measuredDelivery={r.measured_delivery}
                        storedTextEmotion={r.text_emotion ?? null}
                      />
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <div className="btn-row btn-row--start no-print">
        <Link to="/history" className="btn btn--ghost">
          Back to previous sessions
        </Link>
      </div>
    </div>
  );
}
