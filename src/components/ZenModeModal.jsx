import { useEffect } from "react";
import { Maximize2, Minimize2, Play, Square, RotateCcw, Coffee, CheckCircle2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

function formatTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) return "45:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ZenModeModal({
  isOpen,
  onClose,
  timerState,
  onUpdateTimer,
  onErrandPause,
  activeTask,
}) {
  const { timeLeft, isRunning, isPausedForErrand, totalDuration = 45 * 60 } = timerState;
  const pct = Math.min(100, Math.max(0, Math.round(((totalDuration - timeLeft) / totalDuration) * 100)));
  const isFinished = timeLeft === 0;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape" || e.key.toLowerCase() === "f") {
        e.preventDefault();
        onClose();
      } else if (e.code === "Space") {
        e.preventDefault();
        onUpdateTimer({ "timerState.isRunning": !isRunning, "timerState.isPausedForErrand": false });
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        onErrandPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isRunning, onClose, onUpdateTimer, onErrandPause]);

  if (!isOpen) return null;

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = isFinished ? "#4ade80" : isPausedForErrand ? "#fbbf24" : "#22d3ee";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between p-8 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
            Zen Focus Cockpit · High-Impact Sprint
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          <Minimize2 size={13} />
          <span>Exit Zen [Esc / F]</span>
        </button>
      </div>

      {/* Center Display */}
      <div className="flex flex-col items-center justify-center my-auto gap-6">
        {/* Active Task Banner */}
        {activeTask ? (
          <div className="flex flex-col items-center gap-1 max-w-xl text-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              {activeTask.category || "Active Target"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {activeTask.text}
            </h1>
          </div>
        ) : (
          <div className="text-slate-400 text-sm font-mono">⚡ Deep Work Sprint in Progress</div>
        )}

        {/* Ring */}
        <div className="relative">
          <svg
            width="300"
            height="300"
            className="-rotate-90 drop-shadow-[0_0_35px_rgba(34,211,238,0.25)]"
          >
            <circle cx="150" cy="150" r={radius} fill="none" stroke="#0f172a" strokeWidth="12" />
            <circle
              cx="150"
              cy="150"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black font-mono tracking-tighter text-cyan-300">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm font-mono text-slate-400 mt-2">
              {isFinished ? "✓ Sprint Finished" : `${pct}% Elapsed`}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              onUpdateTimer({
                "timerState.isRunning": !isRunning,
                "timerState.isPausedForErrand": false,
              })
            }
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
          >
            {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            <span>{isRunning ? "Pause [Space]" : "Start [Space]"}</span>
          </button>
          <button
            onClick={onErrandPause}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-mono text-xs transition-all"
          >
            <Coffee size={14} />
            <span>Errand Break [E]</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-900 pt-4">
        <span>No distractions · Terminal discipline</span>
        <span>100% Zero-Scroll Viewport</span>
      </div>
    </div>
  );
}
