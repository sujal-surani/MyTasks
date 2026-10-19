import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, CheckCircle2, Circle, Play, Zap, Check,
  Calendar, Clock, AlertTriangle, ArrowRight, ArrowLeft
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey, normalizeTask } from "../hooks/useFirestore";

// ─── Category Visual Definitions ──────────────────────────────────────────────
export const CATEGORY_STYLES = {
  devops: {
    label: "DevOps",
    badge: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
    dot: "bg-cyan-400",
  },
  startup: {
    label: "Startup",
    badge: "bg-violet-500/15 border-violet-500/40 text-violet-300",
    dot: "bg-violet-400",
  },
  internship: {
    label: "Internship",
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    dot: "bg-emerald-400",
  },
  btech: {
    label: "B.Tech",
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    dot: "bg-amber-400",
  },
  general: {
    label: "General",
    badge: "bg-slate-700/40 border-slate-600/40 text-slate-300",
    dot: "bg-slate-400",
  },
};

// ─── Streamlined Task Card V6 with 4 Clear Actions ────────────────────────────
function TaskCard({
  task,
  isCompleted,
  isTomorrow,
  onComplete,
  onStartNow,
  onMoveToTomorrow,
  onPullToToday,
  onDelete,
}) {
  const catStyle = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.general;
  const sprints = task.estimatedSprints || 1;

  return (
    <div
      className={twMerge(
        "group flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-200",
        isCompleted
          ? "bg-slate-900/30 border-slate-700/20 opacity-60"
          : "bg-slate-900/50 border-slate-700/40 hover:border-slate-600/70 hover:bg-slate-900/80"
      )}
    >
      {/* Checkbox Complete */}
      <button
        onClick={() => !isCompleted && onComplete(task.id)}
        className={twMerge(
          "shrink-0 mt-0.5 transition-all duration-200",
          isCompleted ? "cursor-default" : "hover:scale-110 active:scale-95"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : (
          <Circle size={16} className="text-slate-600 hover:text-slate-400" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            className={twMerge(
              "text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border",
              catStyle.badge
            )}
          >
            {catStyle.label}
          </span>
          <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
            {sprints} Sp ({(sprints * 45)}m)
          </span>
          {task.targetDate && (
            <span className="text-[9px] text-slate-500 font-mono">
              {task.targetDate}
            </span>
          )}
        </div>

        <p
          className={twMerge(
            "text-xs leading-relaxed font-mono",
            isCompleted ? "line-through text-slate-600" : "text-slate-200"
          )}
        >
          {task.text}
        </p>

        {isCompleted && task.completedAt && (
          <p className="text-[9px] text-slate-600 font-mono mt-0.5">
            done at {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!isCompleted && !isTomorrow && (
          <>
            <button
              onClick={() => onStartNow(task.id)}
              title="Start Now & jump to Dashboard timer"
              className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all hover:scale-110 flex items-center gap-1 text-[10px] font-mono font-bold"
            >
              <Play size={11} fill="currentColor" />
              <span className="hidden sm:inline">Start</span>
            </button>
            <button
              onClick={() => onComplete(task.id)}
              title="Mark Done"
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all hover:scale-110"
            >
              <Check size={12} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => onMoveToTomorrow(task.id)}
              title="Move to Tomorrow"
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <ArrowRight size={12} />
            </button>
          </>
        )}

        {!isCompleted && isTomorrow && (
          <button
            onClick={() => onPullToToday(task.id)}
            title="Pull to Today"
            className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1 text-[10px] font-mono font-bold"
          >
            <ArrowLeft size={11} />
            <span>To Today</span>
          </button>
        )}

        <button
          onClick={() => onDelete(task.id)}
          title="Delete task"
          className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Streamlined Task Board V6 ────────────────────────────────────────────────
export default function TaskBoard({
  dailyTasks = [],
  onUpdateTasks,
  onCompleteTask, // unified completeTaskAndLogSprint pipeline
  isExamMode = false,
  targetDay = "TODAY",
  onTargetDayChange,
}) {
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("btech");
  const [newSprints, setNewSprints] = useState(1);
  const navigate = useNavigate();

  const todayKey = getLocalDateKey();
  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateKey(d);
  }, []);

  // Filter tasks
  const {
    todayQueuedTasks,
    tomorrowQueuedTasks,
    completedTasks,
    todayTotalSprints,
    tomorrowTotalSprints,
    totalDailyCount,
    completedCount,
    progressPercent,
    isAllDone,
  } = useMemo(() => {
    const normalized = dailyTasks.map(normalizeTask);

    const active = normalized.find((t) => t.status === "active") || null;

    const queuedToday = normalized.filter((t) => {
      if (t.status === "active") return false;
      if (t.status !== "today") return false;
      return !t.targetDate || t.targetDate <= todayKey;
    });

    const queuedTomorrow = normalized.filter((t) => {
      if (t.status !== "today") return false;
      return t.targetDate === tomorrowKey;
    });

    const doneToday = normalized.filter((t) => {
      if (t.status !== "done") return false;
      if (!t.completedAt) return false;
      return getLocalDateKey(new Date(t.completedAt)) === todayKey;
    });

    const activeSprints = active ? (active.estimatedSprints || 1) : 0;
    const todaySprints = queuedToday.reduce((sum, t) => sum + (t.estimatedSprints || 1), activeSprints);
    const tomorrowSprints = queuedTomorrow.reduce((sum, t) => sum + (t.estimatedSprints || 1), 0);

    const total = (active ? 1 : 0) + queuedToday.length + doneToday.length;
    const pct = total === 0 ? 0 : Math.round((doneToday.length / total) * 100);

    return {
      todayQueuedTasks: queuedToday,
      tomorrowQueuedTasks: queuedTomorrow,
      completedTasks: doneToday,
      todayTotalSprints: todaySprints,
      tomorrowTotalSprints: tomorrowSprints,
      totalDailyCount: total,
      completedCount: doneToday.length,
      progressPercent: pct,
      isAllDone: total > 0 && doneToday.length === total,
    };
  }, [dailyTasks, todayKey, tomorrowKey]);

  // Actions
  const handleAdd = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const assignedTargetDate = targetDay === "TOMORROW" ? tomorrowKey : todayKey;
    const count = Number(newSprints) || 1;

    const newTask = {
      id: `task_${Date.now()}_${newCategory}`,
      text: newText.trim(),
      category: newCategory,
      status: "today",
      targetDate: assignedTargetDate,
      estimatedSprints: count,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: count * 45,
    };
    onUpdateTasks([...dailyTasks, newTask]);
    setNewText("");
  };

  const handleStartNow = (id) => {
    // Unpin other active tasks, pin this one, start timer, navigate to Dashboard
    const updated = dailyTasks.map((t) => {
      if (t.id === id) return { ...t, status: "active", targetDate: todayKey };
      if (t.status === "active") return { ...t, status: "today" };
      return t;
    });
    onUpdateTasks(updated);
    navigate("/");
  };

  const handleMoveToTomorrow = (id) => {
    const updated = dailyTasks.map((t) =>
      t.id === id ? { ...t, targetDate: tomorrowKey, status: "today" } : t
    );
    onUpdateTasks(updated);
  };

  const handlePullToToday = (id) => {
    const updated = dailyTasks.map((t) =>
      t.id === id ? { ...t, targetDate: todayKey, status: "today" } : t
    );
    onUpdateTasks(updated);
  };

  const handleDelete = (id) => {
    onUpdateTasks(dailyTasks.filter((t) => t.id !== id));
  };

  const isTodayOverbooked = todayTotalSprints > 6;
  const isTomorrowOverbooked = tomorrowTotalSprints > 6;

  return (
    <div
      className={twMerge(
        "backdrop-blur-md border rounded-2xl p-4 md:p-5 shadow-xl flex flex-col transition-all duration-500",
        isExamMode
          ? "bg-slate-900/80 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
          : "bg-slate-800/60 border-slate-700/50"
      )}
    >
      {/* Header & Target Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={twMerge(
                "w-2 h-2 rounded-full animate-pulse",
                isExamMode ? "bg-amber-400" : "bg-cyan-400"
              )}
            />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
              Daily Sprint Queue
            </h3>
          </div>

          {/* Tomorrow Triage Switch */}
          {onTargetDayChange && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
              <span className="text-[10px] font-mono text-slate-500 px-1">Target:</span>
              <button
                type="button"
                onClick={() => onTargetDayChange("TODAY")}
                className={twMerge(
                  "px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all",
                  targetDay === "TODAY"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                TODAY
              </button>
              <button
                type="button"
                onClick={() => onTargetDayChange("TOMORROW")}
                className={twMerge(
                  "px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all",
                  targetDay === "TOMORROW"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                TOMORROW
              </button>
            </div>
          )}

          {/* Visual Progress Bar */}
          {totalDailyCount > 0 && (
            <div className="flex-1 max-w-sm flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={isAllDone ? "text-emerald-300 font-bold" : "text-slate-400"}>
                  {completedCount} of {totalDailyCount} Completed ({progressPercent}%)
                </span>
                {isAllDone && (
                  <span className="text-emerald-400 font-bold animate-pulse">
                    100% COMPLETE! 🎉
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={twMerge(
                    "h-full rounded-full transition-all duration-500",
                    isAllDone ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-cyan-400"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Task Input */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 flex rounded-xl overflow-hidden border border-slate-700/40 focus-within:border-slate-600/60 bg-slate-900/50">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={`Add task for ${targetDay === "TOMORROW" ? "Tomorrow" : "Today"}…`}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 text-xs px-3 py-2.5 focus:outline-none font-mono"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-slate-800 border-l border-slate-700/50 text-slate-300 text-xs px-2.5 focus:outline-none cursor-pointer font-mono"
          >
            <option value="btech">B.Tech</option>
            <option value="internship">Internship</option>
            {!isExamMode && <option value="devops">DevOps</option>}
            {!isExamMode && <option value="startup">Startup</option>}
            <option value="general">General</option>
          </select>
          <select
            value={newSprints}
            onChange={(e) => setNewSprints(Number(e.target.value))}
            className="bg-slate-800/90 border-l border-slate-700/50 text-amber-300 text-xs px-2 focus:outline-none cursor-pointer font-mono"
          >
            <option value={1}>1 Sp (45m)</option>
            <option value={2}>2 Sp (1.5h)</option>
            <option value={3}>3 Sp (2.25h)</option>
            <option value={4}>4 Sp (3h)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={!newText.trim()}
          className={twMerge(
            "disabled:opacity-40 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 shrink-0",
            isExamMode
              ? "bg-amber-400 hover:bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              : "bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
          )}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add to {targetDay}</span>
        </button>
      </form>

      {/* ── 3-Column Layout: Queue Today, Queue Tomorrow, Completed Today ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">

        {/* Column 1: Queue (Today) */}
        <div className="flex flex-col rounded-xl border border-cyan-500/30 p-3 bg-slate-900/30">
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Queue (Today)
              </span>
            </div>
            {todayQueuedTasks.length > 0 && (
              <span className="text-[10px] font-bold font-mono rounded-full px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400">
                {todayQueuedTasks.length}
              </span>
            )}
          </div>

          {/* Sprint load math banner */}
          <div
            className={twMerge(
              "p-2 rounded-lg border mb-3 flex items-center justify-between text-[11px] font-mono",
              isTodayOverbooked
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                : "bg-slate-900/60 border-slate-800 text-slate-400"
            )}
          >
            <span className="flex items-center gap-1">
              {isTodayOverbooked ? <AlertTriangle size={12} className="text-amber-400" /> : <Clock size={12} className="text-cyan-400" />}
              Total Load:
            </span>
            <span className={isTodayOverbooked ? "font-bold text-amber-300" : "font-semibold text-slate-200"}>
              {todayTotalSprints} Sprints ({(todayTotalSprints * 0.75).toFixed(1)}h){isTodayOverbooked && " ⚠️"}
            </span>
          </div>

          {/* Tasks list */}
          <div className="flex flex-col gap-1.5 min-h-[70px]">
            {todayQueuedTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6 text-center">
                <p className="text-[10px] text-slate-700 font-mono">
                  Today queue empty · click Quick-Queue or add above
                </p>
              </div>
            ) : (
              todayQueuedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCompleted={false}
                  isTomorrow={false}
                  onComplete={onCompleteTask}
                  onStartNow={handleStartNow}
                  onMoveToTomorrow={handleMoveToTomorrow}
                  onPullToToday={handlePullToToday}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Queue (Tomorrow) */}
        <div className="flex flex-col rounded-xl border border-amber-500/30 p-3 bg-slate-900/30">
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Queue (Tomorrow)
              </span>
            </div>
            {tomorrowQueuedTasks.length > 0 && (
              <span className="text-[10px] font-bold font-mono rounded-full px-1.5 py-0.2 bg-amber-500/20 text-amber-400">
                {tomorrowQueuedTasks.length}
              </span>
            )}
          </div>

          {/* Sprint load math banner */}
          <div
            className={twMerge(
              "p-2 rounded-lg border mb-3 flex items-center justify-between text-[11px] font-mono",
              isTomorrowOverbooked
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                : "bg-slate-900/60 border-slate-800 text-slate-400"
            )}
          >
            <span className="flex items-center gap-1">
              {isTomorrowOverbooked ? <AlertTriangle size={12} className="text-amber-400" /> : <Clock size={12} className="text-amber-400" />}
              Total Load:
            </span>
            <span className={isTomorrowOverbooked ? "font-bold text-amber-300" : "font-semibold text-slate-200"}>
              {tomorrowTotalSprints} Sprints ({(tomorrowTotalSprints * 0.75).toFixed(1)}h){isTomorrowOverbooked && " ⚠️"}
            </span>
          </div>

          {/* Tasks list */}
          <div className="flex flex-col gap-1.5 min-h-[70px]">
            {tomorrowQueuedTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6 text-center">
                <p className="text-[10px] text-slate-700 font-mono">
                  No tasks staged for tomorrow · switch Target to TOMORROW
                </p>
              </div>
            ) : (
              tomorrowQueuedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCompleted={false}
                  isTomorrow={true}
                  onComplete={onCompleteTask}
                  onStartNow={handleStartNow}
                  onMoveToTomorrow={handleMoveToTomorrow}
                  onPullToToday={handlePullToToday}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Completed (Today) */}
        <div className="flex flex-col rounded-xl border border-green-500/30 p-3 bg-slate-900/30">
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-400 font-mono">
                Completed (Today)
              </span>
            </div>
            {completedTasks.length > 0 && (
              <span className="text-[10px] font-bold font-mono rounded-full px-1.5 py-0.2 bg-green-500/20 text-green-400">
                {completedTasks.length}
              </span>
            )}
          </div>

          <div className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 mb-3 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Logged Today:</span>
            <span className="text-emerald-400 font-bold">
              {completedTasks.reduce((s, t) => s + (t.estimatedSprints || 1), 0)} Sprints
            </span>
          </div>

          <div className="flex flex-col gap-1.5 min-h-[70px]">
            {completedTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6 text-center">
                <p className="text-[10px] text-slate-700 font-mono">
                  No tasks completed yet today
                </p>
              </div>
            ) : (
              completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCompleted={true}
                  isTomorrow={false}
                  onComplete={onCompleteTask}
                  onStartNow={handleStartNow}
                  onMoveToTomorrow={handleMoveToTomorrow}
                  onPullToToday={handlePullToToday}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
