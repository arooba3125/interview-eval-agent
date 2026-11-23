import { Link } from "react-router-dom";
import type { SessionListItem } from "../../viewmodels/useSessionHistory";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, labelFor } from "../../domain/options";
import { percent, scoreBand, SCORE_BAND_LABEL } from "../../domain/scoring";

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

interface Props {
  item: SessionListItem;
  onRemove?: (id: string) => void;
}

export default function SessionCard({ item, onRemove }: Props) {
  const { record, score, answered, total } = item;
  const s = record.session;
  const inProgress = !record.completed_at;
  return (
    <article className="card session-card">
      <div className="session-card__head">
        <h3 className="session-card__title">{s.job_role}</h3>
        <div className="session-card__badges">
          {record.is_sample && <span className="badge badge--sample">Sample session</span>}
          {inProgress && <span className="badge badge--progress">In progress</span>}
        </div>
      </div>
      <p className="session-card__meta">
        {labelFor(EXPERIENCE_LEVELS, s.experience_level)} · {labelFor(INTERVIEW_TYPES, s.interview_type)} ·{" "}
        <time dateTime={record.started_at}>{dateFmt.format(new Date(record.started_at))}</time>
      </p>
      <div className="session-card__stats">
        <div>
          <span className="stat__label">Answered</span>
          <span className="stat__value">
            {answered}
            {total ? ` of ${total}` : ""}
          </span>
        </div>
        <div>
          <span className="stat__label">Answer quality</span>
          <span className="stat__value">
            {score === null ? "–" : percent(score)}
            {score !== null && <span className={`band band--${scoreBand(score)}`}>{SCORE_BAND_LABEL[scoreBand(score)]}</span>}
          </span>
        </div>
      </div>
      <div className="btn-row btn-row--start">
        {inProgress ? (
          <Link className="btn btn--primary btn--sm" to={`/interview/${s.id}`}>
            Resume<span className="visually-hidden"> {s.job_role} interview</span>
          </Link>
        ) : null}
        {answered > 0 && (
          <Link className="btn btn--secondary btn--sm" to={`/interview/${s.id}/summary`}>
            View report<span className="visually-hidden"> for {s.job_role} interview</span>
          </Link>
        )}
        {onRemove && !record.is_sample && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRemove(s.id)}>
            Delete<span className="visually-hidden"> {s.job_role} session</span>
          </button>
        )}
      </div>
    </article>
  );
}
