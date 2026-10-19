import { useEffect, useRef } from "react";
import { Play, Square, RotateCcw, Coffee, CheckCircle, Bell, Maximize2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey } from "../hooks/useFirestore";

const DURATION_PRESETS = [
  { label: "25m", minutes: 25, seconds: 25 * 60 },
  { label: "45m", minutes: 45, seconds: 45 * 60 },
  { label: "60m", minutes: 60, seconds: 60 * 60 },
  { label: "90m", minutes: 90, seconds: 90 * 60 },
];

function formatTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) return "45:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Play synthesized chord on finish
function playCompletionSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + index * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.55);
      });
    }
  } catch (e) {
    console.debug("Web Audio failed:", e);
  }
}

function fireBrowserNotification() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("⚡ Sprint Completed!", {
        body: "Atomic sprint finished! +1 Sprint permanently logged.",
        icon: "/vite.svg",
      });
    }
  }
}

export default function SprintTimer({
  timerState,
  onUpdate,
  onErrandPause,
  onSprintCompleted,
  activeTask,
  onOpenZen,
  todaySprintCount = 0,
  className = "",
}) {
  const { timeLeft, isRunning, isPausedForErrand } = timerState;
  const totalDuration = timerState.totalDuration || 45 * 60;

  const hasLoggedCompletionRef = useRef(false);

  useEffect(() => {
    if (timeLeft > 0) {
      hasLoggedCompletionRef.current = false;
    } else if (timeLeft === 0 && !hasLoggedCompletionRef.current) {
      hasLoggedCompletionRef.current = true;
      playCompletionSound();
      fireBrowserNotification();
      if (onSprintCompleted) {
        onSprintCompleted(getLocalDateKey());
      }
    }
  }, [timeLeft, onSprintCompleted]);

  const pct = Math.min(100, Math.max(0, Math.round(((totalDuration - timeLeft) / totalDuration) * 100)));
  const isFinished = timeLeft === 0;

  // Compact horizontal ring geometry (96x96, radius 38)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = isFinished ? "#4ade80" : isPausedForErrand ? "#fbbf24" : "#22d3ee";
  const ringGlow = isFinished
    ? "drop-shadow-[0_0_10px_rgba(74,222,128,0.6)]"
    : isPausedForErrand
    ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
    : "drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]";

  const handleStart = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    hasLoggedCompletionRef.current = false;
    onUpdate({ "timerState.isRunning": true, "timerState.isPausedForErrand": false });
  };

  const handlePause = () => onUpdate({ "timerState.isRunning": false });

  const handleReset = () => {
    hasLoggedCompletionRef.current = false;
    onUpdate({
      "timerState.timeLeft": totalDuration,
      "timerState.isRunning": false,
      "timerState.isPausedForErrand": false,
      "timerState.currentContextNote": "",
    });
  };

  const handleAdjustTime = (deltaSeconds) => {
    const nextTime = Math.max(60, timeLeft + deltaSeconds);
    onUpdate({ "timerState.timeLeft": nextTime });
  };

  const handleSelectDuration = (preset) => {
    if (isRunning) return;
    onUpdate({
      "timerState.totalDuration": preset.seconds,
      "timerState.timeLeft": preset.seconds,
      "timerState.isRunning": false,
      "timerState.isPausedForErrand": false,
    });
  };

  return (
    <div className={twMerge("bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between select-none shadow-lg min-h-0", className)}>
      {/* Top row: Title + Duration pills + Zen Mode */}
      <div className="flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <div
            className={twMerge(
              "w-2 h-2 rounded-full",
              isFinished
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                : isRunning
                ? "bg-cyan-400 animate-pulse"
                : "bg-slate-600"
            )}
          />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            Sprint · {Math.round(totalDuration / 60)}m
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Duration pills */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            {DURATION_PRESETS.map((p) => {
              const isActive = totalDuration === p.seconds;
              return (
                <button
                  key={p.label}
                  disabled={isRunning}
                  onClick={() => handleSelectDuration(p)}
                  className={twMerge(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all",
                    isActive
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-500 hover:text-slate-300 disabled:opacity-40"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Zen button */}
          <button
            onClick={onOpenZen}
            title="Full-Screen Zen Focus Mode (F)"
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-all text-[10px]"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Middle row: Horizontal Layout (SVG Ring on left, target & counter & +/-5m on right) */}
      <div className="flex items-center gap-3.5 my-auto py-1 shrink-0">
        {/* Left: Compact SVG Ring (96x96, radius 38) */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg
            width="96"
            height="96"
            className={twMerge("-rotate-90 transition-all duration-500", ringGlow)}
          >
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s ease" }}
            />
          </svg>

          {/* Inside Ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              className={twMerge(
                "text-lg font-black font-mono tracking-tight leading-none",
                isFinished ? "text-emerald-400" : isPausedForErrand ? "text-amber-400" : "text-cyan-300"
              )}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-slate-500 font-mono mt-0.5">
              {isFinished ? "✓ 100%" : `${pct}%`}
            </span>
          </div>
        </div>

        {/* Right side of middle row: Active Focus + Session Counter + +/-5m adjusters */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
          {/* Active target badge & title */}
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">
              Active Focus Target
            </span>
            {activeTask ? (
              <span className="text-xs font-mono font-bold text-white truncate block mt-0.5" title={activeTask.text}>
                🎯 {activeTask.text}
              </span>
            ) : (
              <span className="text-xs font-mono text-slate-500 italic block mt-0.5">
                No target pinned (General Sprint)
              </span>
            )}
          </div>

          {/* Session Counter & Goal */}
          <div className="flex items-center justify-between text-[10px] font-mono py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-300">
              Today: <strong className="text-cyan-400">{todaySprintCount} Sp</strong> ({todaySprintCount * 45}m)
            </span>
            <span className="text-slate-500">
              Goal: <strong className="text-emerald-400">4 Sp</strong>
            </span>
          </div>

          {/* +/- 5m Quick Adjusters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAdjustTime(-300)}
              className="flex-1 py-0.5 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-[10px] font-mono font-bold transition-all text-center"
              title="Subtract 5 minutes"
            >
              -5m
            </button>
            <button
              type="button"
              onClick={() => handleAdjustTime(300)}
              className="flex-1 py-0.5 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-[10px] font-mono font-bold transition-all text-center"
              title="Add 5 minutes"
            >
              +5m
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          {isPausedForErrand ? (
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-xs font-mono transition-all hover:scale-[1.01] active:scale-98 shadow-sm"
            >
              <Play size={13} fill="currentColor" /> Resume
            </button>
          ) : isRunning ? (
            <button
              onClick={handlePause}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded-lg text-xs font-mono border border-slate-700 transition-all hover:scale-[1.01] active:scale-98"
            >
              <Square size={13} fill="currentColor" /> Pause [Space]
            </button>
          ) : (
            <button
              onClick={handleStart}
              className={twMerge(
                "flex-1 flex items-center justify-center gap-1.5 font-bold py-1.5 px-3 rounded-lg text-xs font-mono transition-all hover:scale-[1.01] active:scale-98",
                isFinished
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
              )}
            >
              <Play size={13} fill="currentColor" />
              {isFinished ? "Start Next" : "Start Sprint [Space]"}
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={handleReset}
            title="Reset Timer"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700/60 transition-all shrink-0"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Errand Pause button */}
        {!isPausedForErrand && !isFinished && (
          <button
            onClick={onErrandPause}
            className="w-full flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium py-1 px-2 rounded-lg text-[10px] font-mono transition-all"
          >
            <Coffee size={11} />
            <span>Pause for Errand [E]</span>
          </button>
        )}
      </div>
    </div>
  );
}
