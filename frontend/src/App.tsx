import { Route, Routes } from "react-router-dom";
import SetupPage from "./views/pages/SetupPage";
import InterviewPage from "./views/pages/InterviewPage";
import SummaryPage from "./views/pages/SummaryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SetupPage />} />
      <Route path="/interview/:sessionId" element={<InterviewPage />} />
      <Route path="/interview/:sessionId/summary" element={<SummaryPage />} />
    </Routes>
  );
}
