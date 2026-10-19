import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useLocalTimer } from "../hooks/useLocalTimer";
import DayModeSwitcher from "../components/DayModeSwitcher";
import SprintTimer from "../components/SprintTimer";
import ZenModeModal from "../components/ZenModeModal";
import ErrandModal from "../components/ErrandModal";
import EODModal from "../components/EODModal";
import ManualWorkModal from "../components/ManualWorkModal";
import { useToast } from "../context/ToastContext";
import {
  Zap,
  CheckCircle2,
  Play,
  Plus,
  X,
  Check,
  Moon,
  ShieldAlert,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  Flame,
  Terminal,
  Cpu,
  Briefcase,
  GraduationCap
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { CATEGORY_STYLES } from "../components/TaskBoard";
import { getLocalDateKey } from "../hooks/useFirestore";

export default function DashboardPage() {
  const {
    data,
    updateData,
    logCompletedSprint,
    completeTaskAndLogSprint,
    logManualWork,
    effectiveSprints,
    isBetaSubmittedToday,
  } = useFirestoreContext();

  const { showToast } = useToast();

  const [isErrandModalOpen, setIsErrandModalOpen] = useState(false);
  const [isEODModalOpen, setIsEODModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isZenOpen, setIsZenOpen] = useState(false);
  const [newInlineTaskText, setNewInlineTaskText] = useState("");
  const [newInlineTaskCategory, setNewInlineTaskCategory] = useState("devops");
  const [taskTab, setTaskTab] = useState("queue"); // "queue" | "completed"
  const [leftPanelTab, setLeftPanelTab] = useState("timer"); // "timer" | "scratchpad"

  const todayKey = getLocalDateKey();
  const dailyTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
  const activeTask = dailyTasks.find((t) => t.status === "active") || null;
  const queuedTodayTasks = dailyTasks.filter(
    (t) => t.status === "today" && (!t.targetDate || t.targetDate <= todayKey)
  );
  const completedTodayTasks = dailyTasks.filter(
    (t) => t.status === "done" && (t.completedAt ? t.completedAt.startsWith(todayKey) : true)
  );
  const pendingLifeTasks = (data.lifeTasks || []).filter((t) => !t.isDone);
  const labList = data.academicSem3?.subjects || [];
  const totalPendingLabs = labList.reduce((acc, sub) => acc + (sub.labs || []).filter((l) => !l.isDone).length, 0);
  const alphaInternship = data.internships?.alpha || {};
  const catStyle = activeTask ? (CATEGORY_STYLES[activeTask.category] || CATEGORY_STYLES.general) : null;

  const localTimeLeft = useLocalTimer(data.timerState, updateData);

  useEffect(() => {
    setIsErrandModalOpen(Boolean(data.timerState?.isPausedForErrand));
  }, [data.timerState?.isPausedForErrand]);

  const displayTimerState = { ...data.timerState, timeLeft: localTimeLeft };

  // Live browser tab title countdown
  useEffect(() => {
    const formatTitleTime = (secs) => {
      if (typeof secs !== "number" || isNaN(secs)) return "45:00";
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    if (data.timerState?.isPausedForErrand) {
      document.title = "☕ PAUSED (Errand) | CmdCenter";
    } else if (data.timerState?.isRunning) {
      const focusText = activeTask?.text ? activeTask.text.slice(0, 24) : "Atomic Sprint";
      document.title = `⏳ ${formatTitleTime(localTimeLeft)} — [${focusText}] | CmdCenter`;
    } else {
      document.title = "⚡ Command Center";
    }

    return () => {
      document.title = "⚡ Command Center";
    };
  }, [data.timerState?.isRunning, data.timerState?.isPausedForErrand, localTimeLeft, activeTask]);

  const handleErrandPauseTrigger = useCallback(() => {
    updateData({ "timerState.isRunning": false, "timerState.isPausedForErrand": true });
    setIsErrandModalOpen(true);
    showToast("☕ Timer paused for errand", "warning");
  }, [updateData, showToast]);

  const handleErrandResume = useCallback(() => {
    updateData({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
    setIsErrandModalOpen(false);
    showToast("▶ Sprint resumed", "success");
  }, [updateData, showToast]);

  const handleContextNoteChange = useCallback(
    (note) => updateData({ "timerState.currentContextNote": note }),
    [updateData]
  );

  // Set a specific task active
  const handleSetActive = (id) => {
    const task = dailyTasks.find((t) => t.id === id);
    const updated = dailyTasks.map((t) => {
      if (t.id === id) return { ...t, status: "active", targetDate: todayKey };
      if (t.status === "active") return { ...t, status: "today" };
      return t;
    });
    updateData({
      dailyTasks: updated,
      "timerState.isRunning": true,
      "timerState.isPausedForErrand": false,
    });
    showToast(`🎯 Focus: ${task ? task.text.slice(0, 25) : "Task"} active!`, "success");
  };

  // Unpin active task
  const handleUnpinActive = () => {
    if (!activeTask) return;
    const updated = dailyTasks.map((t) =>
      t.id === activeTask.id ? { ...t, status: "today" } : t
    );
    updateData({ dailyTasks: updated });
    showToast("Active focus unpinned", "info");
  };

  // Complete active task right now
  const handleCompleteActive = () => {
    if (!activeTask) return;
    completeTaskAndLogSprint(activeTask.id);
    showToast("✓ Task completed! +1 Sprint permanently logged", "success");
  };

  // Complete queued task
  const handleCompleteQueuedTask = (taskId) => {
    completeTaskAndLogSprint(taskId);
    showToast("✓ Task completed! +1 Sprint logged", "success");
  };

  // Undo / Restore task to today's queue
  const handleUndoTask = (taskId) => {
    const updated = dailyTasks.map((t) =>
      t.id === taskId ? { ...t, status: "today", completedAt: null } : t
    );
    updateData({ dailyTasks: updated });
    showToast("Task restored to Today's queue", "info");
  };

  // Save current scratchpad notes directly into Captain's Log
  const handlePushToDiaryAndLog = () => {
    const note = (data.timerState?.currentContextNote || "").trim();
    if (!note) {
      showToast("Scratchpad note is empty", "info");
      return;
    }
    const existingLog = data.captainsLog?.[todayKey]?.text || "";
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedText = existingLog
      ? `${existingLog}\n\n[Sprint Note ${timeStr}]\n${note}`
      : `[Sprint Note ${timeStr}]\n${note}`;
    const existingDiary = data.dailyDiary?.[todayKey] || {};
    const existingNarrative = existingDiary.narrative || "";
    const updatedNarrative = existingNarrative
      ? `${existingNarrative}\n\n[Sprint Note ${timeStr}]\n${note}`
      : `[Sprint Note ${timeStr}]\n${note}`;

    updateData({
      [`captainsLog.${todayKey}`]: {
        text: updatedText,
        timestamp: new Date().toISOString(),
      },
      [`dailyDiary.${todayKey}`]: {
        ...existingDiary,
        narrative: updatedNarrative,
        updatedAt: new Date().toISOString(),
      },
    });
    showToast("✓ Pushed to Daily Diary & Captain's Log!", "success");
  };

  // Insert chip into scratchpad
  const handleInsertChip = (snippet) => {
    const current = data.timerState?.currentContextNote || "";
    const next = current ? `${current}\n${snippet} ` : `${snippet} `;
    updateData({ "timerState.currentContextNote": next });
  };

  // 1-Click Instant Sprints
  const handleInstantSprint = (category, title) => {
    const newTask = {
      id: `task_${Date.now()}_${category}`,
      text: title,
      category,
      status: "active",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };

    const normalized = dailyTasks.map((t) => (t.status === "active" ? { ...t, status: "today" } : t));

    updateData({
      dailyTasks: [newTask, ...normalized],
      "timerState.isRunning": true,
      "timerState.isPausedForErrand": false,
    });
    showToast(`⚡ Instant sprint started: ${title.slice(0, 24)}`, "success");
  };

  // Add inline task to today's queue
  const handleAddInlineTodayTask = (e) => {
    e.preventDefault();
    if (!newInlineTaskText.trim()) return;
    const newTask = {
      id: `task_${Date.now()}`,
      text: newInlineTaskText.trim(),
      category: newInlineTaskCategory,
      status: "today",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    updateData({ dailyTasks: [newTask, ...dailyTasks] });
    setNewInlineTaskText("");
    showToast("✓ Task queued for Today", "success");
  };

  // Calculate 11:55 PM Freeze countdown
  const [freezeCountdown, setFreezeCountdown] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const freeze = new Date(now);
      freeze.setHours(23, 55, 0, 0);
      const diffMs = freeze.getTime() - now.getTime();
      if (diffMs <= 0) {
        setFreezeCountdown("FROZEN");
      } else {
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setFreezeCountdown(`${hrs}h ${mins}m`);
      }
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, []);

  const isExamMode = Boolean(data.globalState?.isExamModeActive);
  const isEODCompletedToday = data.eodStatus?.lastCompletedDate === todayKey;

  return (
    <div className="h-full w-full flex-1 min-h-0 grid grid-cols-12 gap-3 overflow-hidden select-none">
      {/* ── LEFT COLUMN (5 cols): Tab Switcher [ ⏱️ Timer & Ring ] vs [ ✍️ Live Scratchpad & Notes ] + Docked EOD ── */}
      <div className="col-span-5 flex flex-col gap-2.5 min-h-0 h-full">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/80 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setLeftPanelTab("timer")}
            className={twMerge(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
              leftPanelTab === "timer"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Clock size={13} className={leftPanelTab === "timer" ? "text-cyan-400" : "text-slate-500"} />
            <span>⏱️ Timer & Ring</span>
          </button>
          <button
            type="button"
            onClick={() => setLeftPanelTab("scratchpad")}
            className={twMerge(
              "flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
              leftPanelTab === "scratchpad"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Terminal size={13} className={leftPanelTab === "scratchpad" ? "text-amber-400" : "text-slate-500"} />
            <span>✍️ Scratchpad</span>
          </button>
        </div>

        {/* Tab 1: Atomic Sprint Timer Card (flex-1 min-h-0) */}
        {leftPanelTab === "timer" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <SprintTimer
              timerState={displayTimerState}
              onUpdate={updateData}
              onErrandPause={handleErrandPauseTrigger}
              onSprintCompleted={logCompletedSprint}
              activeTask={activeTask}
              onOpenZen={() => setIsZenOpen(true)}
              todaySprintCount={effectiveSprints?.[todayKey] || 0}
              className="flex-1 min-h-0 h-full"
            />
          </div>
        )}

        {/* Tab 2: Live Sprint Scratchpad & Terminal Notes (flex-1 min-h-0) */}
        {leftPanelTab === "scratchpad" && (
          <div className="flex-1 min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1.5">
                <Terminal size={13} className="text-amber-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                  Live Sprint Scratchpad
                </span>
              </div>
              <button
                type="button"
                onClick={handlePushToDiaryAndLog}
                className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold transition-all flex items-center gap-1 shadow-sm"
                title="Push note to both Daily Diary & Captain's Log"
              >
                <span>→ Push to Diary & Log</span>
              </button>
            </div>

            {/* Quick Insert Chips */}
            <div className="flex items-center gap-1.5 py-2 shrink-0 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => handleInsertChip("[BLOCKER]")}
                className="px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-mono font-medium transition-all shrink-0"
              >
                + Bug/Blocker
              </button>
              <button
                type="button"
                onClick={() => handleInsertChip("[COMMIT] feat:")}
                className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-medium transition-all shrink-0"
              >
                + Git Commit Note
              </button>
              <button
                type="button"
                onClick={() => handleInsertChip("[NEXT] Where I left off:")}
                className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-medium transition-all shrink-0"
              >
                + Where I Left Off
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={data.timerState?.currentContextNote || ""}
              onChange={(e) => handleContextNoteChange(e.target.value)}
              placeholder="Active execution notes, terminal snippets, or blockers… Auto-persists across page reloads."
              className="flex-1 min-h-0 w-full bg-slate-950/70 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar leading-relaxed"
            />
          </div>
        )}

        {/* 3. Nightly EOD & 11:55 PM Freeze Card (Docked Bottom Left) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 shrink-0 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <Moon size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-white tracking-tight">
                  Nightly EOD Protocol
                </span>
                {isEODCompletedToday ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ✓ Sealed
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold animate-pulse">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                ❄️ 11:55 PM Hard Stop: <strong className="text-slate-300">{freezeCountdown}</strong> left · Close laptop
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEODModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0 flex items-center gap-1.5"
          >
            <Moon size={12} />
            <span>Complete EOD</span>
          </button>
        </div>
      </div>

      {/* ── RIGHT COLUMN (7 cols): Active Workflow Protocol + Current Focus & Live Queue ── */}
      <div className="col-span-7 flex flex-col gap-2.5 min-h-0 h-full">
        {/* 1. Active Workflow Protocol Card */}
        <DayModeSwitcher
          currentMode={data.currentMode}
          onModeChange={(mode) => updateData({ currentMode: mode })}
          blockChecklist={data.dailyBlockChecks || {}}
          onToggleBlockCheck={(blockTime) => {
            const current = data.dailyBlockChecks || {};
            updateData({
              [`dailyBlockChecks.${blockTime}`]: !current[blockTime],
            });
          }}
          onStartBlockSprint={(label, category) => {
            handleInstantSprint(category || "general", `${label} Focused Sprint`);
          }}
        />

        {/* 2. Current Focus & Live Today Queue Card */}
        <div className="flex-1 min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col shadow-md">
          {/* Top of card: Pinned Active Focus Box */}
          <div className="shrink-0 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={twMerge("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", activeTask ? "bg-cyan-400" : "bg-slate-600")} />
                  <span className={twMerge("relative inline-flex rounded-full h-2 w-2", activeTask ? "bg-cyan-500" : "bg-slate-600")} />
                </span>
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">
                  Current Focus Target
                </span>
                {catStyle && (
                  <span className={twMerge("text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border", catStyle.badge)}>
                    {catStyle.label}
                  </span>
                )}
              </div>

              {activeTask && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCompleteActive}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                  >
                    <Check size={11} strokeWidth={3} />
                    <span>✓ Complete (+1 Sp)</span>
                  </button>
                  <button
                    onClick={handleUnpinActive}
                    title="Unpin active target"
                    className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {activeTask ? (
              <div className="p-2 rounded-lg bg-slate-950/70 border border-cyan-500/30 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-white truncate">
                  🎯 {activeTask.text}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 shrink-0">
                  {activeTask.estimatedSprints || 1} Sp
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { cat: "internship", label: "⚡ Internship", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                  { cat: "btech", label: "⚡ B.Tech", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
                  { cat: "devops", label: "⚡ DevOps", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
                  { cat: "startup", label: "⚡ Startup", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
                ].map((item) => (
                  <button
                    key={item.cat}
                    onClick={() => handleInstantSprint(item.cat, `${item.label.replace("⚡ ", "")} Sprint`)}
                    className={twMerge("p-1.5 rounded-lg border text-[10px] font-mono font-bold text-center transition-all hover:scale-102 active:scale-98 truncate", item.color)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick inline task adder */}
          <form onSubmit={handleAddInlineTodayTask} className="flex gap-1.5 py-2 border-b border-slate-800/80 shrink-0">
            <input
              type="text"
              value={newInlineTaskText}
              onChange={(e) => setNewInlineTaskText(e.target.value)}
              placeholder="Add task to Today's Queue…"
              className="flex-1 bg-slate-950/90 border border-slate-800 focus:border-cyan-500/60 text-slate-200 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1 focus:outline-none font-mono"
            />
            <select
              value={newInlineTaskCategory}
              onChange={(e) => setNewInlineTaskCategory(e.target.value)}
              className="bg-slate-950/90 border border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg px-2 focus:outline-none"
            >
              <option value="devops">DevOps</option>
              <option value="startup">Startup</option>
              <option value="internship">Internship</option>
              <option value="btech">B.Tech</option>
              <option value="general">General</option>
            </select>
            <button
              type="submit"
              disabled={!newInlineTaskText.trim()}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 text-xs font-mono font-bold transition-all shrink-0"
            >
              <Plus size={13} />
            </button>
          </form>

          {/* Inline Today's Queue / Completed List (Scrollable) */}
          <div className="flex-1 min-h-0 flex flex-col pt-2">
            <div className="flex items-center justify-between mb-2 shrink-0">
              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskTab("queue")}
                  className={twMerge(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all",
                    taskTab === "queue"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Today's Queue ({queuedTodayTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskTab("completed")}
                  className={twMerge(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all",
                    taskTab === "completed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Completed Today ({completedTodayTasks.length})
                </button>
              </div>

              <Link to="/tasks" className="text-[10px] font-mono text-cyan-400 hover:underline">
                Task Master →
              </Link>
            </div>

            {taskTab === "queue" ? (
              queuedTodayTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xs font-mono text-slate-500">No tasks queued for today.</span>
                  <span className="text-[10px] font-mono text-slate-600 mt-1">Use quick capture or pick a 1-click sprint above.</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {queuedTodayTasks.map((t) => {
                    const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.general;
                    return (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-2 text-xs font-mono transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={twMerge("text-[8px] uppercase px-1 py-0.2 rounded border shrink-0", style.badge)}>
                            {style.label}
                          </span>
                          <span className="text-slate-200 truncate">{t.text}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSetActive(t.id)}
                            className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Play size={9} fill="currentColor" />
                            <span>Focus</span>
                          </button>
                          <button
                            onClick={() => handleCompleteQueuedTask(t.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700 transition-all"
                            title="Mark Done"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              completedTodayTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xs font-mono text-slate-500">No tasks completed yet today.</span>
                  <span className="text-[10px] font-mono text-slate-600 mt-1">Complete your active sprint to populate this list.</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {completedTodayTasks.map((t) => {
                    const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.general;
                    return (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between gap-2 text-xs font-mono transition-all opacity-80"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className={twMerge("text-[8px] uppercase px-1 py-0.2 rounded border shrink-0", style.badge)}>
                            {style.label}
                          </span>
                          <span className="text-slate-400 line-through truncate">{t.text}</span>
                        </div>

                        <button
                          onClick={() => handleUndoTask(t.id)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 text-[9px] font-mono transition-all shrink-0"
                          title="Undo task completion"
                        >
                          ↺ Undo
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* 3. Daily Radar Strip (shrink-0 3 tiles) */}
        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          {/* Internship Radar */}
          <Link
            to="/internships"
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-300 flex items-center gap-1.5">
                <Briefcase size={12} className="text-emerald-400" /> Internships
              </span>
              <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">View →</span>
            </div>
            <div className="mt-1.5">
              <p className="text-xs font-mono font-bold text-white truncate">
                {isBetaSubmittedToday ? "✅ Beta Done" : "⏳ Beta Pending 10 PM"}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                Alpha: {alphaInternship.taskName ? alphaInternship.taskName.slice(0, 18) : "Active Track"}
              </p>
            </div>
          </Link>

          {/* Academic Alert */}
          <Link
            to="/academics"
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-300 flex items-center gap-1.5">
                <GraduationCap size={12} className="text-amber-400" /> Academics
              </span>
              <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">View →</span>
            </div>
            <div className="mt-1.5">
              <p className="text-xs font-mono font-bold text-white truncate">
                {isExamMode ? "🚨 EXAM TRIAGE ON" : "Normal Prep"}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {totalPendingLabs > 0 ? `${totalPendingLabs} Labs Pending` : "All Labs Checked"}
              </p>
            </div>
          </Link>

          {/* Life & Commute Pending */}
          <Link
            to="/tasks"
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 group-hover:text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" /> Life Admin
              </span>
              <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">View →</span>
            </div>
            <div className="mt-1.5">
              <p className="text-xs font-mono font-bold text-white truncate">
                {pendingLifeTasks.length > 0 ? `${pendingLifeTasks.length} Chores Pending` : "✓ Life Chores Clean"}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                Commute & Errands
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Global Modals ── */}
      <ZenModeModal
        isOpen={isZenOpen}
        onClose={() => setIsZenOpen(false)}
        timerState={displayTimerState}
        onUpdateTimer={updateData}
        onErrandPause={handleErrandPauseTrigger}
        activeTask={activeTask}
      />

      <ErrandModal
        isOpen={isErrandModalOpen}
        contextNote={data.timerState?.currentContextNote || ""}
        onContextChange={handleContextNoteChange}
        onResume={handleErrandResume}
        lifeTasks={data.lifeTasks || []}
      />

      <EODModal
        isOpen={isEODModalOpen}
        onClose={() => setIsEODModalOpen(false)}
        data={data}
        updateData={updateData}
        onAddTask={(newTask) => updateData({ dailyTasks: [...dailyTasks, newTask] })}
        onLogWork={logManualWork}
      />

      <ManualWorkModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onLogWork={logManualWork}
      />
    </div>
  );
}
