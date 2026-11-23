import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/apiClient";
import type { SessionSummary } from "../../domain/types";

// Step 7: overall strengths, areas to improve, and patterns across answers.
export default function SummaryPage() {
  const { sessionId = "" } = useParams();
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    api.summary(sessionId).then(setSummary);
  }, [sessionId]);

  if (!summary) return <p>Loading summary…</p>;
  return (
    <main>
      <h1>Interview summary</h1>
      <h2>Strengths</h2>
      <ul>{summary.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
      <h2>Areas to improve</h2>
      <ul>{summary.areas_to_improve.map((s) => <li key={s}>{s}</li>)}</ul>
    </main>
  );
}
