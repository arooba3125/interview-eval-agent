import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useDeviceCheck } from "../../viewmodels/useDeviceCheck";
import { setupDraft } from "../../services/setupDraft";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, labelFor } from "../../domain/options";
import StepIndicator from "../components/StepIndicator";
import StatusMessage from "../components/StatusMessage";
import CameraPreview from "../components/CameraPreview";
import MicLevelMeter from "../components/MicLevelMeter";
import DeviceStatusBadge from "../components/DeviceStatusBadge";
import PermissionHelp from "../components/PermissionHelp";

// Step 2: test microphone and camera, and give consent for analysis.
export default function DeviceCheckPage() {
  const headingRef = usePageTitle("Check your devices");
  const navigate = useNavigate();
  const [config] = useState(() => setupDraft.load());
  const vm = useDeviceCheck(config);

  if (!config) {
    return (
      <div className="narrow stack-lg">
        <h1 ref={headingRef} tabIndex={-1}>
          Check your devices
        </h1>
        <StatusMessage
          variant="empty"
          title="Choose your interview first"
          actions={
            <Link to="/setup" className="btn btn--primary">
              Go to interview setup
            </Link>
          }
        >
          We need your job role, level and interview type before testing devices.
        </StatusMessage>
      </div>
    );
  }

  async function onStart() {
    const id = await vm.start();
    if (id) navigate(`/interview/${id}`);
    else document.getElementById("start-blockers")?.focus();
  }

  const micBusy = vm.mic.status === "checking";
  const camBusy = vm.camera.status === "checking";

  return (
    <div className="stack-lg">
      <StepIndicator current={1} />
      <div className="page-head">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            Check your devices
          </h1>
          <p className="lead">Make sure we can hear you, and choose what is analysed.</p>
        </div>
        <div className="card config-summary">
          <p className="config-summary__role">{config.job_role}</p>
          <p className="muted small">
            {labelFor(EXPERIENCE_LEVELS, config.experience_level)} · {labelFor(INTERVIEW_TYPES, config.interview_type)}
          </p>
          <Link to="/setup" className="small">
            Change<span className="visually-hidden"> interview choices</span>
          </Link>
        </div>
      </div>

      <div className="device-grid">
        <section className="card device" aria-labelledby="mic-title">
          <div className="device__head">
            <h2 id="mic-title" className="h3">
              Microphone <span className="required-tag">Required</span>
            </h2>
            <DeviceStatusBadge status={vm.mic.status} />
          </div>
          <p className="muted">Your spoken answers are recorded with your microphone.</p>

          {vm.mic.status === "ready" ? (
            <div className="stack-md">
              {vm.microphones.length > 1 && (
                <div className="field">
                  <label className="field__label" htmlFor="mic-select">
                    Which microphone
                  </label>
                  <select
                    id="mic-select"
                    className="input"
                    value={vm.micId ?? ""}
                    onChange={(e) => vm.chooseMic(e.target.value)}
                  >
                    {vm.micId && !vm.microphones.some((m) => m.id === vm.micId) && <option value={vm.micId}>Default</option>}
                    {vm.microphones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <p className="field__hint">If the level does not move when you speak, try another one. Your choice is used for the interview.</p>
                </div>
              )}
              <div className="mic-check">
                <MicLevelMeter level={vm.level} active />
                <p className="small" aria-live="polite">
                  {vm.heardSound ? "We can hear you." : "Say something to see the level move."}
                </p>
              </div>
              <div className="stack-sm">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={vm.recordTestClip}
                  disabled={vm.testClip.status === "recording"}
                >
                  {vm.testClip.status === "recording"
                    ? `Recording test… ${vm.testClip.secondsLeft}s`
                    : vm.testClip.url
                      ? "Record test clip again"
                      : "Record a 4-second test clip"}
                </button>
                {vm.testClip.url && vm.testClip.status === "ready" && (
                  <audio src={vm.testClip.url} controls aria-label="Play back your microphone test clip" />
                )}
                {vm.testClip.status === "ready" && vm.testClipSilent && (
                  <StatusMessage variant="warning" compact title="No sound was picked up">
                    This microphone sent silence.{" "}
                    {vm.microphones.length > 1
                      ? "Choose another microphone above, then record the test clip again."
                      : "Check that it is plugged in and not muted, then record again."}
                  </StatusMessage>
                )}
              </div>
            </div>
          ) : (
            <div className="stack-md">
              {(vm.mic.status === "blocked" || vm.mic.status === "error") && (
                <StatusMessage variant="error" compact title={vm.mic.status === "blocked" ? "Microphone access was blocked" : "Microphone not available"}>
                  {vm.mic.message}
                </StatusMessage>
              )}
              {vm.mic.status === "blocked" && <PermissionHelp device="microphone" />}
              <button type="button" className="btn btn--primary" onClick={vm.checkMic} disabled={micBusy}>
                {micBusy ? "Waiting for permission…" : vm.mic.status === "idle" ? "Test microphone" : "Try again"}
              </button>
            </div>
          )}
        </section>

        <section className="card device" aria-labelledby="cam-title">
          <div className="device__head">
            <h2 id="cam-title" className="h3">
              Camera <span className="optional-tag">Optional</span>
            </h2>
            {vm.useCamera && <DeviceStatusBadge status={vm.camera.status} />}
          </div>
          <label className="switch">
            <input type="checkbox" role="switch" checked={vm.useCamera} onChange={(e) => vm.toggleCamera(e.target.checked)} />
            <span className="switch__track" aria-hidden="true" />
            <span>Use my camera during the interview</span>
          </label>

          {vm.useCamera ? (
            <div className="stack-md">
              <CameraPreview stream={vm.cameraStream} placeholder={camBusy ? "Waiting for permission…" : "Camera not started"} />
              {(vm.camera.status === "blocked" || vm.camera.status === "error") && (
                <>
                  <StatusMessage variant="error" compact title={vm.camera.status === "blocked" ? "Camera access was blocked" : "Camera not available"}>
                    {vm.camera.message} You can also turn the camera off and continue with audio only.
                  </StatusMessage>
                  {vm.camera.status === "blocked" && <PermissionHelp device="camera" />}
                </>
              )}
              {vm.camera.status !== "ready" && (
                <button type="button" className="btn btn--primary" onClick={vm.checkCamera} disabled={camBusy}>
                  {camBusy ? "Waiting for permission…" : vm.camera.status === "idle" ? "Test camera" : "Try again"}
                </button>
              )}
            </div>
          ) : (
            <p className="muted">Camera is off. The interview will be audio only.</p>
          )}
        </section>
      </div>

      <section className="card consent" aria-labelledby="consent-title">
        <h2 id="consent-title" className="h3">
          Consent
        </h2>
        <div className="stack-md">
          <label className="check">
            <input type="checkbox" checked={vm.consentAudio} onChange={(e) => vm.setConsentAudio(e.target.checked)} aria-describedby="consent-audio-desc" />
            <span>
              <strong>Record and analyse my spoken answers</strong> <span className="required-tag">Required</span>
              <span className="check__desc" id="consent-audio-desc">
                Used to transcribe the answer, score its content, and measure speaking pace, pauses and volume.
              </span>
            </span>
          </label>
          <label className={`check${!vm.useCamera ? " check--disabled" : ""}`}>
            <input
              type="checkbox"
              checked={vm.consentVideo}
              disabled={!vm.useCamera}
              onChange={(e) => vm.setConsentVideo(e.target.checked)}
              aria-describedby="consent-video-desc"
            />
            <span>
              <strong>Also generate camera cues</strong> <span className="optional-tag">Optional</span>
              <span className="check__desc" id="consent-video-desc">
                {vm.useCamera
                  ? "Reports how often your face was oriented toward the camera. It is an observable cue only; it does not judge confidence, emotion or suitability. Without this, the camera is only shown to you and recorded for your replay."
                  : "Turn the camera on to choose this."}
              </span>
            </span>
          </label>
        </div>
      </section>

      {vm.attemptedStart && vm.blockers.length > 0 && (
        <div className="error-summary" id="start-blockers" tabIndex={-1} role="alert">
          <p className="error-summary__title">Before you start</p>
          <ul>
            {vm.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {vm.startError && (
        <StatusMessage
          variant="error"
          title="The interview could not start"
          actions={
            <button type="button" className="btn btn--secondary" onClick={onStart}>
              Try again
            </button>
          }
        >
          {vm.startError}
        </StatusMessage>
      )}

      <div className="btn-row">
        <Link to="/setup" className="btn btn--ghost">
          Back
        </Link>
        <button type="button" className="btn btn--primary btn--lg" onClick={onStart} disabled={vm.starting} aria-describedby="start-hint">
          {vm.starting ? "Starting…" : "Start interview"}
        </button>
      </div>
      <p id="start-hint" className="muted small text-right">
        You can replay and re-record each answer before submitting it.
      </p>
    </div>
  );
}
