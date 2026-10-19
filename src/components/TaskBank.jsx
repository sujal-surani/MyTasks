import { Plus, Terminal, Cpu, Briefcase, GraduationCap, Compass, ShieldAlert } from "lucide-react";
import { twMerge } from "tailwind-merge";

// ─── Core Pillars Quick-Queue Config ──────────────────────────────────────────
export const QUICK_QUEUE_PILLARS = [
  {
    category: "devops",
    title: "Cloud & DevOps Architecture Build",
    shortLabel: "DevOps",
    icon: Terminal,
    borderHover: "hover:border-cyan-400/70 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  {
    category: "startup",
    title: "Deep-Tech Startup R&D (GPU/OS)",
    shortLabel: "Startup",
    icon: Cpu,
    borderHover: "hover:border-violet-400/70 hover:shadow-[0_0_12px_rgba(167,139,250,0.3)]",
    badgeClass: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  {
    category: "internship",
    title: "Internship Milestone Execution",
    shortLabel: "Internship",
    icon: Briefcase,
    borderHover: "hover:border-emerald-400/70 hover:shadow-[0_0_12px_rgba(52,211,153,0.3)]",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    category: "btech",
    title: "B.Tech Sem 3 & Lab Clearing",
    shortLabel: "B.Tech",
    icon: GraduationCap,
    borderHover: "hover:border-amber-400/70 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    category: "general",
    title: "General / Admin / Exploration",
    shortLabel: "General",
    icon: Compass,
    borderHover: "hover:border-slate-400/70 hover:shadow-[0_0_12px_rgba(148,163,184,0.3)]",
    badgeClass: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  },
];

export default function TaskBank({ onAddTaskToToday, targetDate, isExamMode = false }) {
  const handleAdd = (pillar) => {
    const newTask = {
      id: `task_${Date.now()}_${pillar.category}`,
      text: pillar.title,
      category: pillar.category,
      status: "today",
      targetDate: targetDate || new Date().toISOString().split("T")[0],
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    onAddTaskToToday(newTask);
  };

  // Exam Triage Mode hides Startup & DevOps pillars to prioritize B.Tech & Internship
  const visiblePillars = isExamMode
    ? QUICK_QUEUE_PILLARS.filter(
        (p) => p.category !== "startup" && p.category !== "devops"
      )
    : QUICK_QUEUE_PILLARS;

  return (
    <div
      className={twMerge(
        "backdrop-blur-md border rounded-2xl p-3.5 md:p-4 shadow-xl transition-all duration-300",
        isExamMode
          ? "bg-slate-900/80 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]"
          : "bg-slate-800/60 border-slate-700/50"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={twMerge(
              "w-2 h-2 rounded-full animate-pulse",
              isExamMode ? "bg-amber-400" : "bg-cyan-400"
            )}
          />
          <h3
            className={twMerge(
              "text-xs font-bold uppercase tracking-widest font-mono flex items-center gap-1.5",
              isExamMode ? "text-amber-300" : "text-slate-300"
            )}
          >
            {isExamMode && <ShieldAlert size={12} />}
            Quick-Queue (45m Sprint)
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Target: <strong className="text-slate-300">{targetDate || "Today"}</strong>
          {isExamMode && " · DevOps & Startup paused"}
        </span>
      </div>

      {/* Grid of clean, minimalist pillar buttons */}
      <div
        className={twMerge(
          "grid gap-2",
          isExamMode
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-5"
        )}
      >
        {visiblePillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <button
              key={pillar.category}
              onClick={() => handleAdd(pillar)}
              className={twMerge(
                "group relative flex items-center justify-between p-2.5 rounded-xl border bg-slate-900/50 border-slate-700/50",
                "transition-all duration-200 hover:scale-[1.03] active:scale-95 text-left",
                pillar.borderHover
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={twMerge("p-1 rounded-md border text-xs", pillar.badgeClass)}>
                  <Icon size={12} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate font-mono">
                    {pillar.shortLabel}
                  </p>
                </div>
              </div>

              <div
                className={twMerge(
                  "p-1 rounded-md bg-slate-800 text-slate-500 transition-colors flex-shrink-0",
                  isExamMode
                    ? "group-hover:bg-amber-500 group-hover:text-slate-950"
                    : "group-hover:bg-cyan-500 group-hover:text-slate-900"
                )}
              >
                <Plus size={12} strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
