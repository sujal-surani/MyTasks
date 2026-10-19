import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useToast } from "../context/ToastContext";
import { getLocalDateKey } from "../hooks/useFirestore";
import {
  Briefcase, Clock, Play, CheckCircle2, Circle, ExternalLink,
  Book, Hammer, GitBranch, FileCheck, Plus, Trash2, Search, Check, Calendar
} from "lucide-react";
import { twMerge } from "tailwind-merge";

export default function InternshipsPage() {
  const {
    data,
    updateData,
    isBetaSubmittedToday,
    submitBetaSubmission,
    undoBetaSubmission,
  } = useFirestoreContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const todayKey = getLocalDateKey();
  const alpha = data.internships?.alpha || {};
  const beta = data.internships?.beta || {};

  const alphaHistory = Array.isArray(data.internships?.alphaHistory)
    ? data.internships.alphaHistory
    : Array.isArray(data.internships?.alphaArchive)
    ? data.internships.alphaArchive
    : [];

  const betaHistory = Array.isArray(data.internships?.betaHistory)
    ? data.internships.betaHistory
    : [];

  // Alpha editing state
  const [alphaTask, setAlphaTask] = useState(alpha.taskName || "Week 1 Deliverable");
  const [alphaDeadline, setAlphaDeadline] = useState(
    alpha.deadlineDate ? new Date(alpha.deadlineDate).toISOString().split("T")[0] : ""
  );
  const [alphaRepo, setAlphaRepo] = useState(alpha.repoUrl || "");
  const [alphaProof, setAlphaProof] = useState(alpha.proofNotes || "");
  const [newSubStep, setNewSubStep] = useState("");

  // Beta editing state
  const [betaTask, setBetaTask] = useState(beta.taskName || "");
  const [betaProof, setBetaProof] = useState(beta.proofLink || "");

  // Vault search
  const [vaultSearch, setVaultSearch] = useState("");

  // Live countdown to 10:00 PM
  const [betaCountdown, setBetaCountdown] = useState({ hrs: "00", mins: "00", secs: "00", isPast: false });
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const target10PM = new Date(now);
      target10PM.setHours(22, 0, 0, 0);
      const diffSec = Math.floor((target10PM.getTime() - now.getTime()) / 1000);
      if (diffSec <= 0) {
        setBetaCountdown({ hrs: "00", mins: "00", secs: "00", isPast: true });
      } else {
        const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
        const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
        const secs = String(diffSec % 60).padStart(2, "0");
        setBetaCountdown({ hrs, mins, secs, isPast: false });
      }
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, []);

  // Alpha days remaining
  const alphaDaysRemaining = alpha.deadlineDate
    ? Math.max(0, Math.ceil((new Date(alpha.deadlineDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 7;

  // Alpha stage definitions
  const ALPHA_STAGES = [
    { key: "isDocsDone", short: "1. Theory/Docs", icon: Book },
    { key: "isBuildDone", short: "2. Hands-on Build", icon: Hammer },
    { key: "isGitPushed", short: "3. GitHub Pushed", icon: GitBranch },
    { key: "isProofSubmitted", short: "4. Proof Submitted", icon: FileCheck },
  ];

  const alphaCompletedStages = ALPHA_STAGES.filter((s) => alpha[s.key]).length;
  const isAlpha100Percent = alphaCompletedStages === 4;
  const alphaSubChecklist = Array.isArray(alpha.subChecklist) ? alpha.subChecklist : [];
  const isBetaSubmitted = Boolean(isBetaSubmittedToday);

  const defaultBetaChecklist = [
    { id: "beta_chk_1", text: "1. Review Ticket / Spec", isDone: false },
    { id: "beta_chk_2", text: "2. Implement Feature & Test", isDone: false },
    { id: "beta_chk_3", text: "3. Git Push & Branch PR", isDone: false },
    { id: "beta_chk_4", text: "4. Submit Proof Link / Loom", isDone: false },
  ];
  const betaMicroChecklist = Array.isArray(beta.microChecklist) && beta.microChecklist.length === 4
    ? beta.microChecklist
    : defaultBetaChecklist;

  const handleToggleBetaChecklist = (id) => {
    const updated = betaMicroChecklist.map((item) =>
      item.id === id ? { ...item, isDone: !item.isDone } : item
    );
    updateData({ "internships.beta.microChecklist": updated });
  };

  // Sprint launchers
  const handleStartAlphaSprint = () => {
    const taskTitle = `Alpha Internship: ${alpha.taskName || "Deliverable Build"}`;
    const newTask = {
      id: `task_${Date.now()}_internship`,
      text: taskTitle,
      category: "internship",
      status: "active",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    const normalized = currentTasks.map((t) => (t.status === "active" ? { ...t, status: "today" } : t));
    updateData({
      dailyTasks: [newTask, ...normalized],
      "timerState.isRunning": true,
      "timerState.isPausedForErrand": false,
    });
    showToast("⚡ Alpha 45m Sprint launched!", "success");
    navigate("/");
  };

  const handleStartBetaSprint = () => {
    const taskTitle = `Beta Internship (10 PM): ${beta.taskName || "Daily Proof Submission"}`;
    const newTask = {
      id: `task_${Date.now()}_internship`,
      text: taskTitle,
      category: "internship",
      status: "active",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    const normalized = currentTasks.map((t) => (t.status === "active" ? { ...t, status: "today" } : t));
    updateData({
      dailyTasks: [newTask, ...normalized],
      "timerState.isRunning": true,
      "timerState.isPausedForErrand": false,
    });
    showToast("⚡ Beta 45m Sprint launched!", "success");
    navigate("/");
  };

  // Sub-checklist CRUD
  const handleAddSubStep = (e) => {
    e.preventDefault();
    if (!newSubStep.trim()) return;
    const newStep = { id: `step_${Date.now()}`, text: newSubStep.trim(), isDone: false };
    updateData({ "internships.alpha.subChecklist": [...alphaSubChecklist, newStep] });
    setNewSubStep("");
    showToast("✓ Sub-step added", "success");
  };

  const handleToggleSubStep = (id) => {
    const updated = alphaSubChecklist.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s));
    updateData({ "internships.alpha.subChecklist": updated });
  };

  const handleDeleteSubStep = (id) => {
    const updated = alphaSubChecklist.filter((s) => s.id !== id);
    updateData({ "internships.alpha.subChecklist": updated });
  };

  // Archive Alpha Deliverable
  const handleArchiveAlpha = () => {
    const archivedEntry = {
      id: `alpha_arch_${Date.now()}`,
      taskName: alpha.taskName || alphaTask || "Completed Deliverable",
      deadline: alpha.deadlineDate || alphaDeadline,
      repoUrl: alpha.repoUrl || alphaRepo,
      proofNotes: alpha.proofNotes || alphaProof,
      completedDate: new Date().toISOString(),
      subChecklist: alphaSubChecklist,
    };

    updateData({
      "internships.alphaHistory": [archivedEntry, ...alphaHistory],
      "internships.alphaArchive": [archivedEntry, ...alphaHistory],
      "internships.alpha.taskName": "Next 7–10 Day Milestone",
      "internships.alpha.isDocsDone": false,
      "internships.alpha.isBuildDone": false,
      "internships.alpha.isGitPushed": false,
      "internships.alpha.isProofSubmitted": false,
      "internships.alpha.repoUrl": "",
      "internships.alpha.proofNotes": "",
      "internships.alpha.subChecklist": [],
    });

    setAlphaTask("Next 7–10 Day Milestone");
    setAlphaRepo("");
    setAlphaProof("");
    showToast("🎉 Alpha Cycle Archived & Fresh Cycle Started!", "success");
  };

  // Save details
  const handleSaveAlphaDetails = () => {
    updateData({
      "internships.alpha.taskName": alphaTask.trim(),
      ...(alphaDeadline ? { "internships.alpha.deadlineDate": new Date(alphaDeadline).toISOString() } : {}),
      "internships.alpha.repoUrl": alphaRepo.trim(),
      "internships.alpha.proofNotes": alphaProof.trim(),
    });
    showToast("✓ Alpha details saved", "success");
  };

  const handleSaveBetaDetails = () => {
    updateData({
      "internships.beta.taskName": betaTask.trim(),
      "internships.beta.proofLink": betaProof.trim(),
    });
    showToast("✓ Beta details saved", "success");
  };

  // Toggle Beta Submission
  const handleToggleBetaSubmission = () => {
    const willBeSubmitted = !isBetaSubmitted;
    const nowIso = new Date().toISOString();

    const updates = {
      "internships.beta.isSubmittedToday": willBeSubmitted,
      "internships.beta.lastResetDate": todayKey,
    };

    if (willBeSubmitted) {
      const newLog = {
        id: `beta_${Date.now()}`,
        date: todayKey,
        taskTitle: betaTask.trim() || "Daily Beta Submission",
        proofLink: betaProof.trim(),
        submittedAtTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      updates["internships.betaHistory"] = [newLog, ...betaHistory.filter((b) => b.date !== todayKey)];

      // Auto-credit 1 Sprint
      const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
      const hasBetaTaskToday = currentTasks.some(
        (t) => t.targetDate === todayKey && t.category === "internship" && t.text.toLowerCase().includes("beta")
      );

      if (!hasBetaTaskToday) {
        const autoTask = {
          id: `task_${Date.now()}_beta_auto`,
          text: `[Beta 10 PM] ${betaTask.trim() || "Daily Submission Complete"}`,
          category: "internship",
          status: "done",
          targetDate: todayKey,
          estimatedSprints: 1,
          createdAt: nowIso,
          completedAt: nowIso,
          targetMinutes: 45,
        };
        updates.dailyTasks = [autoTask, ...currentTasks];
        updates[`sprintHistory.${todayKey}`] = (data.sprintHistory?.[todayKey] || 0) + 1;
      }
      showToast("✓ Beta Submitted + 1 Sprint Credited!", "success");
    } else {
      showToast("Beta marked incomplete", "info");
    }
    updateData(updates);
  };

  // 7-day Monday to Sunday consistency pills
  const weekDays = useMemo(() => {
    const d = new Date();
    const dayOfWeek = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);

    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    return labels.map((label, idx) => {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + idx);
      const key = getLocalDateKey(cur);
      const isLogged = betaHistory.some((b) => b.date === key);
      const isToday = key === todayKey;
      return { label, key, isLogged, isToday };
    });
  }, [betaHistory, todayKey]);

  // Combined searchable vault
  const filteredVault = useMemo(() => {
    const alphaItems = alphaHistory.map((item) => ({
      id: item.id,
      type: "Alpha",
      title: item.taskName || item.title || "Alpha Deliverable",
      date: item.completedDate?.slice(0, 10) || item.completedAt?.slice(0, 10) || "Archived",
      link: item.repoUrl || item.proofNotes || null,
      raw: item,
    }));

    const betaItems = betaHistory.map((item) => ({
      id: item.id,
      type: "Beta",
      title: item.taskTitle || "Daily 10 PM Submission",
      date: item.date || item.submittedAtTime || "Submitted",
      link: item.proofLink || null,
      raw: item,
    }));

    const combined = [...betaItems, ...alphaItems];
    if (!vaultSearch.trim()) return combined;
    const q = vaultSearch.toLowerCase();
    return combined.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.date.includes(q)
    );
  }, [alphaHistory, betaHistory, vaultSearch]);

  const handleDeleteVaultItem = (item) => {
    if (item.type === "Alpha") {
      updateData({
        "internships.alphaHistory": alphaHistory.filter((a) => a.id !== item.id),
      });
    } else {
      updateData({
        "internships.betaHistory": betaHistory.filter((b) => b.id !== item.id),
      });
    }
    showToast("Item deleted from vault", "info");
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3 overflow-y-auto md:overflow-hidden select-text md:select-none">
      {/* ── COLUMN 1 (5 cols): Alpha Track (7–10 Day Pipeline) ───────────────── */}
      <div className="col-span-12 md:col-span-5 flex flex-col justify-between p-3 shrink-0 md:min-h-0 min-h-[380px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Briefcase size={13} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono text-white">Alpha Track</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  {alphaDaysRemaining}d left
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">7–10 Day Production Pipeline</span>
            </div>
          </div>

          <button
            onClick={handleStartAlphaSprint}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold transition-all"
          >
            <Play size={10} fill="currentColor" />
            <span>Run 45m Sprint</span>
          </button>
        </div>

        {/* Inputs (Compact 2x2 grid) */}
        <div className="grid grid-cols-2 gap-1.5 py-2 shrink-0">
          <input
            value={alphaTask}
            onChange={(e) => setAlphaTask(e.target.value)}
            onBlur={handleSaveAlphaDetails}
            placeholder="Deliverable Name…"
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
          <input
            type="date"
            value={alphaDeadline}
            onChange={(e) => setAlphaDeadline(e.target.value)}
            onBlur={handleSaveAlphaDetails}
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none"
          />
          <input
            value={alphaRepo}
            onChange={(e) => setAlphaRepo(e.target.value)}
            onBlur={handleSaveAlphaDetails}
            placeholder="GitHub Repo URL…"
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded px-2 py-1 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
          <input
            value={alphaProof}
            onChange={(e) => setAlphaProof(e.target.value)}
            onBlur={handleSaveAlphaDetails}
            placeholder="Proof / PR link…"
            className="bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded px-2 py-1 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* 2x2 Stage Buttons */}
        <div className="grid grid-cols-2 gap-1.5 py-1 shrink-0">
          {ALPHA_STAGES.map((stg) => {
            const isDone = Boolean(alpha[stg.key]);
            const Icon = stg.icon;
            return (
              <button
                key={stg.key}
                onClick={() => updateData({ [`internships.alpha.${stg.key}`]: !isDone })}
                className={twMerge(
                  "flex items-center justify-between p-2 rounded-lg border text-[10px] font-mono font-bold transition-all",
                  isDone
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon size={12} className={isDone ? "text-emerald-400" : "text-slate-600"} />
                  <span className="truncate">{stg.short}</span>
                </div>
                {isDone ? <Check size={12} className="text-emerald-400" /> : <Circle size={10} />}
              </button>
            );
          })}
        </div>

        {/* 100% Archive Button if all 4 done */}
        {isAlpha100Percent && (
          <button
            onClick={handleArchiveAlpha}
            className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse shrink-0 my-1 flex items-center justify-center gap-1.5"
          >
            <span>🎉 Archive & Start Next Cycle</span>
          </button>
        )}

        {/* Sub-steps Checklist (Internally Scrollable) */}
        <div className="flex-1 min-h-0 flex flex-col pt-1.5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Assignment Sub-Steps ({alphaSubChecklist.filter((s) => s.isDone).length}/{alphaSubChecklist.length})
            </span>
          </div>

          <form onSubmit={handleAddSubStep} className="flex gap-1 mb-1.5 shrink-0">
            <input
              type="text"
              value={newSubStep}
              onChange={(e) => setNewSubStep(e.target.value)}
              placeholder="Add breakdown step…"
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded px-2 py-0.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newSubStep.trim()}
              className="p-1 rounded bg-emerald-500 text-slate-950 disabled:opacity-30"
            >
              <Plus size={11} />
            </button>
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {alphaSubChecklist.length === 0 ? (
              <div className="text-center py-4 text-[10px] font-mono text-slate-500">
                No sub-steps added.
              </div>
            ) : (
              alphaSubChecklist.map((step) => (
                <div
                  key={step.id}
                  className={twMerge(
                    "flex items-center justify-between p-1.5 rounded border text-[11px] font-mono",
                    step.isDone ? "bg-slate-950/30 border-slate-900 opacity-60" : "bg-slate-950/70 border-slate-800"
                  )}
                >
                  <button
                    onClick={() => handleToggleSubStep(step.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                  >
                    {step.isDone ? (
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Circle size={12} className="text-slate-600 shrink-0" />
                    )}
                    <span className={twMerge("truncate", step.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                      {step.text}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteSubStep(step.id)}
                    className="p-0.5 text-slate-600 hover:text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── COLUMN 2 (3 cols): Beta Track (Daily 10:00 PM Cutoff) ─────────────── */}
      <div className="col-span-12 md:col-span-3 flex flex-col justify-between p-3 shrink-0 md:min-h-0 min-h-[380px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-mono text-white">Beta Track</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                10 PM
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Daily Strict Hard Stop</span>
          </div>

          <button
            onClick={handleStartBetaSprint}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold transition-all"
          >
            <Play size={9} fill="currentColor" />
            <span>Sprint</span>
          </button>
        </div>

        {/* Digital Countdown to 10:00:00 PM */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950 border border-slate-800 text-center my-1 shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
            Countdown to 10:00 PM
          </span>
          <span className="text-2xl font-black font-mono tracking-tight text-cyan-300 mt-0.5">
            {betaCountdown.hrs}:{betaCountdown.mins}:{betaCountdown.secs}
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-0.5">
            {isBetaSubmitted ? "✓ Today Submitted" : "Pending submission"}
          </span>
        </div>

        {/* Submitted vs Pending View */}
        {isBetaSubmitted ? (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0 my-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-mono font-bold text-xs">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>✓ SUBMITTED FOR TODAY</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              +1 Sprint Credited & Logged in Vault
            </p>
            <button
              type="button"
              onClick={async () => {
                await undoBetaSubmission();
                showToast("Beta submission reverted", "info");
              }}
              className="mt-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-[10px] font-mono transition-all"
            >
              ↺ Undo / Edit Submission
            </button>
          </div>
        ) : null}

        {/* Today's Beta Micro-Checklist */}
        <div className="flex-1 min-h-0 flex flex-col my-1 overflow-hidden">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Today's Micro-Checklist:
          </span>
          <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1">
            {betaMicroChecklist.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => handleToggleBetaChecklist(step.id)}
                className={twMerge(
                  "w-full flex items-center gap-2 p-1.5 rounded border text-[11px] font-mono text-left transition-all",
                  step.isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                )}
              >
                {step.isDone ? (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                ) : (
                  <Circle size={12} className="text-slate-600 shrink-0" />
                )}
                <span className={twMerge("truncate", step.isDone && "line-through text-slate-500")}>
                  {step.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-1.5 shrink-0 my-1">
          <input
            value={betaTask}
            onChange={(e) => setBetaTask(e.target.value)}
            onBlur={handleSaveBetaDetails}
            placeholder="Today's assigned task…"
            className="bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
          <input
            value={betaProof}
            onChange={(e) => setBetaProof(e.target.value)}
            onBlur={handleSaveBetaDetails}
            placeholder="Proof / Loom / commit URL…"
            className="bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded px-2 py-1 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* Mark Submitted Button */}
        {!isBetaSubmitted && (
          <button
            onClick={async () => {
              await submitBetaSubmission(betaTask, betaProof);
              showToast("✓ Beta Submitted + 1 Sprint Credited!", "success");
            }}
            className="w-full py-2 px-3 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 my-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.3)] animate-pulse"
          >
            <Check size={13} strokeWidth={3} />
            <span>MARK SUBMITTED (+1 Sp)</span>
          </button>
        )}

        {/* 7-Day Consistency Row (M T W T F S S) */}
        <div className="pt-2 border-t border-slate-800 shrink-0">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
            7-Day Consistency:
          </span>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={twMerge(
                  "p-1 rounded text-center font-mono text-[9px] border transition-all",
                  d.isLogged
                    ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-300 font-bold"
                    : d.isToday
                    ? "bg-slate-800 border-cyan-500/50 text-cyan-300 font-bold"
                    : "bg-slate-950 border-slate-800/80 text-slate-500"
                )}
                title={`${d.key}: ${d.isLogged ? "Submitted" : "Pending"}`}
              >
                <div>{d.label}</div>
                <div className="text-[7px] mt-0.5">{d.isLogged ? "✓" : "·"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COLUMN 3 (4 cols): Submitted Proof & Deliverables Vault ───────────── */}
      <div className="col-span-12 md:col-span-4 flex flex-col p-3 shrink-0 md:min-h-0 min-h-[340px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
            Deliverables Vault ({filteredVault.length})
          </span>
          <span className="text-[9px] font-mono text-slate-500">Alpha & Beta Audit</span>
        </div>

        {/* Search */}
        <div className="relative my-2 shrink-0">
          <Search size={11} className="absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            placeholder="Search deliverables…"
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded px-2.5 pl-7 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* Internally Scrollable Vault List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {filteredVault.length === 0 ? (
            <div className="text-center py-12 text-[11px] font-mono text-slate-500">
              No archived proof found in vault.
            </div>
          ) : (
            filteredVault.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg border border-slate-800 bg-slate-950/70 text-xs font-mono flex flex-col gap-1 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={twMerge(
                      "text-[8px] uppercase px-1.5 py-0.2 rounded border font-bold",
                      item.type === "Alpha"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                    )}
                  >
                    {item.type}
                  </span>
                  <span className="text-[9px] text-slate-500">{item.date}</span>
                </div>

                <p className="text-slate-200 text-xs font-medium truncate">{item.title}</p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                  {item.link ? (
                    <a
                      href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                    >
                      <ExternalLink size={10} />
                      <span className="truncate">{item.link}</span>
                    </a>
                  ) : (
                    <span className="text-slate-600 italic">No external link</span>
                  )}
                  <button
                    onClick={() => handleDeleteVaultItem(item)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
