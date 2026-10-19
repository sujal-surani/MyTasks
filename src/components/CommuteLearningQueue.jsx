import { useState } from "react";
import { Headphones, Plus, Trash2, CheckCircle2, Circle, ExternalLink, Video, Radio, BookOpen, Sparkles } from "lucide-react";
import { twMerge } from "tailwind-merge";

export default function CommuteLearningQueue({ commuteQueue = [], onUpdate }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [rideType, setRideType] = useState("morning");
  const [activeFilter, setActiveFilter] = useState("all");

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newItem = {
      id: `commute_${Date.now()}`,
      title: title.trim(),
      url: url.trim(),
      rideType,
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    onUpdate([newItem, ...commuteQueue]);
    setTitle("");
    setUrl("");
  };

  const handleToggleItem = (id) => {
    const updated = commuteQueue.map((item) =>
      item.id === id ? { ...item, isDone: !item.isDone } : item
    );
    onUpdate(updated);
  };

  const handleDeleteItem = (id) => {
    const updated = commuteQueue.filter((item) => item.id !== id);
    onUpdate(updated);
  };

  const filteredItems = commuteQueue.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return !item.isDone;
    if (activeFilter === "done") return item.isDone;
    return item.rideType === activeFilter;
  });

  const doneCount = commuteQueue.filter((i) => i.isDone).length;

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Headphones size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black font-mono uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              20km Commute Learning Queue
              <span className="text-[10px] font-normal text-indigo-300 font-mono">(2h Daily Travel)</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              YouTube architecture deep-dives, systems podcasts & offline RFC docs
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-700/60 text-[10px] font-mono">
          {["all", "morning", "return", "done"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={twMerge(
                "px-2 py-0.5 rounded-lg font-bold uppercase transition-all",
                activeFilter === f
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/50 text-xs font-mono">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Topic / Video title (e.g. Linux CFS Scheduler Explained)…"
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-400/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (optional)…"
          className="flex-1 sm:max-w-[200px] bg-slate-950 border border-slate-800 focus:border-indigo-400/70 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none text-[11px]"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={rideType}
            onChange={(e) => setRideType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 px-2 py-1.5 focus:outline-none"
          >
            <option value="morning">🌅 Morning Ride</option>
            <option value="return">🌇 Return Ride</option>
          </select>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white font-bold text-xs transition-all flex items-center gap-1"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* List */}
      {commuteQueue.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
          <Headphones size={24} className="mx-auto text-slate-700 mb-1.5" />
          <p className="text-xs text-slate-500 font-mono">
            No commute learning topics queued yet.
          </p>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">
            Add tech podcasts, YouTube videos, or docs to listen during your 20km campus travel.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {filteredItems.map((item) => {
            const isUrl = Boolean(item.url && (item.url.startsWith("http://") || item.url.startsWith("https://")));
            const isYt = Boolean(item.url && (item.url.includes("youtube.com") || item.url.includes("youtu.be")));

            return (
              <div
                key={item.id}
                className={twMerge(
                  "flex items-center justify-between gap-2 p-2 rounded-xl border transition-all text-xs font-mono group",
                  item.isDone
                    ? "bg-slate-900/30 border-slate-800/60 opacity-60"
                    : "bg-slate-900/70 border-slate-700/50 hover:border-slate-600"
                )}
              >
                <button
                  onClick={() => handleToggleItem(item.id)}
                  className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                >
                  {item.isDone ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-slate-600 hover:text-indigo-400 shrink-0" />
                  )}
                  <span className={twMerge("truncate font-medium", item.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                    {item.title}
                  </span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={twMerge(
                      "text-[9px] px-1.5 py-0.5 rounded border",
                      item.rideType === "morning"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    )}
                  >
                    {item.rideType === "morning" ? "🌅 Morning" : "🌇 Return"}
                  </span>

                  {isUrl && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Open URL"
                    >
                      {isYt ? <Video size={12} className="text-red-400" /> : <ExternalLink size={11} />}
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer counter */}
      {commuteQueue.length > 0 && (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
          <span>{doneCount} of {commuteQueue.length} commute items listened</span>
          <span className="text-indigo-400 font-bold">~{doneCount * 30} mins passive travel learning</span>
        </div>
      )}
    </div>
  );
}
