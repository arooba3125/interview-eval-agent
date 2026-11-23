import { formatDuration } from "../../domain/scoring";

export default function RecordingTimer({ elapsed, max, recording }: { elapsed: number; max: number; recording: boolean }) {
  const nearLimit = recording && max - elapsed <= 15;
  return (
    <div className={`timer${recording ? " timer--live" : ""}${nearLimit ? " timer--warn" : ""}`}>
      <span className="timer__time" aria-hidden="true">
        {formatDuration(elapsed)}
      </span>
      <span className="timer__max" aria-hidden="true">
        / {formatDuration(max)}
      </span>
      <span className="visually-hidden">
        {formatDuration(elapsed)} recorded of {formatDuration(max)} maximum
      </span>
      {nearLimit && <span className="timer__note">Recording stops at {formatDuration(max)}</span>}
    </div>
  );
}
