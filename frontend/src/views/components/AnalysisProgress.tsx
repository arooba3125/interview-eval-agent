import { ANALYSIS_STAGES } from "../../viewmodels/useInterviewSession";

/** Shown while an answer is being analysed. */
export default function AnalysisProgress({ stage }: { stage: number }) {
  return (
    <section className="card analysis" aria-labelledby="analysis-title" aria-busy="true">
      <div className="analysis__head">
        <span className="spinner spinner--lg" aria-hidden="true" />
        <h2 id="analysis-title" className="h3">
          Analysing your answer
        </h2>
      </div>
      <ol className="analysis__stages">
        {ANALYSIS_STAGES.map((s, i) => (
          <li key={s} className={i < stage ? "is-done" : i === stage ? "is-current" : ""}>
            <span aria-hidden="true">{i < stage ? "✓" : i === stage ? "•" : "○"}</span> {s}
            {i < stage && <span className="visually-hidden"> (done)</span>}
            {i === stage && <span className="visually-hidden"> (in progress)</span>}
          </li>
        ))}
      </ol>
      <p className="visually-hidden" role="status">
        {ANALYSIS_STAGES[stage]}
      </p>
      <div className="skeleton-group" aria-hidden="true">
        <span className="skeleton skeleton--title" />
        <span className="skeleton" />
        <span className="skeleton skeleton--short" />
      </div>
    </section>
  );
}
