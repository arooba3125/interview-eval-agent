import type { ExperienceLevel, InterviewType } from "./types";

export interface Option<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const JOB_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Product Manager",
] as const;

export const EXPERIENCE_LEVELS: Option<ExperienceLevel>[] = [
  { value: "intern", label: "Intern", description: "Student or first internship" },
  { value: "junior", label: "Junior", description: "0 to 2 years" },
  { value: "mid", label: "Mid-level", description: "2 to 5 years" },
  { value: "senior", label: "Senior", description: "5+ years" },
];

export const INTERVIEW_TYPES: Option<InterviewType>[] = [
  { value: "technical", label: "Technical", description: "Concepts, design and problem solving" },
  { value: "behavioural", label: "Behavioural", description: "Past experience, teamwork and decisions" },
  { value: "mixed", label: "Mixed", description: "A blend of technical and behavioural" },
];

export const labelFor = <T extends string>(options: Option<T>[], value: string): string =>
  options.find((o) => o.value === value)?.label ?? value;

/** Longest answer the recorder accepts, in seconds. */
export const MAX_ANSWER_SECONDS = 180;
