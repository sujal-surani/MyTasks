import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useToast } from "../context/ToastContext";
import {
  GraduationCap, Calendar, AlertTriangle, Play, CheckCircle2, Circle,
  Plus, Trash2, BookOpen, ShieldAlert, ChevronDown, ChevronUp, Check,
  Award, Edit2
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey } from "../hooks/useFirestore";

export default function AcademicsPage() {
  const { data, updateData } = useFirestoreContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamSubject, setNewExamSubject] = useState("");
  const [expandedExamUnits, setExpandedExamUnits] = useState({});
  const [newUnitText, setNewUnitText] = useState({});

  // Certification state
  const [newCertName, setNewCertName] = useState("");
  const [newCertProvider, setNewCertProvider] = useState("AWS");
  const [newCertDate, setNewCertDate] = useState("");
  const [newLabText, setNewLabText] = useState({});
  const [newModuleText, setNewModuleText] = useState({});

  const todayKey = getLocalDateKey();
  const isExamMode = Boolean(data.globalState?.isExamModeActive);

  // Sem 3 subjects array
  const subjects = useMemo(() => {
    const raw = Array.isArray(data.academics?.subjects) && data.academics.subjects.length > 0
      ? data.academics.subjects
      : [
          { id: "sub_1", name: "Operating Systems & Kernels", labChecklist: [{ id: "l1", text: "IPC Pipes lab viva", isDone: true }] },
          { id: "sub_2", name: "Data Structures & Algorithms", labChecklist: [{ id: "l2", text: "Graph traversal implementation", isDone: false }] },
          { id: "sub_3", name: "Computer Networks & Sockets", labChecklist: [{ id: "l3", text: "TCP handshake packet trace", isDone: false }] },
          { id: "sub_4", name: "Database Management Systems", labChecklist: [{ id: "l4", text: "SQL indexing & execution plan", isDone: true }] },
        ];
    return raw.map((s) => ({
      ...s,
      labChecklist: Array.isArray(s.labChecklist) ? s.labChecklist : [],
    }));
  }, [data.academics?.subjects]);

  // Upcoming exams
  const exams = useMemo(() => {
    const raw = Array.isArray(data.academics?.exams) && data.academics.exams.length > 0
      ? data.academics.exams
      : [
          {
            id: "ex_1",
            title: "Unit Test 1: Operating Systems",
            subject: "Operating Systems & Kernels",
            dateString: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
            isCompleted: false,
            syllabusUnits: [
              { id: "u1", text: "Unit 1: Process Scheduling & IPC", isDone: true },
              { id: "u2", text: "Unit 2: Memory Management & Paging", isDone: false },
              { id: "u3", text: "Unit 3: Deadlocks & Semaphores", isDone: false },
            ],
          },
          {
            id: "ex_2",
            title: "DSA Practical Lab Evaluation",
            subject: "Data Structures & Algorithms",
            dateString: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
            isCompleted: false,
            syllabusUnits: [
              { id: "u4", text: "Unit 1: Graph Traversals (BFS/DFS)", isDone: true },
              { id: "u5", text: "Unit 2: Dynamic Programming Knapsack", isDone: false },
            ],
          },
        ];
    return raw.map((e) => ({
      ...e,
      syllabusUnits: Array.isArray(e.syllabusUnits) ? e.syllabusUnits : [],
    }));
  }, [data.academics?.exams]);

  // Certifications
  const certifications = useMemo(() => {
    const raw = Array.isArray(data.academics?.certifications) && data.academics.certifications.length > 0
      ? data.academics.certifications
      : [
          {
            id: "cert_1",
            name: "AWS Solutions Architect - Associate",
            provider: "AWS",
            targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            readinessScore: 65,
            modules: [
              { id: "mod_1", text: "Domain 1: Resilient Architectures", isDone: true },
              { id: "mod_2", text: "Domain 2: High-Performing Architectures", isDone: true },
              { id: "mod_3", text: "Domain 3: Secure Applications & IAM", isDone: false },
              { id: "mod_4", text: "Domain 4: Cost-Optimized Architectures", isDone: false },
            ],
          },
          {
            id: "cert_2",
            name: "HashiCorp Certified: Terraform Associate",
            provider: "HashiCorp",
            targetDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
            readinessScore: 40,
            modules: [
              { id: "mod_5", text: "IaC Concepts & Terraform CLI workflow", isDone: true },
              { id: "mod_6", text: "Modules, State locking & Remote backends", isDone: false },
            ],
          },
          {
            id: "cert_3",
            name: "Certified Kubernetes Administrator (CKA)",
            provider: "CNCF",
            targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
            readinessScore: 25,
            modules: [
              { id: "mod_7", text: "Cluster Architecture, Installation & Config", isDone: true },
              { id: "mod_8", text: "Workloads & Scheduling", isDone: false },
              { id: "mod_9", text: "Services & Networking (CoreDNS, CNI)", isDone: false },
            ],
          },
        ];
    return raw.map((c) => ({
      ...c,
      modules: Array.isArray(c.modules) && c.modules.length > 0
        ? c.modules
        : [
            { id: `mod_${c.id}_1`, text: "Domain 1: Core Architecture & Spec", isDone: (c.readinessScore || 0) >= 40 },
            { id: `mod_${c.id}_2`, text: "Domain 2: Implementation & Labs", isDone: (c.readinessScore || 0) >= 70 },
          ],
    }));
  }, [data.academics?.certifications]);

  // Next upcoming exam within 7 days
  const urgentExam = useMemo(() => {
    const pending = exams.filter((e) => !e.isCompleted && e.dateString);
    if (pending.length === 0) return null;
    const sorted = [...pending].sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
    const next = sorted[0];
    const days = Math.ceil((new Date(next.dateString) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 7 ? { ...next, daysRemaining: days } : null;
  }, [exams]);

  // Sprint launcher
  const handleLaunchStudySprint = (title, subject) => {
    const newTask = {
      id: `task_${Date.now()}_btech`,
      text: `B.Tech Study: ${title} (${subject || "Sem 3"})`,
      category: "btech",
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
    showToast(`⚡ 45m study sprint launched for ${title.slice(0, 24)}`, "success");
    navigate("/");
  };

  // Exam CRUD
  const handleAddExam = (e) => {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamDate) return;
    const newEx = {
      id: `ex_${Date.now()}`,
      title: newExamTitle.trim(),
      subject: newExamSubject.trim() || "General Engineering",
      dateString: newExamDate,
      isCompleted: false,
      syllabusUnits: [
        { id: `u_${Date.now()}_1`, text: "Unit 1: Fundamentals & Theory", isDone: false },
        { id: `u_${Date.now()}_2`, text: "Unit 2: Core Architecture & Problems", isDone: false },
      ],
    };
    updateData({ "academics.exams": [newEx, ...exams] });
    setNewExamTitle("");
    setNewExamDate("");
    setNewExamSubject("");
    showToast("✓ Exam scheduled", "success");
  };

  const handleDeleteExam = (id) => {
    updateData({ "academics.exams": exams.filter((e) => e.id !== id) });
    showToast("Exam removed", "info");
  };

  const handleToggleUnit = (examId, unitId) => {
    const updated = exams.map((ex) => {
      if (ex.id !== examId) return ex;
      const units = (ex.syllabusUnits || []).map((u) =>
        u.id === unitId ? { ...u, isDone: !u.isDone } : u
      );
      return { ...ex, syllabusUnits: units };
    });
    updateData({ "academics.exams": updated });
  };

  const handleAddUnit = (examId) => {
    const text = newUnitText[examId];
    if (!text || !text.trim()) return;
    const updated = exams.map((ex) => {
      if (ex.id !== examId) return ex;
      const units = [...(ex.syllabusUnits || []), { id: `u_${Date.now()}`, text: text.trim(), isDone: false }];
      return { ...ex, syllabusUnits: units };
    });
    updateData({ "academics.exams": updated });
    setNewUnitText((prev) => ({ ...prev, [examId]: "" }));
    showToast("✓ Syllabus unit added", "success");
  };

  const handleDeleteUnit = (examId, unitId) => {
    const updated = exams.map((ex) => {
      if (ex.id !== examId) return ex;
      return {
        ...ex,
        syllabusUnits: (ex.syllabusUnits || []).filter((u) => u.id !== unitId),
      };
    });
    updateData({ "academics.exams": updated });
    showToast("Syllabus unit deleted", "info");
  };

  // Subject CRUD
  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const newSub = {
      id: `sub_${Date.now()}`,
      name: newSubjectName.trim(),
      labChecklist: [{ id: `l_${Date.now()}`, text: "Initial lab assignment", isDone: false }],
    };
    updateData({ "academics.subjects": [...subjects, newSub] });
    setNewSubjectName("");
    showToast("✓ Subject added", "success");
  };

  const handleDeleteSubject = (id) => {
    updateData({ "academics.subjects": subjects.filter((s) => s.id !== id) });
    showToast("Subject removed", "info");
  };

  const handleToggleLab = (subId, labId) => {
    const updated = subjects.map((sub) => {
      if (sub.id !== subId) return sub;
      const labs = (sub.labChecklist || []).map((l) =>
        l.id === labId ? { ...l, isDone: !l.isDone } : l
      );
      return { ...sub, labChecklist: labs };
    });
    updateData({ "academics.subjects": updated });
  };

  const handleAddLab = (subId) => {
    const text = newLabText[subId];
    if (!text || !text.trim()) return;
    const updated = subjects.map((sub) => {
      if (sub.id !== subId) return sub;
      return {
        ...sub,
        labChecklist: [
          ...(sub.labChecklist || []),
          { id: `l_${Date.now()}`, text: text.trim(), isDone: false },
        ],
      };
    });
    updateData({ "academics.subjects": updated });
    setNewLabText((prev) => ({ ...prev, [subId]: "" }));
    showToast("✓ Lab item added", "success");
  };

  const handleDeleteLab = (subId, labId) => {
    const updated = subjects.map((sub) => {
      if (sub.id !== subId) return sub;
      return {
        ...sub,
        labChecklist: (sub.labChecklist || []).filter((l) => l.id !== labId),
      };
    });
    updateData({ "academics.subjects": updated });
    showToast("Lab item removed", "info");
  };

  // Certifications CRUD
  const handleAddCert = (e) => {
    e.preventDefault();
    if (!newCertName.trim()) return;
    const newC = {
      id: `cert_${Date.now()}`,
      name: newCertName.trim(),
      provider: newCertProvider,
      targetDate: newCertDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      readinessScore: 30,
      modules: [
        { id: `mod_${Date.now()}_1`, text: "Module 1: Core Concepts & Architecture", isDone: false },
        { id: `mod_${Date.now()}_2`, text: "Module 2: Hands-on Implementation", isDone: false },
      ],
    };
    updateData({ "academics.certifications": [...certifications, newC] });
    setNewCertName("");
    setNewCertDate("");
    showToast("✓ Certification target added", "success");
  };

  const handleDeleteCert = (id) => {
    updateData({ "academics.certifications": certifications.filter((c) => c.id !== id) });
    showToast("Certification deleted", "info");
  };

  const handleToggleCertModule = (certId, modId) => {
    const updated = certifications.map((c) => {
      if (c.id !== certId) return c;
      const mods = (Array.isArray(c.modules) ? c.modules : []).map((m) =>
        m.id === modId ? { ...m, isDone: !m.isDone } : m
      );
      return { ...c, modules: mods };
    });
    updateData({ "academics.certifications": updated });
  };

  const handleAddCertModule = (certId) => {
    const text = newModuleText[certId];
    if (!text || !text.trim()) return;
    const updated = certifications.map((c) => {
      if (c.id !== certId) return c;
      const mods = [...(Array.isArray(c.modules) ? c.modules : []), { id: `mod_${Date.now()}`, text: text.trim(), isDone: false }];
      return { ...c, modules: mods };
    });
    updateData({ "academics.certifications": updated });
    setNewModuleText((prev) => ({ ...prev, [certId]: "" }));
    showToast("✓ Certification module added", "success");
  };

  const handleDeleteCertModule = (certId, modId) => {
    const updated = certifications.map((c) => {
      if (c.id !== certId) return c;
      return {
        ...c,
        modules: (Array.isArray(c.modules) ? c.modules : []).filter((m) => m.id !== modId),
      };
    });
    updateData({ "academics.certifications": updated });
  };

  const handleUpdateReadiness = (id, delta) => {
    const updated = certifications.map((c) => {
      if (c.id !== id) return c;
      const nextScore = Math.min(100, Math.max(0, (c.readinessScore || 0) + delta));
      return { ...c, readinessScore: nextScore };
    });
    updateData({ "academics.certifications": updated });
  };

  return (
    <div className="h-full w-full flex-1 min-h-0 flex flex-col gap-2 overflow-hidden select-none">
      {/* ── Top Alert Strip (Only if exam is within 7 days) ── */}
      {urgentExam && (
        <div className="shrink-0 py-1.5 px-3 bg-amber-950/50 border border-amber-500/40 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-amber-300 truncate">
              EXAM IMMINENT ({urgentExam.daysRemaining}d): {urgentExam.title} on {urgentExam.dateString}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleLaunchStudySprint(urgentExam.title, urgentExam.subject)}
              className="px-2.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-mono font-bold"
            >
              Queue Study Sprint
            </button>
            {!isExamMode && (
              <button
                onClick={() => updateData({ "globalState.isExamModeActive": true })}
                className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/40 text-amber-300 text-[10px] font-mono"
              >
                Turn Exam Triage On
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 3-Column Equal-Height Grid (Zero Scroll at 100% Zoom) ── */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* ── COL 1 (4 cols): Exam Dates & Syllabus Units ── */}
        <div className="col-span-4 flex flex-col p-3 min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-400" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                Exam Dates & Syllabus ({exams.length})
              </span>
            </div>
          </div>

          {/* Add Exam Form */}
          <form onSubmit={handleAddExam} className="flex flex-col gap-1 py-1.5 border-b border-slate-800 shrink-0">
            <input
              type="text"
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              placeholder="Exam Title (e.g. Mid-Term OS)…"
              className="bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <div className="flex gap-1">
              <input
                type="text"
                value={newExamSubject}
                onChange={(e) => setNewExamSubject(e.target.value)}
                placeholder="Subject…"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded px-2 py-0.5 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <input
                type="date"
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={!newExamTitle.trim() || !newExamDate}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold text-xs"
              >
                <Plus size={12} />
              </button>
            </div>
          </form>

          {/* Internally Scrollable Exam Cards */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1 custom-scrollbar">
            {exams.map((ex) => {
              const units = ex.syllabusUnits || [];
              const readyUnits = units.filter((u) => u.isDone).length;
              const isExpanded = expandedExamUnits[ex.id];
              const pct = units.length > 0 ? Math.round((readyUnits / units.length) * 100) : 0;
              return (
                <div key={ex.id} className="p-2 rounded-lg border border-slate-800 bg-slate-950/70 text-xs font-mono flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-200 truncate">{ex.title}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                      {ex.dateString}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>{readyUnits}/{units.length} Units Ready ({pct}%)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLaunchStudySprint(ex.title, ex.subject)}
                        className="px-1.5 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-0.5"
                      >
                        <Play size={8} fill="currentColor" /> Sprint
                      </button>
                      <button
                        onClick={() => setExpandedExamUnits((p) => ({ ...p, [ex.id]: !p[ex.id] }))}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <button onClick={() => handleDeleteExam(ex.id)} className="p-0.5 text-slate-600 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>

                  {/* Expandable Syllabus checklist */}
                  {isExpanded && (
                    <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                      {units.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-[10px] group">
                          <button
                            onClick={() => handleToggleUnit(ex.id, u.id)}
                            className="flex items-center gap-1.5 truncate text-left flex-1 min-w-0"
                          >
                            {u.isDone ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" /> : <Circle size={11} className="text-slate-600 shrink-0" />}
                            <span className={u.isDone ? "line-through text-slate-500 truncate" : "text-slate-300 truncate"}>{u.text}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(ex.id, u.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 shrink-0"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1 pt-1">
                        <input
                          value={newUnitText[ex.id] || ""}
                          onChange={(e) => setNewUnitText({ ...newUnitText, [ex.id]: e.target.value })}
                          placeholder="Add unit…"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-slate-200"
                        />
                        <button
                          onClick={() => handleAddUnit(ex.id)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[9px]"
                        >
                          + Unit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COL 2 (4 cols): Sem 3 Subjects & Lab Clearances ── */}
        <div className="col-span-4 flex flex-col p-3 min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-cyan-400" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                Sem 3 Subjects & Labs ({subjects.length})
              </span>
            </div>
          </div>

          {/* Add Subject */}
          <form onSubmit={handleAddSubject} className="flex gap-1 py-1.5 border-b border-slate-800 shrink-0">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Subject name (e.g. Compiler Design)…"
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newSubjectName.trim()}
              className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 font-bold text-xs"
            >
              <Plus size={12} />
            </button>
          </form>

          {/* Scrollable Subjects */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1 custom-scrollbar">
            {subjects.map((sub) => {
              const labs = sub.labChecklist || [];
              const doneLabs = labs.filter((l) => l.isDone).length;
              return (
                <div key={sub.id} className="p-2 rounded-lg border border-slate-800 bg-slate-950/70 text-xs font-mono flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate">{sub.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLaunchStudySprint(sub.name, sub.name)}
                        className="px-1.5 py-0.2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[9px] font-bold flex items-center gap-0.5"
                      >
                        <Play size={8} fill="currentColor" /> Sprint
                      </button>
                      <button onClick={() => handleDeleteSubject(sub.id)} className="p-0.5 text-slate-600 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Lab Viva checklist */}
                  <div className="pt-1 border-t border-slate-800/80 flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 uppercase">Lab Viva / Experiments ({doneLabs}/{labs.length}):</span>
                    {labs.map((lab) => (
                      <div key={lab.id} className="flex items-center justify-between text-[10px] group">
                        <button
                          onClick={() => handleToggleLab(sub.id, lab.id)}
                          className="flex items-center gap-1.5 text-left truncate flex-1 min-w-0"
                        >
                          {lab.isDone ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" /> : <Circle size={11} className="text-slate-600 shrink-0" />}
                          <span className={lab.isDone ? "line-through text-slate-500 truncate" : "text-slate-300 truncate"}>{lab.text}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLab(sub.id, lab.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddLab(sub.id);
                      }}
                      className="flex gap-1 pt-1"
                    >
                      <input
                        value={newLabText[sub.id] || ""}
                        onChange={(e) => setNewLabText({ ...newLabText, [sub.id]: e.target.value })}
                        placeholder="+ Add lab, assignment, or viva topic (Enter)..."
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newLabText[sub.id]?.trim()}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 text-[9px] font-mono"
                      >
                        + Add
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COL 3 (4 cols): Cloud & DevOps Certifications ── */}
        <div className="col-span-4 flex flex-col p-3 min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <Award size={13} className="text-purple-400" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                Cloud & DevOps Certs ({certifications.length})
              </span>
            </div>
          </div>

          {/* Add Cert Form */}
          <form onSubmit={handleAddCert} className="flex flex-col gap-1 py-1.5 border-b border-slate-800 shrink-0">
            <input
              type="text"
              value={newCertName}
              onChange={(e) => setNewCertName(e.target.value)}
              placeholder="Certification Title (e.g. CKA)…"
              className="bg-slate-950 border border-slate-800 focus:border-purple-500/60 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <div className="flex gap-1">
              <select
                value={newCertProvider}
                onChange={(e) => setNewCertProvider(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="AWS">AWS</option>
                <option value="CNCF">CNCF</option>
                <option value="HashiCorp">HashiCorp</option>
                <option value="Linux">Linux</option>
              </select>
              <input
                type="date"
                value={newCertDate}
                onChange={(e) => setNewCertDate(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500/60 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newCertName.trim()}
                className="px-2 py-0.5 rounded bg-purple-500 hover:bg-purple-400 disabled:opacity-30 text-white font-bold text-xs"
              >
                <Plus size={12} />
              </button>
            </div>
          </form>

          {/* Scrollable Cert Cards */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1 custom-scrollbar">
            {certifications.map((c) => {
              const score = c.readinessScore || 0;
              return (
                <div key={c.id} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70 text-xs font-mono flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                      {c.provider || "Cloud"}
                    </span>
                    <button onClick={() => handleDeleteCert(c.id)} className="text-slate-600 hover:text-red-400">
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <p className="font-bold text-slate-200 text-xs leading-snug">{c.name}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Target: {c.targetDate}</span>
                    <strong className="text-purple-300">{score}% Ready</strong>
                  </div>

                  {/* Score adjustment buttons & progress */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${score}%` }} />
                    </div>
                    <button
                      onClick={() => handleUpdateReadiness(c.id, -5)}
                      className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[9px] text-slate-400"
                    >
                      -5%
                    </button>
                    <button
                      onClick={() => handleUpdateReadiness(c.id, +5)}
                      className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[9px] text-purple-300"
                    >
                      +5%
                    </button>
                  </div>

                  {/* Domain & Blueprint Modules Checklist */}
                  <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 uppercase">Domain & Blueprint Modules:</span>
                    {(Array.isArray(c.modules) ? c.modules : []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[10px] group">
                        <button
                          onClick={() => handleToggleCertModule(c.id, m.id)}
                          className="flex items-center gap-1.5 text-left truncate flex-1 min-w-0"
                        >
                          {m.isDone ? <CheckCircle2 size={11} className="text-purple-400 shrink-0" /> : <Circle size={11} className="text-slate-600 shrink-0" />}
                          <span className={m.isDone ? "line-through text-slate-500 truncate" : "text-slate-300 truncate"}>{m.text}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCertModule(c.id, m.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddCertModule(c.id);
                      }}
                      className="flex gap-1 pt-1"
                    >
                      <input
                        value={newModuleText[c.id] || ""}
                        onChange={(e) => setNewModuleText({ ...newModuleText, [c.id]: e.target.value })}
                        placeholder="+ Add module / domain (Enter)..."
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newModuleText[c.id]?.trim()}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-purple-300 text-[9px] font-mono"
                      >
                        + Add
                      </button>
                    </form>
                  </div>

                  <button
                    onClick={() => handleLaunchStudySprint(c.name, c.provider)}
                    className="w-full py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all mt-0.5"
                  >
                    <Play size={9} fill="currentColor" />
                    <span>Cert Sprint (45m)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
