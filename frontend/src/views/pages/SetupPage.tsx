import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { OTHER_ROLE, useInterviewSetup } from "../../viewmodels/useInterviewSetup";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, JOB_ROLES } from "../../domain/options";
import OptionCards from "../components/OptionCards";
import StepIndicator from "../components/StepIndicator";

// Step 1: choose role, level and interview type. Consent is asked on the next step.
export default function SetupPage() {
  const headingRef = usePageTitle("Set up your interview");
  const navigate = useNavigate();
  const vm = useInterviewSetup();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (vm.submit()) navigate("/setup/devices");
    else document.getElementById("setup-errors")?.focus();
  }

  const errorLinks: { id: string; msg?: string }[] = [
    { id: "job-role", msg: vm.errors.role },
    { id: "custom-role", msg: vm.errors.customRole },
    { id: "level-intern", msg: vm.errors.level },
    { id: "type-technical", msg: vm.errors.type },
  ];

  return (
    <div className="narrow stack-lg">
      <StepIndicator current={0} />
      <div>
        <h1 ref={headingRef} tabIndex={-1}>
          Set up your interview
        </h1>
        <p className="lead">Questions and feedback are tailored to these choices.</p>
      </div>

      {vm.submitted && vm.errorCount > 0 && (
        <div className="error-summary" id="setup-errors" tabIndex={-1} role="alert" aria-labelledby="setup-errors-title">
          <p id="setup-errors-title" className="error-summary__title">
            Please fix {vm.errorCount === 1 ? "1 problem" : `${vm.errorCount} problems`} to continue
          </p>
          <ul>
            {errorLinks
              .filter((l) => l.msg)
              .map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(l.id)?.focus())}>
                    {l.msg}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      <form className="card form stack-lg" onSubmit={onSubmit} noValidate>
        <div className={`field${vm.errors.role ? " field--invalid" : ""}`}>
          <label className="field__label" htmlFor="job-role">
            Job role <span className="required" aria-hidden="true">*</span>
          </label>
          <select
            id="job-role"
            className="input"
            value={vm.role}
            onChange={(e) => vm.setRole(e.target.value)}
            aria-invalid={!!vm.errors.role}
            aria-describedby={vm.errors.role ? "job-role-error" : undefined}
            required
          >
            <option value="">Select a role</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value={OTHER_ROLE}>Other (type your own)</option>
          </select>
          {vm.errors.role && (
            <p className="field__error" id="job-role-error">
              {vm.errors.role}
            </p>
          )}
        </div>

        {vm.role === OTHER_ROLE && (
          <div className={`field${vm.errors.customRole ? " field--invalid" : ""}`}>
            <label className="field__label" htmlFor="custom-role">
              Your job role <span className="required" aria-hidden="true">*</span>
            </label>
            <p className="field__hint" id="custom-role-hint">
              Custom roles use the general software question set in demo mode.
            </p>
            <input
              id="custom-role"
              className="input"
              type="text"
              value={vm.customRole}
              onChange={(e) => vm.setCustomRole(e.target.value)}
              maxLength={80}
              autoComplete="organization-title"
              aria-invalid={!!vm.errors.customRole}
              aria-describedby={`custom-role-hint${vm.errors.customRole ? " custom-role-error" : ""}`}
              required
            />
            {vm.errors.customRole && (
              <p className="field__error" id="custom-role-error">
                {vm.errors.customRole}
              </p>
            )}
          </div>
        )}

        <OptionCards
          name="level"
          legend="Experience level"
          options={EXPERIENCE_LEVELS}
          value={vm.level}
          onChange={vm.setLevel}
          error={vm.errors.level}
        />

        <OptionCards
          name="type"
          legend="Interview type"
          options={INTERVIEW_TYPES}
          value={vm.type}
          onChange={vm.setType}
          error={vm.errors.type}
        />

        <div className="btn-row">
          <button type="submit" className="btn btn--primary btn--lg">
            Continue to device check
          </button>
        </div>
      </form>
    </div>
  );
}
