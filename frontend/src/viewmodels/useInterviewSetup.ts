import { useCallback, useState } from "react";
import type { ExperienceLevel, InterviewConfig, InterviewType } from "../domain/types";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, JOB_ROLES } from "../domain/options";
import { setupDraft } from "../services/setupDraft";

export const OTHER_ROLE = "__other__";

type Field = "role" | "customRole" | "level" | "type";
export type SetupErrors = Partial<Record<Field, string>>;

/** ViewModel for the setup form: role, experience level and interview type, with validation. */
export function useInterviewSetup() {
  const draft = setupDraft.load();
  const draftIsKnownRole = !!draft && (JOB_ROLES as readonly string[]).includes(draft.job_role);

  const [role, setRole] = useState<string>(draft ? (draftIsKnownRole ? draft.job_role : OTHER_ROLE) : "");
  const [customRole, setCustomRole] = useState(draft && !draftIsKnownRole ? draft.job_role : "");
  const [level, setLevel] = useState<ExperienceLevel | "">(draft?.experience_level ?? "");
  const [type, setType] = useState<InterviewType | "">(draft?.interview_type ?? "");
  const [errors, setErrors] = useState<SetupErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = useCallback((): SetupErrors => {
    const e: SetupErrors = {};
    if (!role) e.role = "Choose the job role you are practising for.";
    if (role === OTHER_ROLE) {
      const r = customRole.trim();
      if (r.length < 2) e.customRole = "Enter a job role of at least 2 characters.";
      else if (r.length > 60) e.customRole = "Keep the job role under 60 characters.";
    }
    if (!level || !EXPERIENCE_LEVELS.some((o) => o.value === level)) e.level = "Choose your experience level.";
    if (!type || !INTERVIEW_TYPES.some((o) => o.value === type)) e.type = "Choose an interview type.";
    return e;
  }, [role, customRole, level, type]);

  /** Returns the config when valid (and saves it for the next step), otherwise null. */
  const submit = useCallback((): InterviewConfig | null => {
    setSubmitted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return null;
    const config: InterviewConfig = {
      job_role: role === OTHER_ROLE ? customRole.trim() : role,
      experience_level: level as ExperienceLevel,
      interview_type: type as InterviewType,
    };
    setupDraft.save(config);
    return config;
  }, [validate, role, customRole, level, type]);

  // After the first submit, re-validate as the user fixes fields.
  const liveErrors = submitted ? validate() : errors;

  return {
    role, setRole, customRole, setCustomRole, level, setLevel, type, setType,
    errors: liveErrors,
    errorCount: Object.keys(liveErrors).length,
    submitted,
    submit,
  };
}
