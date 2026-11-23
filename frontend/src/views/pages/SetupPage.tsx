import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";

// Step 1: choose role, level, interview type, and give consent for delivery analysis.
export default function SetupPage() {
  const navigate = useNavigate();
  const [jobRole, setJobRole] = useState("Software Engineer");
  const [consentVideo, setConsentVideo] = useState(false);

  async function start() {
    const session = await api.createSession({
      job_role: jobRole,
      experience_level: "junior",
      interview_type: "technical",
      consent_audio_analysis: true,
      consent_video_analysis: consentVideo,
    });
    navigate(`/interview/${session.id}`);
  }

  return (
    <main>
      <h1>Set up your interview</h1>
      <input value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
      <label>
        <input type="checkbox" checked={consentVideo} onChange={(e) => setConsentVideo(e.target.checked)} />
        Allow camera analysis of gaze, facial and hand movement
      </label>
      <button onClick={start}>Start</button>
    </main>
  );
}
