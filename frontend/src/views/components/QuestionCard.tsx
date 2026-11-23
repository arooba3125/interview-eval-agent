import type { Question } from "../../domain/types";

export default function QuestionCard({ question }: { question: Question }) {
  return (
    <section>
      <small>
        Question {question.index} of {question.total} · {question.topic}
      </small>
      <h2>{question.text}</h2>
    </section>
  );
}
