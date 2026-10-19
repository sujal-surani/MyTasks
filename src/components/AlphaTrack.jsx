import { useState } from "react";
import { Briefcase, Calendar, CheckCircle2, Book, Hammer, GitBranch, FileCheck } from "lucide-react";
import { twMerge } from "tailwind-merge";

const CHECKPOINTS = [
  { key: "isDocsDone",       short: "Docs",  label: "Documentation", icon: Book      },
  { key: "isBuildDone",      short: "Build", label: "Build & Test",  icon: Hammer    },
  { key: "isGitPushed",      short: "Git",   label: "Git Push",      icon: GitBranch },
  { key: "isProofSubmitted", short: "Proof", label: "Proof Submit",  icon: FileCheck },
];

function getDaysRemaining(deadlineDate) {
  if (!deadlineDate) return 10;
  const diff = Math.ceil((new Date(deadlineDate) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function urgencyStyle(days) {
  if (days <= 2) return { text: "text-red-400",    bar: "bg-red-400",    badge: "bg-red-500/10 border-red-500/30 text-red-300"       };
  if (days <= 5) return { text: "text-amber-400",  bar: "bg-amber-400",  badge: "bg-amber-500/10 border-amber-500/30 text-amber-300" };
  return               { text: "text-emerald-400", bar: "bg-emerald-400",badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" };
}

/**
 * AlphaTrack — 7-10 day internship deliverable cycle.
 * Reads from data.internships.alpha and writes via updateData("internships.alpha.*").
 */
export default function AlphaTrack({ alpha = {}, onUpdate }) {
  const [editingTask, setEditingTask] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [taskInput, setTaskInput] = useState(alpha?.taskName || "Week 1 Deliverable");
  const [deadlineInput, setDeadlineInput] = useState(
    alpha?.deadlineDate ? new Date(alpha.deadlineDate).toISOString().split("T")[0] : ""
  );

  const daysLeft = getDaysRemaining(alpha?.deadlineDate);
  const urgency = urgencyStyle(daysLeft);
  const completedCount = CHECKPOINTS.filter((c) => alpha?.[c.key]).length;
  const progressPct = (completedCount / CHECKPOINTS.length) * 100;

  const saveTask = () => {
    if (taskInput.trim()) onUpdate({ "internships.alpha.taskName": taskInput.trim() });
    setEditingTask(false);
  };

  const saveDeadline = () => {
    if (deadlineInput) onUpdate({ "internships.alpha.deadlineDate": new Date(deadlineInput).toISOString() });
    setEditingDeadline(false);
  };

  const toggle = (key) => onUpdate({ [`internships.alpha.${key}`]: !alpha?.[key] });

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-violet-500/15 border border-violet-500/30 rounded-lg flex-shrink-0">
            <Briefcase size={14} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Alpha Track · 7–10d Cycle
              </span>
              <div className={twMerge("px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold", urgency.badge)}>
                {daysLeft}d left
              </div>
            </div>

            {editingTask ? (
              <input
                autoFocus
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onBlur={saveTask}
                onKeyDown={(e) => e.key === "Enter" && saveTask()}
                className="mt-1 bg-slate-700 border border-violet-500/50 text-white text-xs font-bold rounded px-2 py-0.5 focus:outline-none focus:border-violet-400 w-full max-w-xs"
              />
            ) : (
              <h4
                onClick={() => setEditingTask(true)}
                title="Click to edit"
                className="text-xs font-bold text-slate-200 hover:text-violet-300 cursor-pointer truncate max-w-xs transition-colors mt-0.5"
              >
                {alpha?.taskName || "Deliverable"}
              </h4>
            )}
          </div>
        </div>

        {/* Deadline edit */}
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
            title="Change deadline"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1 text-[10px] font-mono"
          >
            <Calendar size={12} />
            <span className="hidden sm:inline">Edit deadline</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500">Progress</span>
          <span className={progressPct === 100 ? "text-emerald-400 font-bold" : "text-slate-300"}>
            {completedCount} / 4 steps
          </span>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={twMerge(
              "h-full rounded-full transition-all duration-500",
              progressPct === 100
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                : urgency.bar
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checkpoint badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CHECKPOINTS.map((item) => {
          const isChecked = Boolean(alpha?.[item.key]);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={twMerge(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-mono font-bold border transition-all duration-200 hover:scale-105 active:scale-95 justify-center",
                isChecked
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                  : "bg-slate-900/40 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600"
              )}
            >
              {isChecked ? (
                <CheckCircle2 size={11} className="text-emerald-400" />
              ) : (
                <Icon size={11} />
              )}
              {item.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
