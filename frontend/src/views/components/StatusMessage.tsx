import type { ReactNode } from "react";

type Variant = "loading" | "empty" | "error" | "warning" | "info" | "success";

const ICON: Record<Variant, string> = { loading: "", empty: "○", error: "!", warning: "!", info: "i", success: "✓" };

interface Props {
  variant: Variant;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

/** Shared loading, empty, error and notice state. Errors are announced immediately. */
export default function StatusMessage({ variant, title, children, actions, compact }: Props) {
  const role = variant === "error" ? "alert" : variant === "loading" ? "status" : undefined;
  return (
    <div className={`status status--${variant}${compact ? " status--compact" : ""}`} role={role} aria-live={role ? undefined : "polite"}>
      <div className="status__icon" aria-hidden="true">
        {variant === "loading" ? <span className="spinner" /> : ICON[variant]}
      </div>
      <div className="status__body">
        <p className="status__title">{title}</p>
        {children && <div className="status__text">{children}</div>}
        {actions && <div className="status__actions">{actions}</div>}
      </div>
    </div>
  );
}
