import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSessionHistory } from "../../viewmodels/useSessionHistory";
import SessionCard from "../components/SessionCard";
import StatusMessage from "../components/StatusMessage";

export default function HistoryPage() {
  const headingRef = usePageTitle("Previous sessions");
  const vm = useSessionHistory();

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            Previous sessions
          </h1>
          <p className="lead">Your practice sessions saved in this browser.</p>
        </div>
        {vm.totalCount > 0 && (
          <div className="field field--inline">
            <label htmlFor="role-filter" className="field__label">
              Filter by role
            </label>
            <select id="role-filter" className="input" value={vm.roleFilter} onChange={(e) => vm.setRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              {vm.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {vm.totalCount === 0 ? (
        <StatusMessage
          variant="empty"
          title="No sessions yet"
          actions={
            <Link to="/setup" className="btn btn--primary">
              Start your first interview
            </Link>
          }
        >
          Completed practice interviews will appear here.
        </StatusMessage>
      ) : vm.items.length === 0 ? (
        <StatusMessage variant="empty" title="No sessions match this filter" />
      ) : (
        <>
          <p className="visually-hidden" role="status">
            {vm.items.length} session{vm.items.length === 1 ? "" : "s"} shown
          </p>
          <div className="session-grid">
            {vm.items.map((item) => (
              <SessionCard key={item.record.session.id} item={item} onRemove={vm.remove} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
