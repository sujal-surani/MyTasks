import { useState, useEffect } from "react";
import { RefreshCw, Zap, Flame, CheckCircle2, Circle, Play } from "lucide-react";
import { twMerge } from "tailwind-merge";

const MODE_CONFIG = {
  early_exit: {
    label: "2:15 PM Early Exit",
    sublabel: "Afternoon Deep Build",
    icon: Zap,
    theme: "amber",
    accentClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    toggleBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    blocks: [
      { time: "3:45 PM", label: "Internship Build", category: "internship", cls: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
      { time: "7:00 PM", label: "Startup / Sem 3", category: "startup", cls: "bg-purple-500/10 border-purple-500/30 text-purple-300" },
      { time: "9:30 PM", label: "Deep Night Flow", category: "devops", cls: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
    ],
  },
  full_stretch: {
    label: "5:00 PM Full Stretch",
    sublabel: "Campus Lab Quota & Night Sprint",
    icon: Flame,
    theme: "cyan",
    accentClass: "text-cyan-400",
    borderClass: "border-cyan-500/30",
    toggleBadge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    blocks: [
      { time: "45 min", label: "Campus Lab Quota", category: "btech", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
      { time: "9:30 PM", label: "Main Night Sprint", category: "devops", cls: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
    ],
  },
};

const DAY_FOCUS = {
  weekday_mwf: { label: "DevOps Architecture", color: "text-sky-400", days: [1, 3, 5] },
  weekday_tth: { label: "Startup R&D (GPU/OS)", color: "text-violet-400", days: [2, 4] },
  weekend: { label: "Internship Deliverable", color: "text-emerald-400", days: [0, 6] },
};

function getDayFocus() {
  const d = new Date().getDay();
  return Object.values(DAY_FOCUS).find((f) => f.days.includes(d)) || DAY_FOCUS.weekday_mwf;
}

function getActiveBlockTime(currentMode) {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  if (currentMode === "early_exit") {
    if (mins >= 945 && mins < 1140) return "3:45 PM";
    if (mins >= 1140 && mins < 1290) return "7:00 PM";
    if (mins >= 1290 && mins <= 1435) return "9:30 PM";
  } else {
    if (mins >= 900 && mins < 1170) return "45 min";
    if (mins >= 1290 && mins <= 1435) return "9:30 PM";
  }
  return null;
}

export default function DayModeSwitcher({
  currentMode,
  onModeChange,
  blockChecklist = {},
  onToggleBlockCheck,
  onStartBlockSprint,
}) {
  const cfg = MODE_CONFIG[currentMode] || MODE_CONFIG.early_exit;
  const other = currentMode === "early_exit" ? "full_stretch" : "early_exit";
  const otherCfg = MODE_CONFIG[other];
  const focus = getDayFocus();
  const Icon = cfg.icon;

  const [activeBlockTime, setActiveBlockTime] = useState(() => getActiveBlockTime(currentMode));

  useEffect(() => {
    setActiveBlockTime(getActiveBlockTime(currentMode));
    const interval = setInterval(() => {
      setActiveBlockTime(getActiveBlockTime(currentMode));
    }, 60000);
    return () => clearInterval(interval);
  }, [currentMode]);

  return (
    <div className={twMerge("bg-slate-900/90 backdrop-blur-md border rounded-xl p-3 shadow-md flex flex-col gap-2 shrink-0 select-none", cfg.borderClass)}>
      {/* Top row: Mode toggle + Pillar badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-slate-800 border border-slate-700/60">
            <Icon size={14} className={cfg.accentClass} />
          </div>
          <span className={twMerge("text-xs font-bold font-mono tracking-tight", cfg.accentClass)}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            · {cfg.sublabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
            Today: <strong className={focus.color}>{focus.label}</strong>
          </span>

          <button
            onClick={() => onModeChange(other)}
            title="Switch Day Mode Protocol"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-[10px] font-mono font-bold text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={10} />
            <span>Switch → {otherCfg.label.split(" ")[0]}</span>
          </button>
        </div>
      </div>

      {/* Target Blocks Row */}
      <div className={twMerge("grid gap-1.5", cfg.blocks.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {cfg.blocks.map((block, i) => {
          const isCrushed = Boolean(blockChecklist[block.time]);
          const isNowRunning = activeBlockTime === block.time;

          return (
            <div
              key={i}
              className={twMerge(
                "flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-all",
                isCrushed
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                  : isNowRunning
                  ? "bg-slate-800/90 border-cyan-400/60 text-cyan-100 ring-1 ring-cyan-400/40"
                  : block.cls
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => onToggleBlockCheck && onToggleBlockCheck(block.time)}
                  className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors"
                  title={isCrushed ? "Mark pending" : "Mark crushed"}
                >
                  {isCrushed ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Circle size={13} />
                  )}
                </button>
                <div className="min-w-0 truncate">
                  <span className="font-bold text-[10px] block leading-none">{block.time}</span>
                  <span className="text-[10px] text-slate-400 truncate block mt-0.5">{block.label}</span>
                </div>
              </div>

              {!isCrushed && (
                <button
                  onClick={() => onStartBlockSprint && onStartBlockSprint(block.label, block.category)}
                  title="Queue and start sprint for this block"
                  className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/50 transition-all shrink-0 ml-1"
                >
                  <Play size={10} fill="currentColor" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
