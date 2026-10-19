import { useEffect, useRef } from "react";
import { Save, Play, Coffee, CheckCircle2, Circle, ShoppingCart } from "lucide-react";

/**
 * ErrandModal V4 — full-screen overlay for "Pause for Household Errand".
 * - "Where I Left Off" context textarea.
 * - NEW: mini-view of lifeTasks so you can see quick chores to knock out while away.
 */
export default function ErrandModal({ isOpen, contextNote, onContextChange, onResume, lifeTasks = [] }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingChores = lifeTasks.filter((t) => !t.isDone);
  const doneChores = lifeTasks.filter((t) => t.isDone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        style={{ animation: "fadeIn 0.25s ease-out" }}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-lg bg-slate-800/95 border border-amber-500/50 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          boxShadow: "0 0 40px rgba(245,158,11,0.15), 0 25px 50px rgba(0,0,0,0.5)",
          animation: "slideUp 0.28s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl">
            <Coffee size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-300">Errand Break</h2>
            <p className="text-xs text-slate-500">Timer paused · Save your context below</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-400 font-mono">PAUSED</span>
          </div>
        </div>

        {/* Context textarea */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Save size={13} className="text-amber-400" />
            <label className="text-sm font-semibold text-amber-300">Where I Left Off</label>
            <span className="ml-auto text-xs text-slate-600 font-mono">auto-syncs ✓</span>
          </div>
          <textarea
            ref={textareaRef}
            value={contextNote}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder={"// File: src/hooks/useFirestore.js\n// Working on: expandDotKeys() nested merge fix\n// Next step: wire updateDoc for internshipTracker\n// Don't forget: run npm run build"}
            rows={5}
            className="w-full bg-slate-900/80 border border-amber-500/30 text-slate-200 placeholder-slate-700
                       text-sm rounded-xl p-4 resize-none focus:outline-none focus:border-amber-400/60
                       focus:ring-1 focus:ring-amber-400/20 font-mono leading-relaxed transition-colors duration-200"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50 mb-4" />

        {/* ── Life Chores Mini-View ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={13} className="text-orange-400" />
            <span className="text-sm font-semibold text-orange-300">Quick Chores While You're Up</span>
            {pendingChores.length > 0 && (
              <span className="ml-auto text-[10px] font-mono font-bold rounded-full px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {pendingChores.length} pending
              </span>
            )}
          </div>

          {lifeTasks.length === 0 ? (
            <p className="text-[10px] text-slate-700 font-mono text-center py-3">
              Life Inbox is empty — add chores on the Tasks page
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {pendingChores.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-900/30">
                  <Circle size={13} className="text-slate-700 flex-shrink-0" />
                  <p className="text-xs text-slate-400 font-mono leading-relaxed">{task.text}</p>
                </div>
              ))}
              {doneChores.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg opacity-40">
                  <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
                  <p className="text-xs text-slate-600 font-mono line-through">{task.text}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-slate-700 font-mono mt-2 text-right">
            Manage chores on /tasks → Life & Admin Inbox
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50 mb-5" />

        {/* Resume button */}
        <button
          onClick={onResume}
          className="w-full flex items-center justify-center gap-2
                     bg-green-500 hover:bg-green-400 active:scale-95
                     text-slate-900 font-bold py-3 rounded-xl
                     transition-all duration-200 hover:scale-[1.02]
                     hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] text-sm"
        >
          <Play size={16} fill="currentColor" />
          Resume Sprint
        </button>

        <p className="text-center text-xs text-slate-700 mt-3 font-mono">
          context saved · visible on all devices
        </p>
      </div>
    </div>
  );
}
