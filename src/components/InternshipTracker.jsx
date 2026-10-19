import { useState } from "react";
import { Briefcase, Calendar, CheckCircle2, Book, Hammer, GitBranch, FileCheck } from "lucide-react";
import { twMerge } from "tailwind-merge";

const CHECKPOINTS = [
  { key: "isDocsDone", short: "Docs", label: "Docs", icon: Book },
  { key: "isBuildDone", short: "Build", label: "Build", icon: Hammer },
  { key: "isGitPushed", short: "Git", label: "Git", icon: GitBranch },
  { key: "isProofSubmitted", short: "Proof", label: "Proof", icon: FileCheck },
];

function getDaysRemaining(deadline) {
  if (!deadline) return 10;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function urgencyStyle(days) {
  if (days <= 2) return { text: "text-red-400", bg: "bg-red-500/10 border-red-500/30 text-red-300" };
  if (days <= 5) return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30 text-amber-300" };
  return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" };
}

export default function InternshipTracker({ tracker = {}, onUpdate, fullSize = false }) {
  const [editingTask, setEditingTask] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [taskInput, setTaskInput] = useState(tracker?.taskName || "Week 1 Deliverable");
  const [deadlineInput, setDeadlineInput] = useState(
    tracker?.deadline ? new Date(tracker.deadline).toISOString().split("T")[0] : ""
  );

  const daysLeft = getDaysRemaining(tracker?.deadline);
  const urgency = urgencyStyle(daysLeft);
  const completedCount = CHECKPOINTS.filter((c) => tracker?.[c.key]).length;
  const progressPct = (completedCount / CHECKPOINTS.length) * 100;

  const saveTask = () => {
    if (taskInput.trim()) {
      onUpdate({ "internshipTracker.taskName": taskInput.trim() });
    }
    setEditingTask(false);
  };

  const saveDeadline = () => {
    if (deadlineInput) {
      onUpdate({ "internshipTracker.deadline": new Date(deadlineInput).toISOString() });
    }
    setEditingDeadline(false);
  };

  const toggleCheckpoint = (key) => {
    onUpdate({ [`internshipTracker.${key}`]: !tracker?.[key] });
  };

  return (
    <div className={twMerge(
      "bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl",
      fullSize ? "p-6" : "p-3.5 md:p-4"
    )}>
      {fullSize && (
        <div className="flex items-center gap-2 mb-5">
          <div className="p-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg">
            <Briefcase size={15} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-black font-mono uppercase tracking-widest text-slate-300">Internship Deliverable</h2>
            <p className="text-[10px] text-slate-500 font-mono">Active milestone tracker</p>
          </div>
        </div>
      )}
      <div className={twMerge(
        "flex justify-between gap-3",
        fullSize ? "flex-col sm:flex-row sm:items-start" : "flex-col sm:flex-row sm:items-center"
      )}>
        {/* Left side: Icon, Editable Title & Deadline badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-violet-500/20 border border-violet-500/30 rounded-lg flex-shrink-0">
            <Briefcase size={14} className="text-violet-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Internship
              </span>

              {/* Days Remaining Pill */}
              <div className={twMerge("px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1", urgency.bg)}>
                <span>{daysLeft}d left</span>
              </div>
            </div>

            {/* Editable Task Title */}
            {editingTask ? (
              <input
                autoFocus
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onBlur={saveTask}
                onKeyDown={(e) => e.key === "Enter" && saveTask()}
                className="bg-slate-700 border border-violet-500/50 text-white text-xs font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-400 mt-0.5"
              />
            ) : (
              <h4
                onClick={() => setEditingTask(true)}
                title="Click to edit task title"
                className="text-xs font-bold text-slate-200 hover:text-violet-300 cursor-pointer truncate max-w-xs transition-colors mt-0.5"
              >
                {tracker?.taskName || "Deliverable"}
              </h4>
            )}
          </div>
        </div>

        {/* Center / Right side: Progress Bar & 4 Compact Icon-Badges */}
        <div className="flex items-center gap-3 flex-shrink-0 justify-between sm:justify-end">
          {/* Progress bar with percentage */}
          <div className="flex flex-col gap-1 w-24 sm:w-28">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">Progress</span>
              <span className={progressPct === 100 ? "text-emerald-400 font-bold" : "text-slate-300"}>
                {completedCount}/4
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={twMerge(
                  "h-full rounded-full transition-all duration-300",
                  progressPct === 100
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-cyan-400"
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 4 Compact Clickable Badges (Docs, Build, Git, Proof) */}
          <div className="flex items-center gap-1.5">
            {CHECKPOINTS.map((item) => {
              const isChecked = Boolean(tracker?.[item.key]);
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  onClick={() => toggleCheckpoint(item.key)}
                  title={`${item.label}: ${isChecked ? "Completed" : "Pending (Click to toggle)"}`}
                  className={twMerge(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    isChecked
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                      : "bg-slate-900/40 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                  )}
                >
                  {isChecked ? (
                    <CheckCircle2 size={11} className="text-emerald-400" />
                  ) : (
                    <Icon size={11} className="text-slate-500" />
                  )}
                  <span>{item.short}</span>
                </button>
              );
            })}
          </div>

          {/* Deadline editor toggle */}
          {editingDeadline ? (
            <input
              type="date"
              autoFocus
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              onBlur={saveDeadline}
              className="bg-slate-700 text-white text-[10px] rounded px-1.5 py-0.5 border border-slate-500 focus:outline-none font-mono"
            />
          ) : (
            <button
              onClick={() => setEditingDeadline(true)}
              title="Click to change deadline"
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Calendar size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
