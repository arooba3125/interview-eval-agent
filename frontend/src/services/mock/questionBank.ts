// SAMPLE question bank for demo mode. The real bank lives in the backend
// (QuestionService / question_repository) once it is filled in.

export interface MockQuestion {
  text: string;
  topic: string;
  /** Concepts a strong answer would usually mention. Drives sample feedback. */
  concepts: string[];
  kind: "technical" | "behavioural";
}

const T = (topic: string, text: string, concepts: string[]): MockQuestion => ({ topic, text, concepts, kind: "technical" });
const B = (topic: string, text: string, concepts: string[]): MockQuestion => ({ topic, text, concepts, kind: "behavioural" });

export const TECHNICAL_BANK: Record<string, MockQuestion[]> = {
  "Software Engineer": [
    T("Data structures", "When would you choose a hash map over a balanced binary search tree?", ["average O(1) lookup", "ordering", "worst-case behaviour", "memory overhead"]),
    T("System design", "How would you design a URL shortener that handles millions of requests a day?", ["ID generation", "caching", "database choice", "read/write ratio"]),
    T("Testing", "How do you decide what to cover with unit tests versus integration tests?", ["test pyramid", "isolation", "speed", "realistic dependencies"]),
    T("Debugging", "Walk me through how you would track down an intermittent bug in production.", ["reproduce", "logs and metrics", "narrow the change", "add a regression test"]),
  ],
  "Frontend Developer": [
    T("Rendering", "What causes unnecessary re-renders in React, and how do you prevent them?", ["state placement", "memoisation", "stable references", "profiling"]),
    T("Accessibility", "How do you make a custom dropdown accessible to keyboard and screen-reader users?", ["ARIA roles", "focus management", "keyboard support", "labels"]),
    T("Performance", "A page loads slowly on mobile. How do you find and fix the cause?", ["Lighthouse or profiling", "bundle size", "image optimisation", "caching"]),
    T("State", "When would you reach for a global state library instead of component state?", ["shared state", "prop drilling", "server cache", "complexity cost"]),
  ],
  "Backend Developer": [
    T("APIs", "How do you design a REST API so it can change without breaking clients?", ["versioning", "backward compatibility", "clear contracts", "deprecation"]),
    T("Databases", "Explain database indexing and when an index can hurt performance.", ["B-tree", "read vs write cost", "selectivity", "query plans"]),
    T("Concurrency", "How would you prevent two requests from double-charging the same order?", ["idempotency keys", "transactions", "locking", "retries"]),
    T("Reliability", "How do you make a service resilient when a dependency is slow?", ["timeouts", "retries with backoff", "circuit breaker", "fallbacks"]),
  ],
  "Data Scientist": [
    T("Statistics", "How would you explain a p-value to a non-technical stakeholder?", ["null hypothesis", "probability of data", "not effect size", "significance threshold"]),
    T("Modelling", "How do you handle a heavily imbalanced classification dataset?", ["resampling", "class weights", "precision and recall", "threshold tuning"]),
    T("Experimentation", "How would you design an A/B test for a new checkout flow?", ["hypothesis", "sample size", "randomisation", "guardrail metrics"]),
    T("Features", "Tell me how you would detect and handle data leakage.", ["train/test split", "time ordering", "target leakage", "validation"]),
  ],
  "Machine Learning Engineer": [
    T("Deep learning", "Explain the vanishing gradient problem and how modern networks address it.", ["backpropagation", "activation functions", "residual connections", "normalisation"]),
    T("Training", "How do you tell whether a model is overfitting, and what do you do about it?", ["validation curve", "regularisation", "more data", "early stopping"]),
    T("Deployment", "What changes when you move a model from a notebook to production?", ["reproducibility", "latency", "monitoring", "model versioning"]),
    T("Transformers", "What problem does self-attention solve compared to RNNs?", ["long-range dependencies", "parallelism", "attention weights", "positional encoding"]),
  ],
  "Product Manager": [
    T("Prioritisation", "How do you decide what goes into the next release when everything feels urgent?", ["impact vs effort", "user evidence", "strategy alignment", "stakeholder trade-offs"]),
    T("Metrics", "How would you measure the success of a new onboarding flow?", ["activation metric", "baseline", "leading indicators", "qualitative feedback"]),
    T("Discovery", "How do you validate a feature idea before building it?", ["user interviews", "prototypes", "assumptions", "success criteria"]),
    T("Execution", "A launch date is at risk. What do you do?", ["scope trade-offs", "communicate early", "root cause", "re-plan"]),
  ],
};

export const BEHAVIOURAL_BANK: MockQuestion[] = [
  B("Teamwork", "Tell me about a time you disagreed with a teammate. How did you resolve it?", ["situation", "your action", "listening", "outcome"]),
  B("Ownership", "Describe a project where something went wrong. What did you do?", ["situation", "responsibility", "action taken", "lesson learned"]),
  B("Learning", "Tell me about a time you had to learn something new quickly.", ["context", "learning approach", "applied result", "reflection"]),
  B("Impact", "What is the piece of work you are most proud of, and why?", ["problem", "your contribution", "measurable result", "why it mattered"]),
];

/** Four questions per session: technical, behavioural, or two of each. */
export function pickQuestions(role: string, type: string): MockQuestion[] {
  const technical = TECHNICAL_BANK[role] ?? TECHNICAL_BANK["Software Engineer"];
  if (type === "technical") return technical.slice(0, 4);
  if (type === "behavioural") return BEHAVIOURAL_BANK.slice(0, 4);
  return [technical[0], BEHAVIOURAL_BANK[0], technical[1], BEHAVIOURAL_BANK[2]];
}
