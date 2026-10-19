import { useState, useEffect, useRef } from "react";
import { Clock, CheckCircle2, AlertTriangle, Pencil } from "lucide-react";
import { getLocalDateKey } from "../hooks/useFirestore";
import { twMerge } from "tailwind-merge";

/**
 * BetaTrack — Daily 10 PM internship deadline card.
 * - Text input for today's assignment name.
 * - Giant "MARK SUBMITTED" toggle.
 * - Auto-resets isSubmittedToday at midnight via lastResetDate comparison.
 */
export default function BetaTrack({ beta = {}, onUpdate }) {
  const [editingTask, setEditingTask] = useState(false);
  const [taskInput, setTaskInput] = useState(beta?.taskName || "");
  const [now, setNow] = useState(new Date());
  const taskInputRef = useRef(null);

  // Live clock (for 10 PM countdown)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-reset isSubmittedToday at midnight
  useEffect(() => {
    const today = getLocalDateKey();
    if (beta?.lastResetDate !== today && beta?.isSubmittedToday) {
      onUpdate({
        "internships.beta.isSubmittedToday": false,
        "internships.beta.lastResetDate": today,
      });
    }
  }, [beta?.lastResetDate, beta?.isSubmittedToday, onUpdate]);

  const saveTask = () => {
    if (taskInput.trim()) onUpdate({ "internships.beta.taskName": taskInput.trim() });
    setEditingTask(false);
  };

  const toggleSubmitted = () => {
    onUpdate({
      "internships.beta.isSubmittedToday": !beta?.isSubmittedToday,
      "internships.beta.lastResetDate": getLocalDateKey(),
    });
  };

  // Countdown to 10:00 PM
  const target = new Date(now);
  target.setHours(22, 0, 0, 0);
  const isPast10PM = now >= target;
  const secRemaining = Math.max(0, Math.floor((target - now) / 1000));
  const hoursLeft = Math.floor(secRemaining / 3600);
  const minsLeft = Math.floor((secRemaining % 3600) / 60);
  const secsLeft = secRemaining % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const countdownStr = `${pad(hoursLeft)}:${pad(minsLeft)}:${pad(secsLeft)}`;

  const isUrgent = !beta?.isSubmittedToday && !isPast10PM && secRemaining < 2 * 3600; // < 2h
  const isCritical = !beta?.isSubmittedToday && !isPast10PM && secRemaining < 30 * 60; // < 30m
  const isMissed = !beta?.isSubmittedToday && isPast10PM;

  return (
    <div
      className={twMerge(
        "bg-slate-800/60 backdrop-blur-md border rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-4 transition-all duration-300",
        beta?.isSubmittedToday
          ? "border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
          : isMissed
          ? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          : isCritical
          ? "border-red-500/50 animate-pulse"
          : isUrgent
          ? "border-amber-500/50"
          : "border-slate-700/50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={twMerge(
              "p-1.5 rounded-lg border flex-shrink-0",
              beta?.isSubmittedToday
                ? "bg-emerald-500/15 border-emerald-500/30"
                : isMissed
                ? "bg-red-500/15 border-red-500/30"
                : "bg-rose-500/10 border-rose-500/25"
            )}
          >
            <Clock
              size={14}
              className={
                beta?.isSubmittedToday
                  ? "text-emerald-400"
                  : isMissed
                  ? "text-red-400"
                  : "text-rose-400"
              }
            />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Beta Track · Daily 10 PM
            </span>
            {/* Editable task name */}
            {editingTask ? (
              <input
                ref={taskInputRef}
                autoFocus
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onBlur={saveTask}
                onKeyDown={(e) => e.key === "Enter" && saveTask()}
                placeholder="Today's assignment…"
                className="block mt-0.5 bg-slate-700 border border-rose-500/40 text-white text-xs font-bold rounded px-2 py-0.5 focus:outline-none focus:border-rose-400 w-full max-w-xs font-mono"
              />
            ) : (
              <div
                className="flex items-center gap-1.5 cursor-pointer group mt-0.5"
                onClick={() => { setEditingTask(true); setTimeout(() => taskInputRef.current?.focus(), 50); }}
              >
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors font-mono truncate max-w-[200px]">
                  {beta?.taskName || "Set today's assignment…"}
                </h4>
                <Pencil size={10} className="text-slate-600 group-hover:text-rose-400 transition-colors flex-shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Status badge */}
        {beta?.isSubmittedToday ? (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={10} /> SUBMITTED
          </span>
        ) : isMissed ? (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-300 bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full animate-pulse">
            <AlertTriangle size={10} /> MISSED
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 bg-slate-700/50 border border-slate-600/40 px-2.5 py-1 rounded-full">
            <Clock size={10} /> PENDING
          </span>
        )}
      </div>

      {/* Countdown display */}
      {!beta?.isSubmittedToday && (
        <div
          className={twMerge(
            "flex flex-col items-center justify-center py-3 rounded-xl border",
            isCritical
              ? "bg-red-950/40 border-red-500/30"
              : isUrgent
              ? "bg-amber-950/30 border-amber-500/20"
              : isPast10PM
              ? "bg-red-950/30 border-red-500/20"
              : "bg-slate-900/40 border-slate-700/30"
          )}
        >
          <span
            className={twMerge(
              "text-3xl font-black font-mono tracking-tighter",
              isCritical ? "text-red-300 animate-pulse" : isUrgent ? "text-amber-300" : isMissed ? "text-red-400" : "text-slate-300"
            )}
          >
            {isPast10PM ? "10:00 PM" : countdownStr}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            {isPast10PM ? "Deadline has passed" : "until 10:00 PM deadline"}
          </span>
        </div>
      )}

      {/* Giant MARK SUBMITTED toggle */}
      <button
        onClick={toggleSubmitted}
        className={twMerge(
          "w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm font-mono tracking-wider transition-all duration-300",
          "border-2 hover:scale-[1.02] active:scale-95",
          beta?.isSubmittedToday
            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.3)] hover:bg-emerald-500/30"
            : "bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]"
        )}
      >
        {beta?.isSubmittedToday ? (
          <>
            <CheckCircle2 size={20} className="text-emerald-400" />
            ✓ SUBMITTED TODAY — Click to undo
          </>
        ) : (
          <>
            <CheckCircle2 size={20} />
            MARK SUBMITTED
          </>
        )}
      </button>
    </div>
  );
}
