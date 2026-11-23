import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSessionReport } from "../../viewmodels/useSessionReport";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, labelFor } from "../../domain/options";
import { contentScore, formatDuration, percent, scoreBand, SCORE_BAND_LABEL } from "../../domain/scoring";
import FeedbackPanel from "../components/FeedbackPanel";
import StatusMessage from "../components/StatusMessage";
import StepIndicator from "../components/StepIndicator";
import SampleBadge from "../components/SampleBadge";

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" });

function SummaryList({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: string }) {
  return (
    <section className={`card summary-list summary-list--${tone}`} aria-labelledby={`sum-${tone}`}>
      <h3 id={`sum-${tone}`} className="h4">
        {title}
      </h3>
      {items.length ? (
        <ul>
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

// Step 4: overall strengths, areas to improve, delivery patterns and a question-by-question review.
export default function SummaryPage() {
  const { sessionId = "" } = useParams();
  const headingRef = usePageTitle("Interview report");
  const vm = useSessionReport(sessionId);

  if (vm.status === "loading") {
    return (
      <div className="stack-lg">
        <h1 ref={headingRef} tabIndex={-1}>
          Interview report
        </h1>
        <StatusMessage variant="loading" title="Preparing your report…" />
      </div>
    );
  }

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

  const { record, summary, results } = vm;
  const s = record.session;
  const totalTime = results.reduce((t, r) => t + r.answer_duration_s, 0);
  const sample = record.is_sample;

  return (
    <div className="stack-xl">
      {!sample && <StepIndicator current={3} />}
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

      {sample && (
        <StatusMessage variant="info" title="This is a sample session">
          It shows what a finished report looks like. None of it is based on a real recording.
        </StatusMessage>
      )}

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
          The interview ended before any answer was analysed, so there is nothing to report yet.
        </StatusMessage>
      ) : (
        <>
          <section aria-labelledby="overview-title" className="stack-md">
            <div className="section-head">
              <h2 id="overview-title">Overview</h2>
              <SampleBadge />
            </div>
            <div className="stat-grid">
              <div className="card stat">
                <span className="stat__label">Average answer quality</span>
                <span className="stat__big">{vm.overall === null ? "–" : percent(vm.overall)}</span>
                {vm.overall !== null && (
                  <span className={`band band--${scoreBand(vm.overall)}`}>{SCORE_BAND_LABEL[scoreBand(vm.overall)]}</span>
                )}
              </div>
              <div className="card stat">
                <span className="stat__label">Questions answered</span>
                <span className="stat__big">
                  {results.length}
                  <span className="stat__of"> of {vm.totalQuestions}</span>
                </span>
              </div>
              <div className="card stat">
                <span className="stat__label">Total speaking time</span>
                <span className="stat__big">{formatDuration(totalTime)}</span>
              </div>
            </div>
            <p className="muted small">
              Answer quality is the average of relevance, accuracy and completeness. Delivery cues are reported
              separately and are not part of this score.
            </p>
          </section>

          {vm.status === "error" ? (
            <StatusMessage
              variant="error"
              title="The summary could not be loaded"
              actions={
                <button type="button" className="btn btn--primary" onClick={() => void vm.retry()}>
                  Try again
                </button>
              }
            >
              {vm.error} The question-by-question review below is still available.
            </StatusMessage>
          ) : (
            summary && (
              <section aria-labelledby="summary-title" className="stack-md">
                <h2 id="summary-title">Summary</h2>
                <div className="summary-grid">
                  <SummaryList title="Strengths" tone="strength" items={summary.strengths} empty="No strengths were returned yet." />
                  <SummaryList title="Areas to improve" tone="improve" items={summary.areas_to_improve} empty="No improvement areas were returned yet." />
                  <SummaryList title="Delivery patterns" tone="pattern" items={summary.patterns} empty="No delivery patterns were returned yet." />
                </div>
              </section>
            )
          )}

          <section aria-labelledby="review-title" className="stack-md">
            <h2 id="review-title">Question-by-question review</h2>
            <ol className="review-list">
              {results.map((r) => {
                const score = contentScore(r.feedback);
                return (
                  <li key={r.question.id}>
                    <details className="card review">
                      <summary className="review__summary">
                        <span className="review__num">Q{r.question.index}</span>
                        <span className="review__text">
                          <span className="review__topic">{r.question.topic}</span>
                          <span className="review__q">{r.question.text}</span>
                        </span>
                        <span className="review__score">
                          {percent(score)} <span className={`band band--${scoreBand(score)}`}>{SCORE_BAND_LABEL[scoreBand(score)]}</span>
                        </span>
                      </summary>
                      <div className="review__body">
                        <p className="muted small">Answer length {formatDuration(r.answer_duration_s)}</p>
                        <FeedbackPanel feedback={r.feedback} headingLevel={4} />
                      </div>
                    </details>
                  </li>
                );
              })}
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
