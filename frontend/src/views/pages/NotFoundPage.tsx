import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import StatusMessage from "../components/StatusMessage";

export default function NotFoundPage() {
  const headingRef = usePageTitle("Page not found");
  return (
    <div className="narrow stack-lg">
      <h1 ref={headingRef} tabIndex={-1}>
        Page not found
      </h1>
      <StatusMessage
        variant="empty"
        title="This page does not exist"
        actions={
          <Link to="/" className="btn btn--primary">
            Go home
          </Link>
        }
      />
    </div>
  );
}
