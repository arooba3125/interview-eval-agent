import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInterviewSession } from "../../viewmodels/useInterviewSession";
import { useMediaRecorder } from "../../viewmodels/useMediaRecorder";
import QuestionCard from "../components/QuestionCard";
import CameraPreview from "../components/CameraPreview";
import FeedbackPanel from "../components/FeedbackPanel";

// Steps 2 to 6: show question, record, wait for analysis, show feedback, continue.
export default function InterviewPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const vm = useInterviewSession(sessionId);
  const media = useMediaRecorder(true);

  async function startAnswer() {
    await media.start();
    vm.setPhase("recording");
  }

  async function finishAnswer() {
    const blob = await media.stop();
    await vm.submit(blob);
  }

  useEffect(() => {
    if (vm.phase === "done") {
      media.release();
      navigate(`/interview/${sessionId}/summary`);
    }
  }, [vm.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main>
      {vm.question && <QuestionCard question={vm.question} />}
      <CameraPreview stream={media.stream} />
      {vm.phase === "ready" && <button onClick={startAnswer}>Start answering</button>}
      {vm.phase === "recording" && <button onClick={finishAnswer}>Finish answer</button>}
      {vm.phase === "analyzing" && <p>Analysing your answer…</p>}
      {vm.phase === "feedback" && vm.feedback && (
        <>
          <FeedbackPanel feedback={vm.feedback} />
          <button onClick={vm.loadNext}>Next question</button>
        </>
      )}
      {vm.error && <p role="alert">{vm.error}</p>}
    </main>
  );
}
