import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useFirestoreContext } from "./context/FirestoreContext";
import PinGate, { checkAuth, clearAuth } from "./components/PinGate";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProjectsPage from "./pages/ProjectsPage";
import InternshipsPage from "./pages/InternshipsPage";
import AcademicsPage from "./pages/AcademicsPage";
import DiaryPage from "./pages/DiaryPage";
import { RefreshCw } from "lucide-react";
import { ToastProvider } from "./context/ToastContext";

// ─── Inner App (has access to FirestoreContext) ────────────────────────────────
function InnerApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth);
  const { isLoading } = useFirestoreContext();

  // ── PIN gate ──
  if (!isAuthenticated) {
    return <PinGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  // ── Loading splash ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-cyan-400 animate-spin" />
          <p className="text-slate-400 text-sm font-mono">Initializing Command Center…</p>
        </div>
      </div>
    );
  }

  const handleLock = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  // ── Multi-page router ──
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout onLock={handleLock} />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="internships" element={<InternshipsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="academics" element={<AcademicsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="diary" element={<DiaryPage />} />
          {/* Catch-all: redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

export default function App() {
  return <InnerApp />;
}
