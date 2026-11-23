import type { Option } from "../../domain/options";

interface Props<T extends string> {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
}

/** A radio group drawn as cards. Native radios keep arrow-key navigation. */
export default function OptionCards<T extends string>({ name, legend, options, value, onChange, error }: Props<T>) {
  const errorId = `${name}-error`;
  return (
    <fieldset className={`field option-cards${error ? " field--invalid" : ""}`} aria-describedby={error ? errorId : undefined}>
      <legend className="field__label">
        {legend} <span className="required" aria-hidden="true">*</span>
      </legend>
      <div className="option-cards__grid">
        {options.map((o) => (
          <label key={o.value} className={`option-card${value === o.value ? " option-card--selected" : ""}`}>
            <input
              id={`${name}-${o.value}`}
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-invalid={!!error}
              required
            />
            <span className="option-card__label">{o.label}</span>
            <span className="option-card__desc">{o.description}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
