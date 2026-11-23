import type { AnswerFeedback } from "../../domain/types";

const pct = (n: number) => `${Math.round(n * 100)}%`;

// Content scores assess the answer. Delivery items are shown as observations, not verdicts.
export default function FeedbackPanel({ feedback }: { feedback: AnswerFeedback }) {
  const { content, delivery, suggestions } = feedback;
  return (
    <section>
      <h3>Knowledge and answer quality</h3>
      <p>Knowledge level: {content.knowledge_level}</p>
      <p>
        Correctness {pct(content.correctness)} · Relevance {pct(content.relevance)} · Completeness{" "}
        {pct(content.completeness)}
      </p>

      {delivery.length > 0 && (
        <>
          <h3>Delivery observations</h3>
          <ul>{delivery.map((d) => <li key={d.signal}>{d.note}</li>)}</ul>
        </>
      )}

      <h3>Suggestions</h3>
      <ul>{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
    </section>
  );
}
