import { Route, Routes } from "react-router-dom";
import AppLayout from "./views/layout/AppLayout";
import WelcomePage from "./views/pages/WelcomePage";
import SetupPage from "./views/pages/SetupPage";
import DeviceCheckPage from "./views/pages/DeviceCheckPage";
import InterviewPage from "./views/pages/InterviewPage";
import SummaryPage from "./views/pages/SummaryPage";
import HistoryPage from "./views/pages/HistoryPage";
import NotFoundPage from "./views/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/setup/devices" element={<DeviceCheckPage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="/interview/:sessionId/summary" element={<SummaryPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
