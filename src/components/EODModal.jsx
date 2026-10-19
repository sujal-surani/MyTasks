import { useState, useMemo } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Trash2,
  ArrowRight,
  FolderPlus,
  BookOpen,
  Calendar,
  Sparkles,
  X,
  ChevronRight,
  Send,
  Plus,
  Clock,
  Briefcase,
  Zap,
  BookMarked,
  BatteryCharging,
  Coffee,
  Code2
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey } from "../hooks/useFirestore";

export default function EODModal({
  isOpen,
  onClose,
  data,
  updateData,
  onAddTask,
  onLogWork,
}) {
  const [activeTab, setActiveTab] = useState("step1");
  const [logText, setLogText] = useState("");
  const [isDoneAnimation, setIsDoneAnimation] = useState(false);
  const [tomorrowMode, setTomorrowMode] = useState("early_exit");

  // Inline manual work logger inside Step 1
  const [manualText, setManualText] = useState("");
  const [manualPillar, setManualPillar] = useState("internship");
  const [manualSprints, setManualSprints] = useState(1);

  const todayKey = getLocalDateKey();
  const existingTodayDiary = data.dailyDiary?.[todayKey] || {};
  const [diaryNarrative, setDiaryNarrative] = useState(existingTodayDiary.narrative || "");
  const [diaryWins, setDiaryWins] = useState(existingTodayDiary.wins || "");
  const [diaryIntentions, setDiaryIntentions] = useState(existingTodayDiary.intentions || "");
  const [diaryMood, setDiaryMood] = useState(existingTodayDiary.mood || "⚡ High Focus");

  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateKey(d);
  }, []);

  const brainDumpItems = Array.isArray(data.brainDump) ? data.brainDump : [];
  const existingTodayLog = data.captainsLog?.[todayKey]?.text || "";

  // Completed today audit
  const completedTodayTasks = useMemo(() => {
    const list = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    return list.filter((t) => {
      if (t.status !== "done" || !t.completedAt) return false;
      return getLocalDateKey(new Date(t.completedAt)) === todayKey;
    });
  }, [data.dailyTasks, todayKey]);

  // Tomorrow staged tasks
  const tomorrowTasks = useMemo(() => {
    const list = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    return list.filter(
      (t) => t.status !== "done" && t.targetDate === tomorrowKey
    );
  }, [data.dailyTasks, tomorrowKey]);

  const isBetaSubmitted = Boolean(data.internships?.beta?.isSubmittedToday);
  const alphaStageCount = ["isDocsDone", "isBuildDone", "isGitPushed", "isProofSubmitted"].filter(
    (k) => data.internships?.alpha?.[k]
  ).length;

  if (!isOpen) return null;

  const handleInlineManualLog = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    if (onLogWork) {
      onLogWork({
        text: manualText.trim(),
        category: manualPillar,
        sprintCount: Number(manualSprints) || 1,
        timeSlot: "Evening Closeout",
      });
    }
    setManualText("");
  };

  const handleDeleteBrainDumpItem = (index) => {
    const updated = brainDumpItems.filter((_, i) => i !== index);
    updateData({ brainDump: updated });
  };

  const handleConvertDumpToTask = (note, index) => {
    onAddTask({
      id: `task_${Date.now()}_dump`,
      text: note,
      category: "general",
      status: "today",
      targetDate: tomorrowKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    });
    handleDeleteBrainDumpItem(index);
  };

  const handleStageTomorrowPillar = (pillarCategory, title) => {
    onAddTask({
      id: `task_${Date.now()}_${pillarCategory}`,
      text: title,
      category: pillarCategory,
      status: "today",
      targetDate: tomorrowKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    });
  };

  const handleLockInAndCloseDay = () => {
    const finalLog = logText.trim() || existingTodayLog || (diaryNarrative ? `${diaryNarrative}\n\nKey Wins:\n${diaryWins}` : "Day closed in focused operations.");
    updateData({
      [`captainsLog.${todayKey}`]: {
        text: finalLog,
        timestamp: new Date().toISOString(),
      },
      [`dailyDiary.${todayKey}`]: {
        narrative: diaryNarrative.trim(),
        wins: diaryWins.trim(),
        intentions: diaryIntentions.trim(),
        mood: diaryMood,
        updatedAt: new Date().toISOString(),
      },
      "eodStatus.lastCompletedDate": todayKey,
      currentMode: tomorrowMode,
    });
    setIsDoneAnimation(true);
    setTimeout(() => {
      setIsDoneAnimation(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-3xl bg-slate-900/95 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        style={{
          boxShadow: "0 0 50px rgba(245,158,11,0.2), 0 25px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-mono tracking-tight text-white flex items-center gap-2">
                COMPLETE EOD PROTOCOL & PLAN TOMORROW
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Daily Operations Closeout Ritual · {todayKey}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 5 Interactive Tabs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 py-3 border-b border-slate-800">
          {[
            { id: "step1", label: "1. Today's Audit" },
            { id: "step2", label: "2. Internships" },
            { id: "step3", label: "3. Daily Diary" },
            { id: "step4", label: "4. Dump & Log" },
            { id: "step5", label: "5. Plan Tomorrow" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={twMerge(
                "py-2 px-1 rounded-xl text-[10px] sm:text-[11px] font-mono font-bold transition-all text-center truncate",
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 custom-scrollbar">
          {isDoneAnimation ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black font-mono text-emerald-300 mt-2">
                DAY SEALED & LOCKED IN!
              </h3>
              <p className="text-xs text-slate-400 font-mono max-w-sm">
                Captain's log saved, internships verified, tomorrow staged. Rest now for tomorrow's sprints.
              </p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: Today's Audit & Manual Work Backfill ── */}
              {activeTab === "step1" && (
                <div className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 1 · Verification & Backfill
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                      Review Work Completed Today ({completedTodayTasks.length} items logged)
                    </h3>
                  </div>

                  {/* List of today's done tasks */}
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {completedTodayTasks.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono py-3 text-center">
                        No tasks recorded as completed yet today. Log off-timer work below!
                      </p>
                    ) : (
                      completedTodayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono"
                        >
                          <span className="text-slate-300 flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                            {t.text}
                          </span>
                          <span className="text-[10px] text-cyan-400">
                            {t.estimatedSprints || 1} sp
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Inline manual work logger */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Clock size={12} /> Inline Backfill: Log unrecorded work before closing
                    </span>
                    <form onSubmit={handleInlineManualLog} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="What unrecorded work did you do?…"
                        className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs rounded-xl px-3 py-2 font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                      <select
                        value={manualPillar}
                        onChange={(e) => setManualPillar(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono"
                      >
                        <option value="internship">Internship</option>
                        <option value="btech">B.Tech</option>
                        <option value="devops">DevOps</option>
                        <option value="startup">Startup</option>
                        <option value="general">General</option>
                      </select>
                      <select
                        value={manualSprints}
                        onChange={(e) => setManualSprints(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-amber-300 rounded-xl px-2.5 py-2 text-xs font-mono"
                      >
                        <option value={1}>1 Sp (45m)</option>
                        <option value={2}>2 Sp (1.5h)</option>
                        <option value={3}>3 Sp (2.25h)</option>
                      </select>
                      <button
                        type="submit"
                        disabled={!manualText.trim()}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shrink-0 disabled:opacity-40"
                      >
                        + Log
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── TAB 2: Internships Status Check ── */}
              {activeTab === "step2" && (
                <div className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 2 · Dual Internship Verification
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                      Check Alpha & Beta Deliverables
                    </h3>
                  </div>

                  {/* Beta Track verification */}
                  <div
                    className={twMerge(
                      "p-4 rounded-2xl border flex items-center justify-between gap-3",
                      isBetaSubmitted
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/30 border-red-500/50 text-red-300 animate-pulse"
                    )}
                  >
                    <div>
                      <p className="text-xs font-mono font-bold">
                        {isBetaSubmitted
                          ? "✓ Beta Daily 10 PM: Submitted Today"
                          : "⚠️ Beta Daily 10 PM: NOT Submitted Today"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {data.internships?.beta?.taskName || "Daily assignment gate"}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateData({
                          "internships.beta.isSubmittedToday": !isBetaSubmitted,
                          "internships.beta.lastResetDate": todayKey,
                        })
                      }
                      className={twMerge(
                        "px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0",
                        isBetaSubmitted
                          ? "bg-slate-800 text-slate-300 border border-slate-700"
                          : "bg-emerald-400 text-slate-950 shadow-md"
                      )}
                    >
                      {isBetaSubmitted ? "Mark Unsubmitted" : "Mark Submitted ✓"}
                    </button>
                  </div>

                  {/* Alpha Track summary */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-200">
                        Alpha Track (7–10d cycle): {alphaStageCount} of 4 steps completed
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {data.internships?.alpha?.taskName || "Deliverable"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {["Docs", "Build", "Git", "Proof"].map((s, i) => {
                        const keys = ["isDocsDone", "isBuildDone", "isGitPushed", "isProofSubmitted"];
                        const isDone = Boolean(data.internships?.alpha?.[keys[i]]);
                        return (
                          <span
                            key={s}
                            className={twMerge(
                              "text-[9px] font-mono px-2 py-0.5 rounded-lg border",
                              isDone
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-slate-900 text-slate-600 border-slate-800"
                            )}
                          >
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: Daily Diary Reflection ── */}
              {activeTab === "step3" && (
                <div className="flex flex-col gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        Step 3 · Daily Diary Reflection
                      </span>
                      <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                        Capture Today's Narrative, Wins & Intentions
                      </h3>
                    </div>

                    {/* Mood selection pills */}
                    <div className="flex items-center gap-1 shrink-0">
                      {[
                        { id: "⚡ High Focus", label: "Focus", icon: Zap, color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
                        { id: "🔋 Moderate", label: "Moderate", icon: BatteryCharging, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
                        { id: "☕ Exhausted", label: "Exhausted", icon: Coffee, color: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
                        { id: "💻 Deep Flow", label: "Flow", icon: Code2, color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = diaryMood === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setDiaryMood(m.id)}
                            className={twMerge(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all border",
                              isSelected ? m.color : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            <Icon size={10} />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1. Today's Narrative & Life Notes */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <BookOpen size={11} className="text-amber-400" /> 1. Today's Narrative & Life Notes
                    </label>
                    <textarea
                      rows={3}
                      value={diaryNarrative}
                      onChange={(e) => setDiaryNarrative(e.target.value)}
                      placeholder="Personal reflection, energy, non-work notes, mindset highlights…"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-slate-200 placeholder-slate-700 rounded-xl p-2.5 font-mono leading-relaxed focus:outline-none custom-scrollbar"
                    />
                  </div>

                  {/* 2. Key Technical Wins */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-400" /> 2. Key Technical Wins
                    </label>
                    <textarea
                      rows={2}
                      value={diaryWins}
                      onChange={(e) => setDiaryWins(e.target.value)}
                      placeholder="• Shipped PR #42\n• Fixed cache invalidation bug"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 placeholder-slate-700 rounded-xl p-2.5 font-mono leading-relaxed focus:outline-none custom-scrollbar"
                    />
                  </div>

                  {/* 3. Tomorrow's Intentions */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-cyan-400" /> 3. Tomorrow's Intentions
                    </label>
                    <textarea
                      rows={2}
                      value={diaryIntentions}
                      onChange={(e) => setDiaryIntentions(e.target.value)}
                      placeholder="🎯 Deep work priority 1: OS scheduling algorithms..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder-slate-700 rounded-xl p-2.5 font-mono leading-relaxed focus:outline-none custom-scrollbar"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 4: Clear Quick Capture & Captain's Log ── */}
              {activeTab === "step4" && (
                <div className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 4 · Inbox Zero & Reflections
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                      Clear Brain Dump ({brainDumpItems.length} held) & Write Captain's Log
                    </h3>
                  </div>

                  {/* Brain dump items */}
                  {brainDumpItems.length > 0 && (
                    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30">
                      <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                        Held Quick Captures: Resolve to Inbox Zero
                      </span>
                      {brainDumpItems.map((note, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono"
                        >
                          <span className="text-slate-300 truncate">{note}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleConvertDumpToTask(note, idx)}
                              className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px]"
                            >
                              → Tomorrow
                            </button>
                            <button
                              onClick={() => handleDeleteBrainDumpItem(idx)}
                              className="p-1 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Captain's Log textarea */}
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block flex items-center gap-1.5">
                      <BookOpen size={12} className="text-amber-400" /> Captain's Reflection (Wins, What I Built, Blockers)
                    </label>
                    <textarea
                      rows={6}
                      value={logText || existingTodayLog}
                      onChange={(e) => setLogText(e.target.value)}
                      placeholder="// WINS:\n- Deployed production service\n// BLOCKERS:\n- Terraform state sync\n// TOMORROW:\n- Review B.Tech notes"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-slate-200 placeholder-slate-700 rounded-xl p-3 font-mono leading-relaxed focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 5: Tomorrow's Triage Builder ── */}
              {activeTab === "step5" && (
                <div className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 5 · Tomorrow's Triage & Protocol
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                      Stage Tasks & Operating Mode for {tomorrowKey}
                    </h3>
                  </div>

                  {/* Operating Mode Selector for Tomorrow */}
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Tomorrow's Target Protocol
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTomorrowMode("early_exit")}
                        className={twMerge(
                          "p-3 rounded-2xl border text-left font-mono transition-all",
                          tomorrowMode === "early_exit"
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : "bg-slate-950/60 border-slate-800 text-slate-400"
                        )}
                      >
                        <p className="text-xs font-bold">2:15 PM Early Exit</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Afternoon deep build block</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTomorrowMode("full_stretch")}
                        className={twMerge(
                          "p-3 rounded-2xl border text-left font-mono transition-all",
                          tomorrowMode === "full_stretch"
                            ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "bg-slate-950/60 border-slate-800 text-slate-400"
                        )}
                      >
                        <p className="text-xs font-bold">5:00 PM Full Stretch</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Campus lab quota + night sprint</p>
                      </button>
                    </div>
                  </div>

                  {/* Quick pillar staging buttons */}
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Stage Pillar Task for Tomorrow
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { cat: "internship", label: "+ Internship" },
                        { cat: "btech", label: "+ B.Tech" },
                        { cat: "devops", label: "+ DevOps" },
                        { cat: "startup", label: "+ Startup" },
                      ].map((p) => (
                        <button
                          key={p.cat}
                          type="button"
                          onClick={() => handleStageTomorrowPillar(p.cat, `${p.label.replace("+ ", "")} Sprint Block`)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-all text-center"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tasks staged for tomorrow */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Currently Staged for Tomorrow ({tomorrowTasks.length} tasks)
                    </span>
                    {tomorrowTasks.length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono py-2">
                        No tasks staged yet for tomorrow. Click a button above!
                      </p>
                    ) : (
                      tomorrowTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between"
                        >
                          <span>{t.text}</span>
                          <span className="text-[10px] text-amber-400">{t.estimatedSprints || 1} sp</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleLockInAndCloseDay}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2"
          >
            <Sparkles size={14} />
            Lock In & Close Day ✓
          </button>
        </div>
      </div>
    </div>
  );
}
