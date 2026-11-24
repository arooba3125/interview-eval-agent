import type { GazeDirection } from "../../domain/types";
import type { GazeState, GazeTally } from "../../viewmodels/useGazeObservation";
import StatusMessage from "./StatusMessage";

const LABELS: Record<GazeDirection | "no_face", string> = {
  toward_screen: "Toward the screen or camera",
  left: "To your left",
  right: "To your right",
  up: "Upward",
  down: "Downward",
  no_face: "No face found",
};

const ORDER: (GazeDirection | "no_face")[] = ["toward_screen", "left", "right", "up", "down", "no_face"];

export const GAZE_NOTICE =
  "Gaze direction is an approximate visual observation of where your eyes appear to point, estimated from a few " +
  "camera frames. It is not a psychological or candidate assessment: it does not measure confidence, anxiety, " +
  "passion, honesty, knowledge or job suitability, and looking away to think is normal.";

function Tally({ tally, samples }: { tally: GazeTally; samples: number }) {
  const rows = ORDER.filter((k) => tally[k] > 0);
  return (
    <div>
      <p className="concepts__title">This answer so far ({samples} {samples === 1 ? "reading" : "readings"})</p>
      <ul className="gaze-tally">
        {rows.map((k) => (
          <li key={k}>
            <span>{LABELS[k]}</span>
            <span className="gaze-tally__count">{tally[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  state: GazeState;
  onRetry: () => void;
  /** Error text from the camera/microphone, if opening them failed. */
  cameraError?: string | null;
}

/**
 * Live, approximate gaze direction while recording. Shown beside the camera, apart from the
 * answer feedback, transcription and text emotion results. Nothing here is stored.
 */
export default function GazeObservation({ state, onRetry, cameraError }: Props) {
  const { status, latest } = state;
  if (status === "off") return null;

  return (
    <section className="card gaze stack-sm" aria-labelledby="gaze-title" aria-busy={status === "loading"}>
      <div className="feedback__head">
        <h2 id="gaze-title" className="h3">
          Gaze direction
        </h2>
        <span className="badge badge--experimental" title="Live output from a local model">
          Approximate · live model
        </span>
      </div>

      {status === "no-consent" && (
        <p className="muted small">
          Off: you chose not to generate camera cues for this interview. Your camera is only shown to you.
        </p>
      )}

      {status === "unavailable" && (
        <StatusMessage variant="warning" compact title="Camera not available">
          {cameraError ?? "No camera picture is available, so gaze cannot be estimated."} Allow camera access in your
          browser's site settings, or check that no other app is using the camera, then reload this page.
        </StatusMessage>
      )}

      {status === "waiting" && (
        <p className="muted small">
          Starts when you record. A few small frames are analysed on this computer about every 3 seconds.
        </p>
      )}

      {status === "loading" && !latest && (
        <StatusMessage variant="loading" compact title="Estimating gaze…">
          The first estimate can take up to 20 seconds while the model loads.
        </StatusMessage>
      )}

      {status === "error" && (
        <StatusMessage
          variant="error"
          compact
          title="Gaze estimation stopped"
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
              Try again
            </button>
          }
        >
          {state.error && /[.!?]$/.test(state.error) ? state.error : `${state.error}.`} Your recording is not affected.
        </StatusMessage>
      )}

      {latest && (
        <div className="stack-sm" aria-live="polite">
          <p className="gaze__now">
            <span className="muted small">Latest estimate</span>
            <strong>{LABELS[latest.direction ?? "no_face"]}</strong>
            {latest.direction && (
              <span className="muted small">
                Confidence {Math.round(latest.confidence * 100)}% (agreement across {latest.frames_received} frames)
              </span>
            )}
          </p>
          <Tally tally={state.tally} samples={state.samples} />
        </div>
      )}

      {status !== "no-consent" && (
        <>
          <p className="cue-notice">{GAZE_NOTICE}</p>
          <p className="muted small">
            Frames are sent only to the backend on this computer, analysed in memory and discarded; no images are
            saved. Model trained on MPIIFaceGaze (MPIIGaze family, CC BY-NC-SA 4.0, non-commercial research use).
          </p>
        </>
      )}
    </section>
  );
}
