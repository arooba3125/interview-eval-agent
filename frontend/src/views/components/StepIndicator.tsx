const STEPS = ["Choose interview", "Check devices", "Interview", "Report"] as const;

/** Where the candidate is in the overall flow. */
export default function StepIndicator({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="steps" aria-label="Interview steps">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`steps__item steps__item--${state}`} aria-current={i === current ? "step" : undefined}>
            <span className="steps__num" aria-hidden="true">
              {i < current ? "✓" : i + 1}
            </span>
            <span className="steps__label">
              {label}
              {state === "done" && <span className="visually-hidden"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
