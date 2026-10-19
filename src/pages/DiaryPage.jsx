import { useState, useEffect, useMemo } from "react";
import { useFirestoreContext } from "../context/FirestoreContext";
import { getLocalDateKey } from "../hooks/useFirestore";
import { useToast } from "../context/ToastContext";
import {
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Zap,
  BatteryCharging,
  Coffee,
  Code2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  RotateCcw,
  Rocket
} from "lucide-react";
import { twMerge } from "tailwind-merge";

const MOODS = [
  { id: "⚡ High Focus", label: "High Focus", icon: Zap, color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { id: "🔋 Moderate", label: "Moderate", icon: BatteryCharging, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { id: "☕ Exhausted", label: "Exhausted", icon: Coffee, color: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
  { id: "💻 Deep Flow", label: "Deep Flow", icon: Code2, color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
];

export default function DiaryPage() {
  const {
    data,
    saveDiaryEntry,
    getEffectiveSprintsForDate,
    isBetaSubmittedToday,
  } = useFirestoreContext();

  const { showToast } = useToast();
  const todayKey = getLocalDateKey();

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [mood, setMood] = useState("⚡ High Focus");
  const [narrative, setNarrative] = useState("");
  const [wins, setWins] = useState("");
  const [intentions, setIntentions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState("");

  // Load entry when selectedDate changes or when data.dailyDiary updates
  useEffect(() => {
    const entry = data.dailyDiary?.[selectedDate] || {};
    setNarrative(entry.narrative || "");
    setWins(entry.wins || "");
    setIntentions(entry.intentions || "");
    setMood(entry.mood || "⚡ High Focus");
    if (entry.updatedAt) {
      const d = new Date(entry.updatedAt);
      setLastSavedTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      setLastSavedTime("");
    }
  }, [selectedDate, data.dailyDiary]);

  // Compute stats for selected date
  const sprintsOnDate = useMemo(() => {
    if (typeof getEffectiveSprintsForDate === "function") {
      return getEffectiveSprintsForDate(selectedDate);
    }
    return 0;
  }, [getEffectiveSprintsForDate, selectedDate]);

  // Beta status for selected date
  const isBetaSubmittedOnDate = useMemo(() => {
    if (selectedDate === todayKey) {
      return Boolean(isBetaSubmittedToday);
    }
    const betaHistory = Array.isArray(data.internships?.betaHistory)
      ? data.internships.betaHistory
      : [];
    return betaHistory.some((h) => h.date === selectedDate || h.dateKey === selectedDate);
  }, [selectedDate, todayKey, isBetaSubmittedToday, data.internships?.betaHistory]);

  // Task completion stats for selected date
  const { totalTasks, completedTasks } = useMemo(() => {
    const list = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    const dateTasks = list.filter((t) => {
      if (t.targetDate === selectedDate) return true;
      if (t.completedAt && t.completedAt.slice(0, 10) === selectedDate) return true;
      return false;
    });
    const done = dateTasks.filter((t) => t.status === "done").length;
    return { totalTasks: dateTasks.length, completedTasks: done };
  }, [data.dailyTasks, selectedDate]);

  // Captain's Log note for selected date
  const captainsLogOnDate = data.captainsLog?.[selectedDate]?.text || "";

  // Past 14 days list for quick navigation
  const recentDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = getLocalDateKey(d);
      const hasDiary = Boolean(
        data.dailyDiary?.[key]?.narrative ||
        data.dailyDiary?.[key]?.wins ||
        data.dailyDiary?.[key]?.intentions
      );
      const spCount = typeof getEffectiveSprintsForDate === "function" ? getEffectiveSprintsForDate(key) : 0;
      days.push({
        key,
        dateObj: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: key === todayKey,
        hasDiary,
        sprints: spCount,
      });
    }
    return days;
  }, [todayKey, data.dailyDiary, getEffectiveSprintsForDate]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const entry = {
        narrative,
        wins,
        intentions,
        mood,
      };
      await saveDiaryEntry(selectedDate, entry);
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(nowStr);
      showToast(`✓ Diary entry saved for ${selectedDate}`, "success");
    } catch (err) {
      showToast(`Error saving diary: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick text snippet inserter
  const handleInsertSnippet = (targetField, snippet) => {
    if (targetField === "narrative") {
      setNarrative((prev) => (prev ? `${prev}\n${snippet} ` : `${snippet} `));
    } else if (targetField === "wins") {
      setWins((prev) => (prev ? `${prev}\n• ${snippet}` : `• ${snippet}`));
    } else if (targetField === "intentions") {
      setIntentions((prev) => (prev ? `${prev}\n🎯 ${snippet}` : `🎯 ${snippet}`));
    }
  };

  // Push intentions directly to Tomorrow's Task Queue
  const handlePushIntentionsToTomorrow = () => {
    if (!intentions.trim()) {
      showToast("Write some intentions before pushing to Tomorrow's Queue", "info");
      return;
    }
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const tomorrowKey = getLocalDateKey(d);

    const rawLines = intentions
      .split("\n")
      .map((l) => l.replace(/^[-*•🎯\d.]+\s*/, "").trim())
      .filter((l) => l.length > 0);

    const itemsToPush = rawLines.length > 0 ? rawLines : [intentions.trim()];
    const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    const newTasks = itemsToPush.map((text, idx) => ({
      id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      category: "general",
      status: "today",
      targetDate: tomorrowKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    }));

    updateData({ dailyTasks: [...newTasks, ...currentTasks] });
    showToast(`🚀 Pushed ${newTasks.length} intention(s) to Tomorrow (${tomorrowKey})!`, "success");
  };

  // Quick navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateKey(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateKey(d));
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3 overflow-y-auto md:overflow-hidden select-text md:select-none">
      {/* ── LEFT COLUMN (4 cols): Date Navigator & Day Insights ── */}
      <div className="col-span-12 md:col-span-4 flex flex-col p-3 shrink-0 md:min-h-0 min-h-[380px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm gap-2.5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-amber-400" />
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
              Calendar & Date Navigator
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(todayKey)}
            className={twMerge(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border",
              selectedDate === todayKey
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            )}
          >
            Today
          </button>
        </div>

        {/* Date Jump Controls */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 shrink-0">
          <button
            onClick={handlePrevDay}
            title="Previous Day"
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
          >
            <ChevronLeft size={14} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 text-center"
          />
          <button
            onClick={handleNextDay}
            title="Next Day"
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Selected Date Quick Stats Card */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
            <span className="text-[10px] font-mono text-slate-400">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {selectedDate === todayKey && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
                LIVE TODAY
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Sprints */}
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 flex flex-col items-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Sprints</span>
              <span className="text-sm font-black font-mono text-emerald-400 mt-0.5">
                {sprintsOnDate}
              </span>
              <span className="text-[8px] font-mono text-slate-500">
                {sprintsOnDate * 45}m
              </span>
            </div>

            {/* Beta Submission */}
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 flex flex-col items-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Beta 10 PM</span>
              <span
                className={twMerge(
                  "text-[10px] font-mono font-bold mt-1.5 px-1 py-0.2 rounded",
                  isBetaSubmittedOnDate
                    ? "text-emerald-300 bg-emerald-500/20 border border-emerald-500/30"
                    : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                )}
              >
                {isBetaSubmittedOnDate ? "✓ Done" : "Pending"}
              </span>
            </div>

            {/* Tasks Done */}
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 flex flex-col items-center text-center">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Tasks</span>
              <span className="text-sm font-black font-mono text-cyan-400 mt-0.5">
                {completedTasks}/{totalTasks}
              </span>
              <span className="text-[8px] font-mono text-slate-500">
                {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable List of Past 14 Days */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-1 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Recent Timeline (14 Days)
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {recentDays.map((d) => {
              const isSelected = d.key === selectedDate;
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDate(d.key)}
                  className={twMerge(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border text-left",
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-200 font-bold shadow-sm"
                      : "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={twMerge(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        d.hasDiary ? "bg-amber-400" : "bg-slate-700"
                      )}
                    />
                    <span className="font-semibold">{d.dayName}</span>
                    <span className="text-slate-500">{d.displayDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.sprints > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
                        {d.sprints} sp
                      </span>
                    )}
                    {d.hasDiary ? (
                      <span className="text-[10px] text-amber-400" title="Has diary entry">
                        📖
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-600">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Captain's Log Sync Preview (if exists for this date) */}
        {captainsLogOnDate && (
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 shrink-0 max-h-24 overflow-y-auto custom-scrollbar">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <FileText size={10} className="text-cyan-400" /> Linked Captain's Log
            </span>
            <p className="text-[10px] font-mono text-slate-400 mt-1 whitespace-pre-wrap leading-relaxed">
              {captainsLogOnDate}
            </p>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN (8 cols): Interactive Journal Editor ── */}
      <div className="col-span-12 md:col-span-8 flex flex-col p-3 shrink-0 md:min-h-0 min-h-[500px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm gap-2.5 overflow-hidden">
        {/* Top Header: Title, Mood Selector Pills, & Save Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <BookOpen size={14} />
            </div>
            <div>
              <h2 className="text-xs font-black font-mono tracking-tight text-white uppercase truncate">
                Daily Diary & Life Journal
              </h2>
              <p className="text-[9px] text-slate-400 font-mono">
                Log for {selectedDate} {lastSavedTime && `• Last saved at ${lastSavedTime}`}
              </p>
            </div>
          </div>

          {/* Mood Selector Pills */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const isSelected = mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={twMerge(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border",
                    isSelected
                      ? m.color
                      : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                  )}
                  title={m.id}
                >
                  <Icon size={11} />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Save Action Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0 flex items-center gap-1.5"
          >
            <Save size={12} />
            <span>{isSaving ? "Saving…" : "Save Entry"}</span>
          </button>
        </div>

        {/* 3 Structured Sections (Zero Scroll - Each gets proportional vertical space) */}
        <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-rows-3 gap-2.5 overflow-y-auto md:overflow-hidden">
          {/* Section 1: Today's Narrative & Life Notes */}
          <div className="flex flex-col min-h-[140px] md:min-h-0 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between pb-1 shrink-0">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400" />
                <span>1. Today's Narrative & Life Notes</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleInsertSnippet("narrative", "[MINDSET]")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-amber-300 text-[8px] font-mono border border-slate-800"
                >
                  + Mindset
                </button>
                <button
                  onClick={() => handleInsertSnippet("narrative", "[GRATITUDE]")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-amber-300 text-[8px] font-mono border border-slate-800"
                >
                  + Gratitude
                </button>
              </div>
            </div>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Freeform personal thoughts, how the day felt, energy levels, and non-engineering life updates…"
              className="flex-1 min-h-0 w-full bg-slate-900/80 border border-slate-800/80 focus:border-amber-500/50 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar leading-relaxed"
            />
          </div>

          {/* Section 2: Key Technical Wins */}
          <div className="flex flex-col min-h-[140px] md:min-h-0 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between pb-1 shrink-0">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span>2. Key Technical Wins & Deliverables</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleInsertSnippet("wins", "Fixed critical pipeline bug")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-emerald-300 text-[8px] font-mono border border-slate-800"
                >
                  + Bug Fix
                </button>
                <button
                  onClick={() => handleInsertSnippet("wins", "Shipped PR to production")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-emerald-300 text-[8px] font-mono border border-slate-800"
                >
                  + Shipped PR
                </button>
              </div>
            </div>
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="What did you build today? Commits pushed, bugs solved, systems deployed, lectures mastered…"
              className="flex-1 min-h-0 w-full bg-slate-900/80 border border-slate-800/80 focus:border-emerald-500/50 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar leading-relaxed"
            />
          </div>

          {/* Section 3: Tomorrow's Intentions & Mindset */}
          <div className="flex flex-col min-h-[160px] md:min-h-0 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between pb-1 shrink-0">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <TrendingUp size={11} className="text-cyan-400" />
                <span>3. Tomorrow's Intentions & High-Leverage Focus</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleInsertSnippet("intentions", "First 90m Deep Work block:")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-cyan-300 text-[8px] font-mono border border-slate-800"
                >
                  + Deep Work
                </button>
                <button
                  onClick={() => handleInsertSnippet("intentions", "Beta deliverable cleared early by 6 PM")}
                  className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 hover:text-cyan-300 text-[8px] font-mono border border-slate-800"
                >
                  + Early Beta
                </button>
              </div>
            </div>
            <textarea
              value={intentions}
              onChange={(e) => setIntentions(e.target.value)}
              placeholder="Intentions for tomorrow's first sprint, mental cues, and non-negotiables before evening freeze…"
              className="flex-1 min-h-0 w-full bg-slate-900/80 border border-slate-800/80 focus:border-cyan-500/50 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar leading-relaxed"
            />
            <div className="pt-1.5 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-mono text-slate-500">
                1 task per line/bullet
              </span>
              <button
                type="button"
                onClick={handlePushIntentionsToTomorrow}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px] transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-sm"
              >
                <Rocket size={11} className="text-cyan-400" />
                <span>🚀 Push Intentions to Tomorrow's Task Queue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
