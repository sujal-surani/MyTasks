import { useState, useRef, useEffect } from "react";
import { Plus, CheckCircle2, Circle, Trash2, ShoppingCart, Tag, RotateCcw } from "lucide-react";
import { getLocalDateKey } from "../hooks/useFirestore";
import { twMerge } from "tailwind-merge";

const TAGS = [
  { id: "home", label: "🏠 Mom / Home Errand", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "market", label: "🛒 Market / Outside", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "personal", label: "📌 Personal", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
];

export default function LifeAdminInbox({ lifeTasks = [], onUpdate }) {
  const [newText, setNewText] = useState("");
  const [selectedTag, setSelectedTag] = useState("home");
  const [retentionMode, setRetentionMode] = useState("keep"); // "keep" vs "midnight"
  const inputRef = useRef(null);

  // Auto-purge tasks only if marked as 'midnight' retention and done on a previous calendar day
  useEffect(() => {
    const today = getLocalDateKey();
    const purged = lifeTasks.filter((t) => {
      if (!t.isDone) return true;
      if (t.retentionMode === "keep") return true; // Keep until explicitly deleted
      if (!t.createdAt) return false;
      return getLocalDateKey(new Date(t.createdAt)) === today;
    });
    if (purged.length !== lifeTasks.length) {
      onUpdate(purged);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const task = {
      id: `life_${Date.now()}`,
      text: newText.trim(),
      tag: selectedTag,
      retentionMode,
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    onUpdate([...lifeTasks, task]);
    setNewText("");
    inputRef.current?.focus();
  };

  const handleToggle = (id) => {
    onUpdate(lifeTasks.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)));
  };

  const handleDelete = (id) => {
    onUpdate(lifeTasks.filter((t) => t.id !== id));
  };

  const pending = lifeTasks.filter((t) => !t.isDone);
  const done = lifeTasks.filter((t) => t.isDone);

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 md:p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <ShoppingCart size={13} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">
              Life & Admin Inbox
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              Quick chores · Mom/Home errands · Market errands · Personal
            </p>
          </div>
        </div>

        {/* Retention Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-slate-700/60 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setRetentionMode("keep")}
              className={twMerge(
                "px-2 py-0.5 rounded-lg transition-all",
                retentionMode === "keep"
                  ? "bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Keep until done
            </button>
            <button
              type="button"
              onClick={() => setRetentionMode("midnight")}
              className={twMerge(
                "px-2 py-0.5 rounded-lg transition-all",
                retentionMode === "midnight"
                  ? "bg-slate-700 text-slate-200 font-bold"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Reset midnight
            </button>
          </div>

          {pending.length > 0 && (
            <span className="text-[10px] font-bold font-mono rounded-full px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30">
              {pending.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Add form with Category Tag selector */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-3.5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g. Call plumber, pick up vegetables from market, pay electricity bill…"
            className="flex-1 bg-slate-900/50 border border-slate-700/40 focus:border-orange-500/40 text-slate-200 placeholder-slate-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-1 shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>

        {/* Tag pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-500 mr-1">Tag:</span>
          {TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTag(t.id)}
              className={twMerge(
                "px-2.5 py-1 rounded-xl text-[10px] font-mono transition-all border",
                selectedTag === t.id
                  ? `${t.color} font-bold ring-1 ring-orange-400/30 shadow-sm`
                  : "bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </form>

      {/* Tasks list */}
      {lifeTasks.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[10px] text-slate-700 font-mono">
            Inbox empty · add a quick chore or errand
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Pending */}
          {pending.map((task) => {
            const tagObj = TAGS.find((t) => t.id === task.tag) || TAGS[0];
            return (
              <div
                key={task.id}
                className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <button
                  onClick={() => handleToggle(task.id)}
                  className="flex-shrink-0 hover:scale-110 active:scale-95 transition-transform"
                >
                  <Circle size={15} className="text-slate-600 hover:text-orange-400 transition-colors" />
                </button>

                <div className="flex-1 min-w-0">
                  <span className={twMerge("text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border mr-2", tagObj.color)}>
                    {tagObj.label}
                  </span>
                  <span className="text-xs text-slate-300 font-mono leading-relaxed">{task.text}</span>
                </div>

                <button
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-700 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}

          {/* Divider if both exist */}
          {done.length > 0 && pending.length > 0 && (
            <div className="my-1 border-t border-slate-700/30" />
          )}

          {/* Done */}
          {done.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl opacity-50 bg-slate-900/20 border border-slate-800/40"
            >
              <button
                onClick={() => handleToggle(task.id)}
                className="flex-shrink-0 hover:scale-110 active:scale-95 transition-transform"
              >
                <CheckCircle2 size={15} className="text-green-400" />
              </button>
              <p className="flex-1 text-xs text-slate-500 font-mono line-through">{task.text}</p>
              <button
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-700 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
