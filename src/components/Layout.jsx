import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  FolderKanban,
  GraduationCap,
  Briefcase,
  Terminal,
  Wifi,
  WifiOff,
  LogOut,
  ShieldAlert,
  Brain,
  Send,
  Search,
  Moon,
  Timer,
  ChevronRight,
  Play,
  Square,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  BookMarked
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useFirestoreContext } from "../context/FirestoreContext";
import { exportJsonBackup, importJsonBackup, exportWeeklyMarkdown } from "../utils/exportUtils";
import { useToast } from "../context/ToastContext";
import QuickCaptureDrawer from "./QuickCaptureDrawer";
import CommandPalette from "./CommandPalette";
import EODModal from "./EODModal";
import ManualWorkModal from "./ManualWorkModal";
import ErrandModal from "./ErrandModal";
import ZenModeModal from "./ZenModeModal";

// ─── 7 Dedicated Navigation Routes ───────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard",   shortcut: "1", end: true  },
  { to: "/tasks",       icon: CheckSquare,     label: "Tasks",       shortcut: "2", end: false },
  { to: "/internships", icon: Briefcase,       label: "Internships", shortcut: "3", end: false },
  { to: "/projects",    icon: FolderKanban,    label: "Projects",    shortcut: "4", end: false },
  { to: "/academics",   icon: GraduationCap,   label: "Academics",   shortcut: "5", end: false },
  { to: "/analytics",   icon: BarChart2,       label: "Analytics",   shortcut: "6", end: false },
  { to: "/diary",       icon: BookMarked,      label: "Daily Diary", shortcut: "7", end: false },
];

const ROUTE_TITLES = {
  "/": "Dashboard Cockpit",
  "/tasks": "Task Master Engine",
  "/internships": "Dual Internships Command",
  "/projects": "Projects & Startup R&D",
  "/academics": "B.Tech Sem 3 & Certifications",
  "/analytics": "Analytics, Logs & Backups",
  "/diary": "Daily Diary & Life Journal",
};

function formatTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) return "45:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Layout({ onLock }) {
  const {
    data,
    updateData,
    isFirebaseConfigured,
    logManualWork,
    restoreFullBackup,
    effectiveSprints,
    isBetaSubmittedToday,
  } = useFirestoreContext();

  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [quickCaptureText, setQuickCaptureText] = useState("");
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEODModalOpen, setIsEODModalOpen] = useState(false);
  const [isManualWorkOpen, setIsManualWorkOpen] = useState(false);
  const [isErrandOpen, setIsErrandOpen] = useState(false);
  const [isZenOpen, setIsZenOpen] = useState(false);

  const isExamMode = Boolean(data.globalState?.isExamModeActive);
  const isTimerRunning = Boolean(data.timerState?.isRunning);
  const isTimerPaused = Boolean(data.timerState?.isPausedForErrand);

  // Active task & queue
  const dailyTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
  const activeTask = dailyTasks.find((t) => t.status === "active") || null;

  // Global Keyboard Shortcuts (1-6 for routes, Space for timer, F for Zen, E for Errand, L for Log)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in input or textarea
      const targetTag = e.target.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setIsQuickCaptureOpen((prev) => !prev);
      } else if (e.key === "1") {
        navigate("/");
      } else if (e.key === "2") {
        navigate("/tasks");
      } else if (e.key === "3") {
        navigate("/internships");
      } else if (e.key === "4") {
        navigate("/projects");
      } else if (e.key === "5") {
        navigate("/academics");
      } else if (e.key === "6") {
        navigate("/analytics");
      } else if (e.key === "7") {
        navigate("/diary");
      } else if (e.code === "Space") {
        e.preventDefault();
        const nextState = !isTimerRunning;
        updateData({
          "timerState.isRunning": nextState,
          "timerState.isPausedForErrand": false,
        });
        showToast(nextState ? "▶ Sprint Started" : "⏸ Sprint Paused", nextState ? "success" : "info");
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsZenOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        updateData({ "timerState.isRunning": false, "timerState.isPausedForErrand": true });
        setIsErrandOpen(true);
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        setIsManualWorkOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isTimerRunning, updateData, showToast]);

  // Live Countdowns (Beta 10 PM and 11:55 PM Freeze)
  const [betaTimeLeft, setBetaTimeLeft] = useState("");
  const [freezeTimeLeft, setFreezeTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();

      // Beta 10 PM
      const betaDeadline = new Date(now);
      betaDeadline.setHours(22, 0, 0, 0);
      const betaDiff = betaDeadline.getTime() - now.getTime();
      if (betaDiff <= 0) {
        setBetaTimeLeft("PAST 10 PM");
      } else {
        const hrs = String(Math.floor(betaDiff / (1000 * 60 * 60))).padStart(2, "0");
        const mins = String(Math.floor((betaDiff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
        const secs = String(Math.floor((betaDiff % (1000 * 60)) / 1000)).padStart(2, "0");
        setBetaTimeLeft(`${hrs}:${mins}:${secs}`);
      }

      // 11:55 PM Freeze
      const freezeDeadline = new Date(now);
      freezeDeadline.setHours(23, 55, 0, 0);
      const freezeDiff = freezeDeadline.getTime() - now.getTime();
      if (freezeDiff <= 0) {
        setFreezeTimeLeft("FROZEN");
      } else {
        const hrs = Math.floor(freezeDiff / (1000 * 60 * 60));
        const mins = Math.floor((freezeDiff % (1000 * 60 * 60)) / (1000 * 60));
        setFreezeTimeLeft(`${hrs}h ${mins}m`);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  // Smart Autopilot Recommendation Calculation
  const getAutopilot = () => {
    const now = new Date();
    const hours = now.getHours();
    const isBetaDone = Boolean(isBetaSubmittedToday);
    const todayTasks = dailyTasks.filter((t) => {
      if (t.status !== "today") return false;
      const lower = t.text?.toLowerCase() || "";
      if (lower.includes("beta") || lower.includes("daily submission")) return false;
      return true;
    });

    if (hours >= 20 && !isBetaDone) {
      return {
        label: "Submit Beta 10 PM Daily Proof",
        action: () => navigate("/internships"),
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        buttonText: "⚡ Submit",
      };
    }
    if (isExamMode) {
      return {
        label: "Operating Systems / DSA Prep",
        action: () => {
          navigate("/academics");
          updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
          showToast("⚡ Autopilot: Academics sprint launched!", "success");
        },
        color: "text-amber-300 bg-amber-500/10 border-amber-500/30",
        buttonText: "⚡ Start",
      };
    }
    if (activeTask && !activeTask.text?.toLowerCase().includes("beta") && !activeTask.text?.toLowerCase().includes("daily submission")) {
      return {
        label: `Focus: ${activeTask.text.slice(0, 24)}`,
        action: () => {
          updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
          showToast("⚡ Autopilot: Starting active sprint!", "success");
        },
        color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
        buttonText: "⚡ Start",
      };
    }
    if (todayTasks.length > 0) {
      const nextTask = todayTasks[0];
      return {
        label: `Next: ${nextTask.text.slice(0, 24)}`,
        action: () => {
          const updated = dailyTasks.map((t) =>
            t.id === nextTask.id ? { ...t, status: "active" } : t.status === "active" ? { ...t, status: "today" } : t
          );
          updateData({
            dailyTasks: updated,
            "timerState.isRunning": true,
            "timerState.isPausedForErrand": false,
          });
          showToast(`⚡ Autopilot: Queued & started "${nextTask.text.slice(0, 20)}"`, "success");
        },
        color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
        buttonText: "⚡ Start",
      };
    }
    return {
      label: hours < 17 ? "Next: DevOps Portfolio Build" : "Next: Startup R&D Sprint",
      action: () => {
        updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
        showToast("⚡ Autopilot: Technical sprint launched!", "success");
      },
      color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
      buttonText: "⚡ Start",
    };
  };

  const autopilot = getAutopilot();
  const currentRouteTitle = ROUTE_TITLES[location.pathname] || "Command Center";
  const isBetaSubmitted = Boolean(isBetaSubmittedToday);

  const toggleExamMode = () => {
    updateData({ "globalState.isExamModeActive": !isExamMode });
    showToast(isExamMode ? "Exam Triage deactivated" : "🚨 Exam Triage Mode activated!", isExamMode ? "info" : "warning");
  };

  const handleQuickCapture = (e) => {
    e.preventDefault();
    if (!quickCaptureText.trim()) return;
    const currentDump = Array.isArray(data.brainDump) ? data.brainDump : [];
    updateData({ brainDump: [quickCaptureText.trim(), ...currentDump] });
    setQuickCaptureText("");
    showToast("✓ Thought captured to Brain Dump", "success");
  };

  const handleAddToStartup = (text) => {
    const currentNotes = data.startupRD?.researchNotes || "";
    const newNotes = currentNotes ? `${currentNotes}\n• ${text}` : `• ${text}`;
    updateData({
      "startupRD.researchNotes": newNotes,
      "startupRD.lastSavedTimestamp": new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    showToast("✓ Added to Startup Scratchpad", "success");
  };

  const handleAddTask = (newTask) => {
    const current = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    updateData({ dailyTasks: [newTask, ...current] });
    showToast("✓ Task added", "success");
  };

  const handleAddLifeTask = (newLifeTask) => {
    const current = Array.isArray(data.lifeTasks) ? data.lifeTasks : [];
    updateData({ lifeTasks: [newLifeTask, ...current] });
    showToast("✓ Life chore added", "success");
  };

  const handleExportBackup = () => {
    exportJsonBackup(data);
    showToast("📥 Backup JSON downloaded", "success");
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("⏳ Restoring state & syncing...", "info");
      await importJsonBackup(file, async (parsed) => {
        await restoreFullBackup(parsed);
      });
      showToast("✓ Backup successfully restored & synced!", "success");
    } catch (err) {
      console.error("Backup restoration error:", err);
      showToast("Failed to restore backup: " + err.message, "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportMarkdown = async () => {
    try {
      await exportWeeklyMarkdown(data, effectiveSprints);
      showToast("📋 Weekly summary copied to clipboard!", "success");
    } catch (err) {
      showToast("Failed to copy markdown: " + err.message, "error");
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 select-none font-sans">
      {/* ── Global Modals & Drawers ────────────────────────────────────────── */}
      <QuickCaptureDrawer
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        brainDump={data.brainDump || []}
        onUpdateBrainDump={(dump) => updateData({ brainDump: dump })}
        onAddTask={handleAddTask}
        onAddLifeTask={handleAddLifeTask}
        onAddToStartup={handleAddToStartup}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        timerState={data.timerState}
        onUpdateTimer={(updates) => updateData(updates)}
        onToggleMode={() =>
          updateData({
            currentMode: data.currentMode === "early_exit" ? "full_stretch" : "early_exit",
          })
        }
        currentMode={data.currentMode}
        onOpenManualWork={() => setIsManualWorkOpen(true)}
        onOpenEOD={() => setIsEODModalOpen(true)}
        onExportBackup={handleExportBackup}
        onTriggerImport={handleTriggerImport}
        onExportMarkdown={handleExportMarkdown}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileImport}
        className="hidden"
      />

      <EODModal
        isOpen={isEODModalOpen}
        onClose={() => setIsEODModalOpen(false)}
        data={data}
        updateData={updateData}
        onAddTask={handleAddTask}
        onLogWork={logManualWork}
      />

      <ManualWorkModal
        isOpen={isManualWorkOpen}
        onClose={() => setIsManualWorkOpen(false)}
        onLogWork={logManualWork}
      />

      <ErrandModal
        isOpen={isErrandOpen}
        contextNote={data.timerState?.currentContextNote || ""}
        onContextChange={(note) => updateData({ "timerState.currentContextNote": note })}
        onResume={() => {
          updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
          setIsErrandOpen(false);
        }}
        lifeTasks={data.lifeTasks || []}
      />

      <ZenModeModal
        isOpen={isZenOpen}
        onClose={() => setIsZenOpen(false)}
        timerState={data.timerState}
        onUpdateTimer={updateData}
        onErrandPause={() => {
          updateData({ "timerState.isRunning": false, "timerState.isPausedForErrand": true });
          setIsErrandOpen(true);
        }}
        activeTask={activeTask}
      />

      {/* ── Left Sidebar (w-52 high density) ─────────────────────────────────── */}
      <aside className="w-52 shrink-0 bg-slate-900/95 border-r border-slate-800/80 h-screen flex flex-col justify-between z-40">
        <div className="flex flex-col min-h-0">
          {/* Logo & Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60 shrink-0">
            <div
              className={twMerge(
                "p-1 border rounded-lg",
                isExamMode
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
              )}
            >
              <Terminal size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black tracking-tight text-white font-mono block truncate">
                CMD_CENTER
              </span>
              <p className="text-[9px] text-slate-500 font-mono">
                OS v11.0 {isExamMode && "· EXAM"}
              </p>
            </div>
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Command Palette (Ctrl+K)"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <Search size={12} />
            </button>
          </div>

          {/* Exam Mode Toggle Button */}
          <div className="px-2 py-1.5 border-b border-slate-800/60 shrink-0">
            <button
              onClick={toggleExamMode}
              className={twMerge(
                "w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all",
                isExamMode
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse"
                  : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-amber-400"
              )}
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={12} className={isExamMode ? "text-amber-400" : "text-slate-500"} />
                <span>{isExamMode ? "EXAM TRIAGE ON" : "Exam Triage"}</span>
              </span>
              <span
                className={twMerge(
                  "w-1.5 h-1.5 rounded-full",
                  isExamMode ? "bg-amber-400" : "bg-slate-600"
                )}
              />
            </button>
          </div>

          {/* 6 Nav Links with [1] - [6] shortcuts */}
          <nav className="flex flex-col gap-0.5 px-2 py-2 overflow-y-auto custom-scrollbar">
            {NAV_ITEMS.map(({ to, icon: Icon, label, shortcut, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  twMerge(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-150",
                    isActive
                      ? isExamMode
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                        : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  )
                }
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
                <kbd className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono shrink-0">
                  {shortcut}
                </kbd>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Dock */}
        <div className="flex flex-col border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          {/* Quick Capture Box */}
          <div className="p-2 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Brain size={10} className="text-amber-400" /> Quick Capture
              </span>
              <button
                type="button"
                onClick={() => setIsQuickCaptureOpen(true)}
                className={twMerge(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all flex items-center gap-1",
                  (data.brainDump || []).length > 0
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-bold hover:bg-amber-500/30"
                    : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200"
                )}
                title="Triage Drawer (Alt+C)"
              >
                📥 {(data.brainDump || []).length} Held • Triage (Alt+C)
              </button>
            </div>
            <form onSubmit={handleQuickCapture} className="flex gap-1">
              <input
                type="text"
                value={quickCaptureText}
                onChange={(e) => setQuickCaptureText(e.target.value)}
                placeholder="Dump thought…"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700/60 focus:border-amber-500/60 text-slate-200 placeholder-slate-600 text-[11px] rounded-lg px-2 py-1 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!quickCaptureText.trim()}
                className="p-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 shrink-0 transition-all"
              >
                <Send size={10} />
              </button>
            </form>
          </div>

          {/* Sync & Lock footer */}
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              {isFirebaseConfigured ? <Wifi size={10} className="text-emerald-400" /> : <WifiOff size={10} className="text-amber-400" />}
              <span>{isFirebaseConfigured ? "SYNCED" : "LOCAL"}</span>
            </div>
            <button
              onClick={onLock}
              title="Lock dashboard"
              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Viewport Area (Zero Full-Page Scroll) ───────────────────────── */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col p-3 gap-2.5 max-w-none w-full">
        {/* ── Ultra-Slim Top Command Bar (h-10 shrink-0 Across All Pages) ── */}
        <header className="h-10 shrink-0 px-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2.5 shadow-sm">
          {/* Left: Route Title + Smart Autopilot Pill */}
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-xs font-black font-mono tracking-tight text-white uppercase truncate">
              {currentRouteTitle}
            </h1>

            {/* Smart Autopilot Pill */}
            <div className={twMerge("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono", autopilot.color)}>
              <Zap size={11} className="text-amber-400 shrink-0 animate-pulse" />
              <span className="font-semibold truncate max-w-[200px]">{autopilot.label}</span>
              <button
                onClick={autopilot.action}
                className="ml-0.5 px-1.5 py-0.2 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[9px] transition-all hover:scale-105 active:scale-95"
              >
                ⚡ Start
              </button>
            </div>
          </div>

          {/* Center & Right Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Active Sprint Mini-Timer Badge */}
            {isTimerRunning ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold">{formatTime(data.timerState?.timeLeft)}</span>
                <span className="text-slate-400 truncate max-w-[100px] hidden sm:inline">
                  • {activeTask ? activeTask.text : "Sprint"}
                </span>
                <button
                  onClick={() => updateData({ "timerState.isRunning": false })}
                  title="Pause sprint"
                  className="p-0.5 rounded text-cyan-400 hover:text-white"
                >
                  <Square size={9} fill="currentColor" />
                </button>
              </div>
            ) : isTimerPaused ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[10px] font-mono text-amber-300">
                <Coffee size={10} />
                <span>Paused (Errand)</span>
                <button
                  onClick={() => updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false })}
                  title="Resume sprint"
                  className="p-0.5 rounded text-amber-300 hover:text-white"
                >
                  <Play size={9} fill="currentColor" />
                </button>
              </div>
            ) : null}

            {/* Live Beta 10 PM Status Badge */}
            {isBetaSubmitted ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span>✅ Beta Submitted Today (Resets 12 AM)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                <Clock size={11} className="text-amber-400" />
                <span>Beta: {betaTimeLeft}</span>
              </span>
            )}

            {/* + Log Work (L) Button */}
            <button
              onClick={() => setIsManualWorkOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all"
            >
              <Clock size={11} />
              <span>+ Log (L)</span>
            </button>

            {/* Live 11:55 PM Freeze Countdown Badge */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
              <span>❄️ Freeze:</span>
              <strong className="text-white">{freezeTimeLeft}</strong>
            </div>
          </div>
        </header>

        {/* ── Page Viewport Content (Strictly overflow-hidden) ── */}
        <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
