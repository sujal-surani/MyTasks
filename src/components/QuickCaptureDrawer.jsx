import { useState } from "react";
import { X, Brain, ArrowRight, Calendar, ShoppingCart, Trash2, Sparkles, Cpu } from "lucide-react";
import { getLocalDateKey } from "../hooks/useFirestore";

export default function QuickCaptureDrawer({
  isOpen,
  onClose,
  brainDump = [],
  onUpdateBrainDump,
  onAddTask,
  onAddLifeTask,
  onAddToStartup,
}) {
  const [filter, setFilter] = useState("");
  const todayKey = getLocalDateKey();
  const tomorrowKey = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  if (!isOpen) return null;

  const filteredItems = brainDump.filter((item) =>
    item.toLowerCase().includes(filter.toLowerCase())
  );

  const removeItem = (index) => {
    const updated = brainDump.filter((_, i) => i !== index);
    onUpdateBrainDump(updated);
  };

  const handleSendToToday = (text, index) => {
    onAddTask({
      id: `task_${Date.now()}_dump`,
      text,
      category: "general",
      status: "today",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    });
    removeItem(index);
  };

  const handleSendToTomorrow = (text, index) => {
    onAddTask({
      id: `task_${Date.now()}_dump`,
      text,
      category: "general",
      status: "today",
      targetDate: tomorrowKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    });
    removeItem(index);
  };

  const handleSendToLife = (text, index) => {
    onAddLifeTask({
      id: `life_${Date.now()}`,
      text,
      isDone: false,
      tag: "personal",
      retentionMode: "keep",
      createdAt: new Date().toISOString(),
    });
    removeItem(index);
  };

  const handleSendToStartup = (text, index) => {
    if (onAddToStartup) {
      onAddToStartup(text);
    }
    removeItem(index);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 p-5 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Brain size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black font-mono text-white flex items-center gap-1.5">
                  QUICK CAPTURE TRIAGE
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-normal">
                    {brainDump.length} held
                  </span>
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">
                  Inbox Zero holding pen · Shortcut: Alt+C
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick search/filter if list is long */}
          {brainDump.length > 4 && (
            <div className="py-2.5">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter captures…"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 text-xs text-slate-200 placeholder-slate-600 rounded-xl px-3 py-1.5 font-mono focus:outline-none"
              />
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 custom-scrollbar pr-1">
            {brainDump.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
                <Sparkles size={28} className="text-amber-400/60" />
                <p className="text-xs font-mono font-bold text-slate-300">
                  Inbox Zero! Nothing Held
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Dump thoughts mid-sprint into the quick capture box in the sidebar or mobile header.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono text-center py-6">
                No matching captures
              </p>
            ) : (
              filteredItems.map((note, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2 group"
                >
                  <p className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {note}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
                    <button
                      onClick={() => handleSendToToday(note, index)}
                      className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1"
                    >
                      <ArrowRight size={10} /> Today
                    </button>
                    <button
                      onClick={() => handleSendToTomorrow(note, index)}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1"
                    >
                      <Calendar size={10} /> Tomorrow
                    </button>
                    <button
                      onClick={() => handleSendToLife(note, index)}
                      className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 transition-colors flex items-center gap-1"
                    >
                      <ShoppingCart size={10} /> Life
                    </button>
                    <button
                      onClick={() => handleSendToStartup(note, index)}
                      className="px-2 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 transition-colors flex items-center gap-1"
                    >
                      <Cpu size={10} /> Startup
                    </button>
                    <button
                      onClick={() => removeItem(index)}
                      className="ml-auto p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Discard"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Press Esc to close</span>
            {brainDump.length > 0 && (
              <button
                onClick={() => onUpdateBrainDump([])}
                className="text-red-400/80 hover:text-red-400 transition-colors text-[10px]"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
