interface Props {
  current: number; // 1-based
  total: number;
  answered: number;
}

/** "Question 2 of 4" with a segmented bar. */
export default function QuestionProgress({ current, total, answered }: Props) {
  return (
    <div className="q-progress">
      <p className="q-progress__label" id="q-progress-label">
        Question {current} of {total}
      </p>
      <div
        className="q-progress__bar"
        role="progressbar"
        aria-labelledby="q-progress-label"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={`${answered} of ${total} answered`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`q-progress__seg${i < answered ? " is-done" : i === current - 1 ? " is-current" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
