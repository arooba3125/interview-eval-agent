import { useEffect, useRef } from "react";
import type { RecorderStatus, Recording } from "../../viewmodels/useMediaRecorder";
import { formatDuration } from "../../domain/scoring";
import RecordingTimer from "./RecordingTimer";
import MicLevelMeter from "./MicLevelMeter";
import StatusMessage from "./StatusMessage";

interface Props {
  status: RecorderStatus;
  elapsed: number;
  /** Live microphone input level, 0..1. */
  level: number;
  maxSeconds: number;
  recording: Recording | null;
  hasVideo: boolean;
  disabled?: boolean;
  onRecord: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onSubmit: () => void;
}

/** Record, stop, replay (native player), re-record and submit for one answer. */
export default function RecordingControls(p: Props) {
  const isRecording = p.status === "recording";
  const stopRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus on the next sensible control as the state changes.
  useEffect(() => {
    if (isRecording) stopRef.current?.focus();
    else if (p.status === "recorded") submitRef.current?.focus();
  }, [isRecording, p.status]);

  const announcement =
    p.status === "recording" ? "Recording started" : p.status === "recorded" ? "Recording stopped. Review your answer, then submit." : "";

  return (
    <section className="card controls" aria-label="Answer recording">
      <p className="visually-hidden" aria-live="assertive">
        {announcement}
      </p>
      <div className="controls__top">
        <RecordingTimer elapsed={p.recording ? p.recording.durationS : p.elapsed} max={p.maxSeconds} recording={isRecording} />
        {isRecording && (
          <span className="pill pill--rec">
            <span className="rec-dot" aria-hidden="true" /> Recording
          </span>
        )}
        {(isRecording || p.status === "live") && (
          <span className="controls__meter" title="Microphone input level">
            <span className="visually-hidden">Microphone input level</span>
            <MicLevelMeter level={p.level} active />
          </span>
        )}
      </div>

      {p.recording?.silent && (
        <StatusMessage variant="warning" title="No sound was picked up in this recording">
          <p>
            The recording ran, but your microphone sent silence. This usually means the browser cannot hear the
            microphone, even if other apps can. Check these, then reload this page and record again:
          </p>
          <ul>
            <li>
              Windows: Settings › Privacy &amp; security › Microphone. Turn on <strong>Microphone access</strong> and{" "}
              <strong>Let desktop apps access your microphone</strong>. Store apps such as WhatsApp have a separate
              switch, so they can work while browsers are blocked.
            </li>
            <li>
              In the browser, click the icon at the left of the address bar, open the microphone setting and choose
              the microphone you use in other apps.
            </li>
            <li>Make sure the microphone is not muted (headset switch or a mute key).</li>
          </ul>
          <p>You can still submit this take, but there will be nothing to hear on replay.</p>
        </StatusMessage>
      )}

      {p.recording ? (
        <div className="replay">
          <p className="replay__label">
            Your answer ({formatDuration(p.recording.durationS)}). Replay it before submitting if you like.
          </p>
          {p.hasVideo ? (
            <video className="replay__media" src={p.recording.url} controls playsInline aria-label="Replay of your recorded answer" />
          ) : (
            <audio className="replay__media" src={p.recording.url} controls aria-label="Replay of your recorded answer" />
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--secondary" onClick={p.onDiscard} disabled={p.disabled}>
              Record again
            </button>
            <button ref={submitRef} type="button" className="btn btn--primary" onClick={p.onSubmit} disabled={p.disabled}>
              Submit answer
            </button>
          </div>
        </div>
      ) : (
        <div className="btn-row">
          {isRecording ? (
            <button ref={stopRef} type="button" className="btn btn--danger btn--lg" onClick={p.onStop}>
              <span className="stop-icon" aria-hidden="true" /> Stop recording
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={p.onRecord}
              disabled={p.disabled || p.status === "opening"}
            >
              <span className="rec-dot rec-dot--light" aria-hidden="true" />
              {p.status === "opening" ? "Opening microphone…" : "Start recording"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
