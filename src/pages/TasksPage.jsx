import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useToast } from "../context/ToastContext";
import { getLocalDateKey } from "../hooks/useFirestore";
import {
  Plus, Trash2, CheckCircle2, Circle, Play, Zap, Check,
  Clock, ArrowRight, ArrowLeft, RotateCcw, ShoppingCart, Headphones, Video, ExternalLink
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { CATEGORY_STYLES } from "../components/TaskBoard";
import { QUICK_QUEUE_PILLARS } from "../components/TaskBank";

export default function TasksPage() {
  const { data, updateData, completeTaskAndLogSprint } = useFirestoreContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [targetDay, setTargetDay] = useState("TODAY"); // "TODAY" | "TOMORROW"
  const [customText, setCustomText] = useState("");
  const [customCategory, setCustomCategory] = useState("devops");
  const [customSprints, setCustomSprints] = useState(1);

  // Life tasks state
  const [newLifeText, setNewLifeText] = useState("");
  const [selectedLifeTag, setSelectedLifeTag] = useState("home");
  const [lifeRetentionMode, setLifeRetentionMode] = useState("keep");

  // Commute state
  const [commuteTitle, setCommuteTitle] = useState("");
  const [commuteUrl, setCommuteUrl] = useState("");
  const [commuteRideType, setCommuteRideType] = useState("morning");
  const [commuteFilter, setCommuteFilter] = useState("all");

  const todayKey = getLocalDateKey();
  const tomorrowKey = getLocalDateKey(new Date(Date.now() + 86400000));
  const isExamMode = Boolean(data.globalState?.isExamModeActive);

  const dailyTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
  const lifeTasks = Array.isArray(data.lifeTasks) ? data.lifeTasks : [];
  const commuteQueue = Array.isArray(data.commuteQueue) ? data.commuteQueue : [];

  // Filter tasks into columns
  const todayTasks = useMemo(() => {
    return dailyTasks.filter(
      (t) => (t.status === "today" || t.status === "active") && (!t.targetDate || t.targetDate <= todayKey)
    );
  }, [dailyTasks, todayKey]);

  const tomorrowTasks = useMemo(() => {
    return dailyTasks.filter(
      (t) => t.status === "today" && t.targetDate === tomorrowKey
    );
  }, [dailyTasks, tomorrowKey]);

  const completedTodayTasks = useMemo(() => {
    return dailyTasks.filter((t) => {
      if (t.status !== "done") return false;
      const compDate = t.completedAt ? t.completedAt.slice(0, 10) : t.targetDate || todayKey;
      return compDate === todayKey;
    });
  }, [dailyTasks, todayKey]);

  // Sprint math
  const todayTotalSprints = todayTasks.reduce((acc, t) => acc + (t.estimatedSprints || 1), 0);
  const tomorrowTotalSprints = tomorrowTasks.reduce((acc, t) => acc + (t.estimatedSprints || 1), 0);

  // Add custom task
  const handleAddCustomTask = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const newTask = {
      id: `task_${Date.now()}`,
      text: customText.trim(),
      category: customCategory,
      status: "today",
      targetDate: targetDay === "TOMORROW" ? tomorrowKey : todayKey,
      estimatedSprints: Number(customSprints) || 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: (Number(customSprints) || 1) * 45,
    };
    updateData({ dailyTasks: [newTask, ...dailyTasks] });
    setCustomText("");
    showToast(`✓ Task staged to ${targetDay}`, "success");
  };

  // Quick queue pillar click
  const handleQuickQueuePillar = (pillar) => {
    const newTask = {
      id: `task_${Date.now()}_${pillar.category}`,
      text: pillar.title,
      category: pillar.category,
      status: "today",
      targetDate: targetDay === "TOMORROW" ? tomorrowKey : todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    updateData({ dailyTasks: [newTask, ...dailyTasks] });
    showToast(`✓ ${pillar.shortLabel} sprint queued for ${targetDay}`, "success");
  };

  // Task actions
  const handleStartTaskNow = (task) => {
    const updated = dailyTasks.map((t) => {
      if (t.id === task.id) return { ...t, status: "active", targetDate: todayKey };
      if (t.status === "active") return { ...t, status: "today" };
      return t;
    });
    updateData({
      dailyTasks: updated,
      "timerState.isRunning": true,
      "timerState.isPausedForErrand": false,
    });
    showToast(`🎯 Started: ${task.text.slice(0, 24)}`, "success");
    navigate("/");
  };

  const handleCompleteTask = (taskId) => {
    completeTaskAndLogSprint(taskId);
    showToast("✓ Task completed! +1 Sprint logged", "success");
  };

  const handleMoveToTomorrow = (taskId) => {
    const updated = dailyTasks.map((t) =>
      t.id === taskId ? { ...t, targetDate: tomorrowKey, status: "today" } : t
    );
    updateData({ dailyTasks: updated });
    showToast("⏭ Moved to Tomorrow", "info");
  };

  const handlePullToToday = (taskId) => {
    const updated = dailyTasks.map((t) =>
      t.id === taskId ? { ...t, targetDate: todayKey, status: "today" } : t
    );
    updateData({ dailyTasks: updated });
    showToast("⏮ Pulled to Today", "success");
  };

  const handleUndoComplete = (taskId) => {
    const updated = dailyTasks.map((t) =>
      t.id === taskId ? { ...t, status: "today", completedAt: null } : t
    );
    updateData({ dailyTasks: updated });
    showToast("↩ Task moved back to Today", "info");
  };

  const handleDeleteTask = (taskId) => {
    updateData({ dailyTasks: dailyTasks.filter((t) => t.id !== taskId) });
    showToast("Task deleted", "info");
  };

  // Life task handlers
  const handleAddLifeTask = (e) => {
    e.preventDefault();
    if (!newLifeText.trim()) return;
    const newTask = {
      id: `life_${Date.now()}`,
      text: newLifeText.trim(),
      tag: selectedLifeTag,
      retentionMode: lifeRetentionMode,
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    updateData({ lifeTasks: [...lifeTasks, newTask] });
    setNewLifeText("");
    showToast("✓ Chores queued", "success");
  };

  const handleToggleLifeTask = (id) => {
    updateData({
      lifeTasks: lifeTasks.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)),
    });
  };

  const handleDeleteLifeTask = (id) => {
    updateData({ lifeTasks: lifeTasks.filter((t) => t.id !== id) });
  };

  // Commute handlers
  const handleAddCommute = (e) => {
    e.preventDefault();
    if (!commuteTitle.trim()) return;
    const newItem = {
      id: `commute_${Date.now()}`,
      title: commuteTitle.trim(),
      url: commuteUrl.trim(),
      rideType: commuteRideType,
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    updateData({ commuteQueue: [newItem, ...commuteQueue] });
    setCommuteTitle("");
    setCommuteUrl("");
    showToast("✓ Commute topic queued", "success");
  };

  const handleToggleCommute = (id) => {
    updateData({
      commuteQueue: commuteQueue.map((item) =>
        item.id === id ? { ...item, isDone: !item.isDone } : item
      ),
    });
  };

  const handleDeleteCommute = (id) => {
    updateData({ commuteQueue: commuteQueue.filter((item) => item.id !== id) });
  };

  const filteredCommute = commuteQueue.filter((item) => {
    if (commuteFilter === "all") return true;
    if (commuteFilter === "done") return item.isDone;
    return item.rideType === commuteFilter;
  });

  const visiblePillars = isExamMode
    ? QUICK_QUEUE_PILLARS.filter((p) => p.category !== "startup" && p.category !== "devops")
    : QUICK_QUEUE_PILLARS;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3 overflow-y-auto md:overflow-hidden select-text md:select-none">
      {/* ── LEFT 8 COLUMNS: Engineering Sprint Engine ────────────────────────── */}
      <div className="col-span-12 md:col-span-8 flex flex-col gap-2 shrink-0 md:min-h-0 md:h-full">
        {/* Compact Combined Header Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-2.5 shrink-0 flex flex-col gap-2 shadow-sm">
          {/* Top row: Target Day Switch + 5 Pillar Quick Queue chips */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Target:</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono font-bold">
                <button
                  onClick={() => setTargetDay("TODAY")}
                  className={twMerge(
                    "px-2 py-0.5 rounded transition-all",
                    targetDay === "TODAY" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                  )}
                >
                  TODAY
                </button>
                <button
                  onClick={() => setTargetDay("TOMORROW")}
                  className={twMerge(
                    "px-2 py-0.5 rounded transition-all",
                    targetDay === "TOMORROW" ? "bg-amber-400 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                  )}
                >
                  TOMORROW
                </button>
              </div>
            </div>

            {/* Quick-Queue chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {visiblePillars.map((p) => (
                <button
                  key={p.category}
                  onClick={() => handleQuickQueuePillar(p)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition-all hover:scale-102 active:scale-98"
                >
                  + {p.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Custom Task Adder */}
          <form onSubmit={handleAddCustomTask} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={`Add sprint for ${targetDay}…`}
              className="flex-1 min-w-[160px] bg-slate-950 border border-slate-800 focus:border-cyan-500/60 text-slate-200 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
            />
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-mono rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value="devops">DevOps</option>
                <option value="startup">Startup</option>
                <option value="internship">Internship</option>
                <option value="btech">B.Tech</option>
                <option value="general">General</option>
              </select>
              <select
                value={customSprints}
                onChange={(e) => setCustomSprints(Number(e.target.value))}
                className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 text-amber-300 text-[10px] font-mono rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value={1}>1 Sp (45m)</option>
                <option value={2}>2 Sp (1.5h)</option>
                <option value={3}>3 Sp (2.25h)</option>
                <option value={4}>4 Sp (3h)</option>
              </select>
              <button
                type="submit"
                disabled={!customText.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 font-mono font-bold text-xs transition-all shrink-0 flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={3} />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3-Column Equal-Height Board */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-2.5 flex-1 min-h-0">
          {/* Column 1: QUEUE (TODAY) */}
          <div className="flex flex-col min-h-[220px] md:min-h-0 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-cyan-300">
                  Queue (Today)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {todayTotalSprints} Sp ({(todayTotalSprints * 0.75).toFixed(1)}h)
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8 text-[11px] font-mono text-slate-500">
                  No tasks queued for today.
                </div>
              ) : (
                todayTasks.map((t) => {
                  const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.general;
                  const isActive = t.status === "active";
                  return (
                    <div
                      key={t.id}
                      className={twMerge(
                        "p-2 rounded-lg border text-xs font-mono transition-all flex flex-col gap-1.5",
                        isActive
                          ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                          : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700/80"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={twMerge("text-[8px] uppercase px-1 py-0.2 rounded border font-bold", style.badge)}>
                          {style.label} · {t.estimatedSprints || 1} Sp
                        </span>
                        {isActive && (
                          <span className="text-[8px] font-bold text-cyan-400 bg-cyan-500/20 px-1 rounded animate-pulse">
                            ACTIVE SPRINT
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 text-xs leading-snug truncate">{t.text}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1">
                          {!isActive && (
                            <button
                              onClick={() => handleStartTaskNow(t)}
                              className="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold flex items-center gap-0.5"
                            >
                              <Play size={8} fill="currentColor" /> Start
                            </button>
                          )}
                          <button
                            onClick={() => handleCompleteTask(t.id)}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold flex items-center gap-0.5"
                          >
                            <Check size={9} /> Done
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveToTomorrow(t.id)}
                            title="Move to Tomorrow"
                            className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                          >
                            <ArrowRight size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            title="Delete task"
                            className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: QUEUE (TOMORROW) */}
          <div className="flex flex-col min-h-[220px] md:min-h-0 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-amber-300">
                  Queue (Tomorrow)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {tomorrowTotalSprints} Sp ({(tomorrowTotalSprints * 0.75).toFixed(1)}h)
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar">
              {tomorrowTasks.length === 0 ? (
                <div className="text-center py-8 text-[11px] font-mono text-slate-500">
                  No tasks staged for tomorrow.
                </div>
              ) : (
                tomorrowTasks.map((t) => {
                  const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.general;
                  return (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg border border-slate-800/80 bg-slate-950/70 text-xs font-mono flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={twMerge("text-[8px] uppercase px-1 py-0.2 rounded border font-bold", style.badge)}>
                          {style.label} · {t.estimatedSprints || 1} Sp
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-snug truncate">{t.text}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => handlePullToToday(t.id)}
                          className="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold flex items-center gap-0.5"
                        >
                          <ArrowLeft size={9} /> Pull to Today
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          title="Delete task"
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: COMPLETED (TODAY) */}
          <div className="flex flex-col min-h-[220px] md:min-h-0 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-300">
                  Completed (Today)
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {completedTodayTasks.length} Done
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar">
              {completedTodayTasks.length === 0 ? (
                <div className="text-center py-8 text-[11px] font-mono text-slate-500">
                  No completed tasks yet today.
                </div>
              ) : (
                completedTodayTasks.map((t) => {
                  const style = CATEGORY_STYLES[t.category] || CATEGORY_STYLES.general;
                  return (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg border border-slate-800/50 bg-slate-950/40 text-xs font-mono opacity-80 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className={twMerge("text-[8px] uppercase px-1 py-0.2 rounded border", style.badge)}>
                          {style.label}
                        </span>
                        <span className="text-[9px] text-emerald-400 font-bold">✓ +1 Sprint</span>
                      </div>
                      <p className="line-through text-slate-400 text-xs truncate">{t.text}</p>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleUndoComplete(t.id)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold flex items-center gap-1 transition-all"
                        >
                          <RotateCcw size={8} /> Undo
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT 4 COLUMNS: Life Chores + Commute Learning Queue ────────────── */}
      <div className="col-span-12 md:col-span-4 flex flex-col gap-2.5 shrink-0 md:min-h-0 md:h-full">
        {/* Top Card: Life & Admin Inbox */}
        <div className="flex-1 min-h-[260px] md:min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-2.5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <ShoppingCart size={11} />
              </div>
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                Life & Admin Inbox
              </span>
            </div>
            {/* Keep vs Midnight switch */}
            <div className="flex bg-slate-950 p-0.5 rounded text-[8px] font-mono">
              <button
                onClick={() => setLifeRetentionMode("keep")}
                className={twMerge("px-1.5 py-0.2 rounded", lifeRetentionMode === "keep" ? "bg-slate-700 text-white font-bold" : "text-slate-500")}
              >
                Keep
              </button>
              <button
                onClick={() => setLifeRetentionMode("midnight")}
                className={twMerge("px-1.5 py-0.2 rounded", lifeRetentionMode === "midnight" ? "bg-slate-700 text-white font-bold" : "text-slate-500")}
              >
                Reset 12am
              </button>
            </div>
          </div>

          {/* Quick Life Task Input */}
          <form onSubmit={handleAddLifeTask} className="flex gap-1 py-1.5 border-b border-slate-800/80 shrink-0">
            <input
              type="text"
              value={newLifeText}
              onChange={(e) => setNewLifeText(e.target.value)}
              placeholder="Errand / chore name…"
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500/60 text-slate-200 placeholder-slate-600 text-[11px] rounded px-2 py-1 focus:outline-none font-mono"
            />
            <select
              value={selectedLifeTag}
              onChange={(e) => setSelectedLifeTag(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-[9px] font-mono rounded px-1.5 py-1 focus:outline-none"
            >
              <option value="home">🏠 Home</option>
              <option value="market">🛒 Market</option>
              <option value="personal">📌 Personal</option>
            </select>
            <button
              type="submit"
              disabled={!newLifeText.trim()}
              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold text-xs shrink-0"
            >
              <Plus size={11} />
            </button>
          </form>

          {/* Life task checklist (scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pt-1.5 pr-1 custom-scrollbar">
            {lifeTasks.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-mono text-slate-500">
                No household chores or errands pending.
              </div>
            ) : (
              lifeTasks.map((t) => (
                <div
                  key={t.id}
                  className={twMerge(
                    "flex items-center justify-between gap-1.5 p-1.5 rounded border text-[11px] font-mono transition-all",
                    t.isDone ? "bg-slate-950/30 border-slate-900 opacity-60" : "bg-slate-950/70 border-slate-800/80"
                  )}
                >
                  <button
                    onClick={() => handleToggleLifeTask(t.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                  >
                    {t.isDone ? (
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Circle size={12} className="text-slate-600 shrink-0" />
                    )}
                    <span className={twMerge("truncate", t.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                      {t.text}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteLifeTask(t.id)}
                    className="p-0.5 text-slate-600 hover:text-red-400 shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Card: 20km Commute Learning Queue */}
        <div className="flex-1 min-h-[260px] md:min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-2.5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Headphones size={11} />
              </div>
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                20km Commute Queue (2h Travel)
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex bg-slate-950 p-0.5 rounded text-[8px] font-mono">
              {["all", "morning", "return"].map((f) => (
                <button
                  key={f}
                  onClick={() => setCommuteFilter(f)}
                  className={twMerge("px-1.5 py-0.2 rounded uppercase", commuteFilter === f ? "bg-indigo-500/25 text-indigo-300 font-bold" : "text-slate-500")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Commute Adder */}
          <form onSubmit={handleAddCommute} className="flex flex-wrap sm:flex-nowrap gap-1 py-1.5 border-b border-slate-800/80 shrink-0">
            <input
              type="text"
              value={commuteTitle}
              onChange={(e) => setCommuteTitle(e.target.value)}
              placeholder="Deep-dive / podcast title…"
              className="flex-1 min-w-[140px] bg-slate-950 border border-slate-800 focus:border-indigo-500/60 text-slate-200 placeholder-slate-600 text-[11px] rounded px-2 py-1 focus:outline-none font-mono"
            />
            <input
              type="text"
              value={commuteUrl}
              onChange={(e) => setCommuteUrl(e.target.value)}
              placeholder="URL (optional)…"
              className="w-24 bg-slate-950 border border-slate-800 focus:border-indigo-500/60 text-slate-200 placeholder-slate-600 text-[10px] rounded px-1.5 py-1 focus:outline-none font-mono"
            />
            <select
              value={commuteRideType}
              onChange={(e) => setCommuteRideType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-[9px] font-mono rounded px-1 py-1 focus:outline-none"
            >
              <option value="morning">🌅 Morning</option>
              <option value="return">🌇 Return</option>
            </select>
            <button
              type="submit"
              disabled={!commuteTitle.trim()}
              className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white font-bold text-xs shrink-0"
            >
              <Plus size={11} />
            </button>
          </form>

          {/* Commute scrollable list */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pt-1.5 pr-1 custom-scrollbar">
            {filteredCommute.length === 0 ? (
              <div className="text-center py-6 text-[10px] font-mono text-slate-500">
                No videos or podcasts queued for travel.
              </div>
            ) : (
              filteredCommute.map((item) => (
                <div
                  key={item.id}
                  className={twMerge(
                    "flex items-center justify-between gap-1.5 p-1.5 rounded border text-[11px] font-mono transition-all",
                    item.isDone ? "bg-slate-950/30 border-slate-900 opacity-60" : "bg-slate-950/70 border-slate-800/80"
                  )}
                >
                  <button
                    onClick={() => handleToggleCommute(item.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                  >
                    {item.isDone ? (
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Circle size={12} className="text-slate-600 shrink-0" />
                    )}
                    <span className={twMerge("truncate", item.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                      {item.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-cyan-300"
                      >
                        <Video size={10} />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteCommute(item.id)}
                      className="p-0.5 text-slate-600 hover:text-red-400 shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
