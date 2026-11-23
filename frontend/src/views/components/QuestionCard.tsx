import type { Question } from "../../domain/types";

export default function QuestionCard({ question }: { question: Question }) {
  return (
    <section className="card question-card" aria-labelledby="question-text">
      <p className="eyebrow">{question.topic}</p>
      <h2 id="question-text" className="question-card__text">
        {question.text}
      </h2>
      <p className="question-card__hint">Take a moment to plan, then record when you are ready. Aim for 1 to 2 minutes.</p>
    </section>
  );
}
