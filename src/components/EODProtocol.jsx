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
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey, normalizeTask } from "../hooks/useFirestore";

export default function EODProtocol({
  isOpen,
  onClose,
  data,
  updateData,
  onAddTask,
}) {
  const [step, setStep] = useState(1);
  const [logText, setLogText] = useState("");
  const [isDoneAnimation, setIsDoneAnimation] = useState(false);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [activeBrainDumpNoteIndex, setActiveBrainDumpNoteIndex] = useState(null);

  const todayKey = getLocalDateKey();

  // Step 1: Internship Beta Verification
  const isBetaSubmitted = Boolean(data.internships?.beta?.isSubmittedToday);

  // Step 2: Brain Dump holding pen
  const brainDumpItems = Array.isArray(data.brainDump) ? data.brainDump : [];

  // Step 3: Existing Captain's Log for today if already written
  const existingTodayLog = data.captainsLog?.[todayKey]?.text || "";

  // Step 4: Tomorrow's staged tasks
  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateKey(d);
  }, []);

  const tomorrowTasks = useMemo(() => {
    const list = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    return list.filter(
      (t) => t.status !== "done" && t.targetDate === tomorrowKey
    );
  }, [data.dailyTasks, tomorrowKey]);

  if (!isOpen) return null;

  // Handlers for Step 2: Brain Dump processing
  const handleDeleteBrainDumpItem = (index) => {
    const updated = brainDumpItems.filter((_, i) => i !== index);
    updateData({ brainDump: updated });
  };

  const handleConvertToTask = (itemText, index) => {
    const newTask = {
      id: `task_${Date.now()}_dump`,
      text: itemText,
      category: "general",
      status: "today",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    if (onAddTask) {
      onAddTask(newTask);
    } else {
      updateData({ dailyTasks: [...(data.dailyTasks || []), newTask] });
    }
    handleDeleteBrainDumpItem(index);
  };

  const handleAddToProjectNotes = (itemText, index) => {
    const projects = Array.isArray(data.activeProjects) ? [...data.activeProjects] : [];
    if (projects.length === 0) {
      handleConvertToTask(itemText, index);
      return;
    }
    const targetProj = projects[selectedProjectIndex] || projects[0];
    const updatedProj = {
      ...targetProj,
      milestones: [
        ...(targetProj.milestones || []),
        { id: `ms_${Date.now()}`, text: itemText, isDone: false },
      ],
    };
    projects[selectedProjectIndex] = updatedProj;
    updateData({ activeProjects: projects });
    handleDeleteBrainDumpItem(index);
    setActiveBrainDumpNoteIndex(null);
  };

  // Final submit handler
  const handleCompleteEOD = () => {
    const finalLog = logText.trim() || existingTodayLog || "Day closed in focused operations.";
    updateData({
      [`captainsLog.${todayKey}`]: {
        text: finalLog,
        timestamp: new Date().toISOString(),
      },
      "eodStatus.lastCompletedDate": todayKey,
    });
    setIsDoneAnimation(true);
    setTimeout(() => {
      setIsDoneAnimation(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Dimmed backdrop with intense glass blur */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Modal Shell */}
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          boxShadow: "0 0 50px rgba(245,158,11,0.18), 0 25px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-mono tracking-tight text-white flex items-center gap-2">
                NIGHTLY EOD PROTOCOL
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Step {step} of 4
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Retention Engine · Inbox-Zero Ritual · {todayKey}
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

        {/* Progress Stepper Tabs */}
        <div className="grid grid-cols-4 gap-1.5 py-3 border-b border-slate-800/80">
          {[
            { num: 1, label: "Beta Verify" },
            { num: 2, label: "Inbox Zero" },
            { num: 3, label: "Captain's Log" },
            { num: 4, label: "Tomorrow" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                // If attempting to go past step 2 while brainDump is not empty, block
                if (s.num > 2 && brainDumpItems.length > 0) return;
                setStep(s.num);
              }}
              className={twMerge(
                "py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold transition-all text-center truncate",
                step === s.num
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : step > s.num
                  ? "bg-slate-800/70 text-slate-300"
                  : "bg-slate-900/50 text-slate-600"
              )}
            >
              {s.num}. {s.label}
            </button>
          ))}
        </div>

        {/* Step Content Area */}
        <div className="flex-1 overflow-y-auto py-5 pr-1 custom-scrollbar">
          {isDoneAnimation ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black font-mono text-emerald-300 mt-2">
                DAY CLOSED SUCCESSFULLY
              </h3>
              <p className="text-xs text-slate-400 font-mono max-w-sm">
                Captain's log saved. Brain dump cleared to Inbox Zero. Rest now for tomorrow's sprints.
              </p>
            </div>
          ) : (
            <>
              {/* ── STEP 1: Internship Beta Verification ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 1 · Daily 10 PM Milestone Verification
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-1">
                      Check Internship Beta Submission Status
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Beta Track assignments require daily submission verification before closing out engineering operations.
                    </p>
                  </div>

                  <div
                    className={twMerge(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                      isBetaSubmitted
                        ? "bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                        : "bg-red-950/30 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isBetaSubmitted ? (
                        <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={24} className="text-red-400 shrink-0" />
                      )}
                      <div>
                        <p className={twMerge(
                          "text-sm font-mono font-bold",
                          isBetaSubmitted ? "text-emerald-300" : "text-red-300"
                        )}>
                          {isBetaSubmitted
                            ? "Internship Beta Verified: SUBMITTED"
                            : "Internship Beta: NOT SUBMITTED TODAY"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {data.internships?.beta?.taskName
                            ? `Task: "${data.internships.beta.taskName}"`
                            : "Daily 10:00 PM submission gate"}
                        </p>
                      </div>
                    </div>

                    {!isBetaSubmitted && (
                      <button
                        onClick={() => {
                          updateData({
                            "internships.beta.isSubmittedToday": true,
                            "internships.beta.lastResetDate": todayKey,
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(52,211,153,0.3)] shrink-0"
                      >
                        Mark Done Now
                      </button>
                    )}
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      Proceed to Brain Dump <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Process the Brain Dump (Inbox Zero) ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        Step 2 · Process Brain Dump to Inbox Zero
                      </span>
                      <span
                        className={twMerge(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                          brainDumpItems.length === 0
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        )}
                      >
                        {brainDumpItems.length === 0
                          ? "Inbox Zero Achieved ✓"
                          : `${brainDumpItems.length} Notes Remaining`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono mt-1">
                      Clear Mid-Sprint Captures
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Every captured thought must be resolved before closing the day. Delete it, convert it to a task, or attach it to a project.
                    </p>
                  </div>

                  {brainDumpItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-center gap-2">
                      <CheckCircle2 size={32} className="text-emerald-400" />
                      <p className="text-sm font-bold font-mono text-emerald-300">
                        Inbox Zero Reached!
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        No unprocessed distractions left in your queue.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {brainDumpItems.map((note, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <Brain size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs font-mono text-slate-200 leading-relaxed flex-1">
                              {note}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-700/50 text-[10px] font-mono">
                            <button
                              onClick={() => handleConvertToTask(note, idx)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1"
                            >
                              <ArrowRight size={10} /> Task Backlog
                            </button>

                            {/* Project selector dropdown toggle */}
                            <div className="flex items-center gap-1">
                              <select
                                value={selectedProjectIndex}
                                onChange={(e) => setSelectedProjectIndex(Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none"
                              >
                                {(data.activeProjects || []).length === 0 ? (
                                  <option value={0}>General Project</option>
                                ) : (
                                  (data.activeProjects || []).map((p, pIdx) => (
                                    <option key={p.id || pIdx} value={pIdx}>
                                      {p.title || `Project ${pIdx + 1}`}
                                    </option>
                                  ))
                                )}
                              </select>
                              <button
                                onClick={() => handleAddToProjectNotes(note, idx)}
                                className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 transition-colors flex items-center gap-1"
                              >
                                <FolderPlus size={10} /> Add to Project
                              </button>
                            </div>

                            <button
                              onClick={() => handleDeleteBrainDumpItem(idx)}
                              className="ml-auto px-2 py-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Discard
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setStep(1)}
                      className="px-3 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      disabled={brainDumpItems.length > 0}
                      onClick={() => setStep(3)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-mono font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      Write Captain's Log <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: The Captain's Log (Reflections) ── */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 3 · Technical Reflection
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-1">
                      The Captain's Log · {todayKey}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Document wins, architectural blockers, code commits, and lessons learned today. Saved permanently in Firestore.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <BookOpen size={11} className="text-amber-400" /> Reflection Notes
                    </label>
                    <textarea
                      rows={7}
                      value={logText || existingTodayLog}
                      onChange={(e) => setLogText(e.target.value)}
                      placeholder={`// WINS:\n- Finished Kubernetes Pod autoscaler module\n- Shipped Beta internship deliverable before 10 PM\n\n// BLOCKERS:\n- Terraform state lock on AWS S3 backend\n\n// TOMORROW FOCUS:\n- B.Tech Lab viva prep & review`}
                      className="w-full bg-slate-950/70 border border-slate-700/70 focus:border-amber-500/60 text-slate-200 placeholder-slate-700 text-xs rounded-xl p-3.5 focus:outline-none font-mono leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setStep(2)}
                      className="px-3 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      Preview Tomorrow <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Tomorrow's Triage Preview ── */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Step 4 · Tomorrow's Triage Preview
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono mt-1">
                      Tasks Staged for {tomorrowKey}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Review what is scheduled for tomorrow. Sprints will auto-migrate to Today's queue at midnight.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {tomorrowTasks.length === 0 ? (
                      <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-950/40 text-center">
                        <p className="text-xs text-slate-500 font-mono">
                          No tasks specifically staged for tomorrow. Your queue will start fresh.
                        </p>
                      </div>
                    ) : (
                      tomorrowTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span className="text-xs font-mono text-slate-200">
                              {t.text}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {t.estimatedSprints || 1} sprint ({((t.estimatedSprints || 1) * 45)}m)
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-amber-300">
                        Ready to Seal Day {todayKey}?
                      </p>
                      <p className="text-[10px] font-mono text-amber-400/80">
                        Saves Captain's Log, marks EOD complete, and enforces code freeze.
                      </p>
                    </div>

                    <button
                      onClick={handleCompleteEOD}
                      className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                    >
                      Complete Protocol ✓
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setStep(3)}
                      className="px-3 py-2 rounded-xl text-slate-400 hover:text-white font-mono text-xs transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
