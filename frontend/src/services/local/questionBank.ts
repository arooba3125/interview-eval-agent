// Practice question bank used by the local question flow (services/local). These are interview
// questions to answer, not results. The backend question bank (QuestionService) is not filled in yet.

export interface PracticeQuestion {
  text: string;
  topic: string;
  kind: "technical" | "behavioural";
}

const T = (topic: string, text: string): PracticeQuestion => ({ topic, text, kind: "technical" });
const B = (topic: string, text: string): PracticeQuestion => ({ topic, text, kind: "behavioural" });

export const TECHNICAL_BANK: Record<string, PracticeQuestion[]> = {
  "Software Engineer": [
    T("Data structures", "When would you choose a hash map over a balanced binary search tree?"),
    T("System design", "How would you design a URL shortener that handles millions of requests a day?"),
    T("Testing", "How do you decide what to cover with unit tests versus integration tests?"),
    T("Debugging", "Walk me through how you would track down an intermittent bug in production."),
  ],
  "Frontend Developer": [
    T("Rendering", "What causes unnecessary re-renders in React, and how do you prevent them?"),
    T("Accessibility", "How do you make a custom dropdown accessible to keyboard and screen-reader users?"),
    T("Performance", "A page loads slowly on mobile. How do you find and fix the cause?"),
    T("State", "When would you reach for a global state library instead of component state?"),
  ],
  "Backend Developer": [
    T("APIs", "How do you design a REST API so it can change without breaking clients?"),
    T("Databases", "Explain database indexing and when an index can hurt performance."),
    T("Concurrency", "How would you prevent two requests from double-charging the same order?"),
    T("Reliability", "How do you make a service resilient when a dependency is slow?"),
  ],
  "Data Scientist": [
    T("Statistics", "How would you explain a p-value to a non-technical stakeholder?"),
    T("Modelling", "How do you handle a heavily imbalanced classification dataset?"),
    T("Experimentation", "How would you design an A/B test for a new checkout flow?"),
    T("Features", "Tell me how you would detect and handle data leakage."),
  ],
  "Machine Learning Engineer": [
    T("Deep learning", "Explain the vanishing gradient problem and how modern networks address it."),
    T("Training", "How do you tell whether a model is overfitting, and what do you do about it?"),
    T("Deployment", "What changes when you move a model from a notebook to production?"),
    T("Transformers", "What problem does self-attention solve compared to RNNs?"),
  ],
  "Product Manager": [
    T("Prioritisation", "How do you decide what goes into the next release when everything feels urgent?"),
    T("Metrics", "How would you measure the success of a new onboarding flow?"),
    T("Discovery", "How do you validate a feature idea before building it?"),
    T("Execution", "A launch date is at risk. What do you do?"),
  ],
};

export const BEHAVIOURAL_BANK: PracticeQuestion[] = [
  B("Teamwork", "Tell me about a time you disagreed with a teammate. How did you resolve it?"),
  B("Ownership", "Describe a project where something went wrong. What did you do?"),
  B("Learning", "Tell me about a time you had to learn something new quickly."),
  B("Impact", "What is the piece of work you are most proud of, and why?"),
];

/** Four questions per session: technical, behavioural, or two of each. */
export function pickQuestions(role: string, type: string): PracticeQuestion[] {
  const technical = TECHNICAL_BANK[role] ?? TECHNICAL_BANK["Software Engineer"];
  if (type === "technical") return technical.slice(0, 4);
  if (type === "behavioural") return BEHAVIOURAL_BANK.slice(0, 4);
  return [technical[0], BEHAVIOURAL_BANK[0], technical[1], BEHAVIOURAL_BANK[2]];
}
