import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSessionHistory } from "../../viewmodels/useSessionHistory";
import SessionCard from "../components/SessionCard";
import StatusMessage from "../components/StatusMessage";

const HOW_IT_WORKS = [
  { title: "Choose your interview", text: "Pick a job role, your experience level and the type of interview." },
  { title: "Check your devices", text: "Test your microphone and, if you want, your camera. You decide what is analysed." },
  { title: "Answer one question at a time", text: "Record, replay and re-record before you submit each answer." },
  { title: "Review your results", text: "See your transcript and measured results after every answer, and a report at the end." },
];

const FEEDBACK_PARTS = [
  { title: "Transcript", text: "Your answer transcribed on this computer, for you to review and correct." },
  { title: "Delivery observations", text: "Speaking pace, long pauses, filler words and volume change, measured from your recording." },
  { title: "Text emotion (experimental)", text: "Emotional wording detected in your transcript, with suggestions tied to what was detected." },
  { title: "Gaze direction (optional)", text: "An approximate visual observation from your camera, only if you opt in." },
  { title: "Answer quality", text: "Not available yet: answers are not scored for relevance, accuracy or completeness." },
];

export default function WelcomePage() {
  const headingRef = usePageTitle("Home");
  const history = useSessionHistory();
  const recent = history.items.slice(0, 2);

  return (
    <div className="stack-xl">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">AI interview practice</p>
          <h1 ref={headingRef} tabIndex={-1} className="hero__title">
            Practise interviews out loud and review what you said and how you said it.
          </h1>
          <p className="lead">
            Answer role-based questions out loud. After each answer you see your transcript and measurements of your
            delivery, taken from your actual recording.
          </p>
          <div className="btn-row btn-row--start">
            <Link to="/setup" className="btn btn--primary btn--lg">
              Start a practice interview
            </Link>
            <Link to="/history" className="btn btn--secondary btn--lg">
              Previous sessions
            </Link>
          </div>
        </div>
        <aside className="card hero__card" aria-label="What a session looks like">
          <p className="eyebrow">A session</p>
          <dl className="hero__facts">
            <div>
              <dt>Questions</dt>
              <dd>4, one at a time</dd>
            </div>
            <div>
              <dt>Time per answer</dt>
              <dd>Up to 3 minutes</dd>
            </div>
            <div>
              <dt>Total time</dt>
              <dd>About 15 minutes</dd>
            </div>
            <div>
              <dt>Camera</dt>
              <dd>Optional</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="how-grid">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="card how-card">
              <span className="how-card__num" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="h4">{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="feedback-title">
        <h2 id="feedback-title">What the feedback covers</h2>
        <ul className="feature-grid">
          {FEEDBACK_PARTS.map((f) => (
            <li key={f.title} className="card feature-card">
              <h3 className="h4">{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
        <p className="muted small">
          These are observations of what you said and how you delivered it. They do not measure knowledge,
          correctness, confidence, anxiety, passion or job suitability.
        </p>
      </section>

      <section aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title">Recent sessions</h2>
          {history.totalCount > 0 && <Link to="/history">See all</Link>}
        </div>
        {recent.length === 0 ? (
          <StatusMessage variant="empty" title="No sessions yet">
            Your completed practice interviews will appear here.
          </StatusMessage>
        ) : (
          <div className="session-grid">
            {recent.map((item) => (
              <SessionCard key={item.record.session.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
