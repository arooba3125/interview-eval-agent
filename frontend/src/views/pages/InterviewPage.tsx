import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useInterviewSession } from "../../viewmodels/useInterviewSession";
import { useMediaRecorder } from "../../viewmodels/useMediaRecorder";
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES, MAX_ANSWER_SECONDS, labelFor } from "../../domain/options";
import QuestionCard from "../components/QuestionCard";
import QuestionProgress from "../components/QuestionProgress";
import CameraPreview from "../components/CameraPreview";
import RecordingControls from "../components/RecordingControls";
import AnalysisProgress from "../components/AnalysisProgress";
import FeedbackPanel from "../components/FeedbackPanel";
import StatusMessage from "../components/StatusMessage";
import StepIndicator from "../components/StepIndicator";
import PermissionHelp from "../components/PermissionHelp";
import TranscriptInput from "../components/TranscriptInput";

// Step 3: show a question, record, analyse, show feedback, continue.
export default function InterviewPage() {
  const { sessionId = "" } = useParams();
  const headingRef = usePageTitle("Interview");
  const navigate = useNavigate();
  const vm = useInterviewSession(sessionId);
  const cameraOn = vm.record?.camera_enabled ?? false;
  const media = useMediaRecorder({ video: cameraOn, maxSeconds: MAX_ANSWER_SECONDS });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);

  // Open the mic/camera once so the preview is live before recording.
  useEffect(() => {
    if (vm.record) void media.open();
  }, [vm.record]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each new take is transcribed (reusing the recording); discarding it clears the transcript.
  useEffect(() => {
    if (media.recording) vm.transcribeTake(media.recording.blob);
    else vm.clearTake();
  }, [media.recording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (vm.phase === "feedback") feedbackHeading.current?.focus();
    if (vm.phase === "done") {
      media.release();
      navigate(`/interview/${sessionId}/summary`, { replace: true });
    }
  }, [vm.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!vm.record) {
    return (
      <div className="narrow stack-lg">
        <h1 ref={headingRef} tabIndex={-1}>
          Interview not found
        </h1>
        <StatusMessage
          variant="empty"
          title="We could not find this practice session"
          actions={
            <Link to="/setup" className="btn btn--primary">
              Start a new interview
            </Link>
          }
        >
          It may have been started in another browser or removed from this device.
        </StatusMessage>
      </div>
    );
  }

  const s = vm.record.session;

  function submit() {
    if (media.recording) void vm.submit(media.recording.blob, media.recording.durationS);
  }

  function next() {
    media.discard();
    void vm.loadNext();
  }

  function endInterview() {
    media.release();
    vm.finishEarly();
    navigate(`/interview/${sessionId}/summary`);
  }

  const showQuestion = vm.question && (vm.phase === "answering" || vm.phase === "analyzing" || vm.phase === "feedback");

  return (
    <div className="stack-lg">
      <StepIndicator current={2} />
      <div className="room-head">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="h2">
            {s.job_role} interview
          </h1>
          <p className="muted small">
            {labelFor(EXPERIENCE_LEVELS, s.experience_level)} · {labelFor(INTERVIEW_TYPES, s.interview_type)} ·{" "}
            {cameraOn ? "Camera and microphone" : "Microphone only"}
          </p>
        </div>
        {vm.question && <QuestionProgress current={vm.question.index} total={vm.question.total} answered={vm.answeredCount} />}
        <div className="room-head__end">
          {confirmEnd ? (
            <div className="confirm" role="group" aria-label="Confirm ending the interview">
              <span className="small">End now? Answered questions are kept.</span>
              <button type="button" className="btn btn--danger btn--sm" onClick={endInterview}>
                End interview
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmEnd(false)} autoFocus>
                Keep going
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmEnd(true)}
              disabled={media.status === "recording" || vm.phase === "analyzing"}
            >
              End interview
            </button>
          )}
        </div>
      </div>

      {vm.phase === "loading" && <StatusMessage variant="loading" title="Loading the next question…" />}

      {vm.phase === "error" && (
        <StatusMessage
          variant="error"
          title="The question could not be loaded"
          actions={
            <button type="button" className="btn btn--primary" onClick={() => void vm.loadNext()}>
              Try again
            </button>
          }
        >
          {vm.loadError}
        </StatusMessage>
      )}

      {showQuestion && vm.question && (
        <div className="room">
          <div className="room__main stack-lg">
            <QuestionCard question={vm.question} />

            {vm.phase === "answering" && (
              <>
                {media.status === "error" ? (
                  <StatusMessage
                    variant="error"
                    title="We cannot access your microphone"
                    actions={
                      <button type="button" className="btn btn--primary" onClick={() => void media.open()}>
                        Try again
                      </button>
                    }
                  >
                    {media.error}
                    <PermissionHelp device="microphone" />
                  </StatusMessage>
                ) : (
                  <RecordingControls
                    status={media.status}
                    elapsed={media.elapsed}
                    level={media.level}
                    maxSeconds={MAX_ANSWER_SECONDS}
                    recording={media.recording}
                    hasVideo={cameraOn}
                    submitBusyLabel={vm.transcription.status === "loading" ? "Transcribing…" : undefined}
                    onRecord={() => void media.start()}
                    onStop={media.stop}
                    onDiscard={media.discard}
                    onSubmit={submit}
                  />
                )}
                <TranscriptInput
                  value={vm.transcriptDraft}
                  onChange={vm.setTranscriptDraft}
                  transcription={vm.transcription}
                  hasRecording={!!media.recording}
                  onRetry={vm.transcription.retry}
                />
                {vm.submitError && (
                  <StatusMessage
                    variant="error"
                    title="Your answer could not be analysed"
                    actions={
                      media.recording && (
                        <button type="button" className="btn btn--primary" onClick={submit}>
                          Retry submission
                        </button>
                      )
                    }
                  >
                    {vm.submitError} Your recording is still here, so you can retry or record again.
                  </StatusMessage>
                )}
              </>
            )}

            {vm.phase === "analyzing" && <AnalysisProgress stage={vm.stage} />}

            {vm.phase === "feedback" && vm.feedback && (
              <section className="card stack-lg" aria-labelledby="feedback-heading">
                <h2 id="feedback-heading" ref={feedbackHeading} tabIndex={-1}>
                  Feedback on question {vm.question.index}
                </h2>
                <FeedbackPanel
                  feedback={vm.feedback}
                  liveTranscript={vm.textEmotion.transcript}
                  textEmotion={{ state: vm.textEmotion, onRetry: vm.textEmotion.retry }}
                />
                <div className="btn-row">
                  {vm.isLastQuestion ? (
                    <button type="button" className="btn btn--primary btn--lg" onClick={next}>
                      See your interview report
                    </button>
                  ) : (
                    <button type="button" className="btn btn--primary btn--lg" onClick={next}>
                      Next question
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="room__side stack-md" aria-label="Your camera and microphone">
            {cameraOn ? (
              <CameraPreview stream={media.stream} recording={media.status === "recording"} placeholder="Starting camera…" />
            ) : (
              <div className="card mic-only">
                <span className="mic-only__icon" aria-hidden="true">
                  🎙
                </span>
                <p>Microphone only</p>
                {media.status === "recording" && (
                  <span className="pill pill--rec">
                    <span className="rec-dot" aria-hidden="true" /> Recording
                  </span>
                )}
              </div>
            )}
            <div className="card tips">
              <p className="tips__title">Answer tips</p>
              <ul>
                <li>Start with a direct answer, then explain.</li>
                <li>Use one concrete example.</li>
                <li>It is fine to pause and think.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
