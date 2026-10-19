import { useState } from "react";
import { Clock, Plus, X, Check, Calendar, Zap } from "lucide-react";
import { twMerge } from "tailwind-merge";

const TIME_SLOTS = [
  "Morning/Campus",
  "3:45 PM Block",
  "7:00 PM Block",
  "9:30 PM Block",
  "Night Owl / Misc",
];

const PILLARS = [
  { id: "devops", label: "DevOps", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
  { id: "startup", label: "Startup", color: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
  { id: "internship", label: "Internship", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { id: "btech", label: "B.Tech", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { id: "general", label: "General", color: "text-slate-400 border-slate-600/40 bg-slate-700/20" },
];

const DURATION_PRESETS = [
  { label: "1 Sprint (45m)", sprints: 1 },
  { label: "2 Sprints (1.5h)", sprints: 2 },
  { label: "3 Sprints (2.25h)", sprints: 3 },
  { label: "4 Sprints (3.0h)", sprints: 4 },
];

export default function ManualWorkModal({ isOpen, onClose, onLogWork }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("devops");
  const [sprintCount, setSprintCount] = useState(1);
  const [timeSlot, setTimeSlot] = useState("Morning/Campus");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onLogWork({
      text: text.trim(),
      category,
      sprintCount: Number(sprintCount) || 1,
      timeSlot,
    });
    setText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white"
        style={{
          boxShadow: "0 0 40px rgba(6,182,212,0.18), 0 20px 40px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Clock size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black font-mono tracking-tight text-white">
                LOG COMPLETED WORK
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Retroactive day logging · increments heatmap & pillar health
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Work description */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block">
              What did you complete? *
            </label>
            <input
              autoFocus
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Lab viva clearing, AWS ECS deployment, Docker compose fix…"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs text-slate-200 placeholder-slate-600 rounded-xl px-3 py-2.5 focus:outline-none font-mono"
            />
          </div>

          {/* Pillar Selection */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Pillar
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PILLARS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCategory(p.id)}
                  className={twMerge(
                    "px-2 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all text-center",
                    category === p.id
                      ? `${p.color} ring-1 ring-cyan-400/50 shadow-sm`
                      : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Time Slot
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={twMerge(
                    "px-2 py-1.5 rounded-xl border text-[10px] font-mono transition-all text-center",
                    timeSlot === slot
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Sprints / Duration */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center justify-between">
              <span>Duration / Sprints</span>
              <span className="text-cyan-400 font-normal">
                {sprintCount} Sprint{sprintCount > 1 ? "s" : ""} = {sprintCount * 45} mins
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d.sprints}
                  type="button"
                  onClick={() => setSprintCount(d.sprints)}
                  className={twMerge(
                    "px-2 py-2 rounded-xl border text-[10px] font-mono transition-all text-center",
                    sprintCount === d.sprints
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                      : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              Log Work & Update Heatmap ✓
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
