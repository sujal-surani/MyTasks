import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, onSnapshot, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Format date in local time as "YYYY-MM-DD"
export function getLocalDateKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Expand dot-notation keys into a nested object for local state merging.
// Supports Firestore FieldValue objects (like increment(1)) by applying them locally.
function expandDotKeys(updates, base) {
  const result = JSON.parse(JSON.stringify(base)); // deep clone
  for (const [key, value] of Object.entries(updates)) {
    const parts = key.split(".");
    let target = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (target[parts[i]] === undefined || typeof target[parts[i]] !== "object") {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    // If it's a Firestore increment object being applied locally
    if (value && typeof value === "object" && value.constructor?.name === "FieldValue") {
      const currentVal = typeof target[lastKey] === "number" ? target[lastKey] : 0;
      target[lastKey] = currentVal + 1;
    } else {
      target[lastKey] = value;
    }
  }
  return result;
}

// Normalizes tasks from older versions (V1/V2) to Task Schema V3
export function normalizeTask(t) {
  let status = t.status;
  if (!status) {
    if (t.column === "done" || t.isCompleted) status = "done";
    else if (t.column === "backlog") status = "backlog";
    else status = "today";
  }

  // Normalize category fallback
  const validCategories = ["devops", "startup", "internship", "btech", "general"];
  const category = validCategories.includes(t.category) ? t.category : "general";

  const todayKey = getLocalDateKey();
  const targetDate = t.targetDate || todayKey;
  const estimatedSprints = typeof t.estimatedSprints === "number" && t.estimatedSprints > 0 ? t.estimatedSprints : 1;

  return {
    id: t.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text: t.text || "Untitled Task",
    category,
    status,
    createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt || (status === "done" ? new Date().toISOString() : null),
    targetMinutes: typeof t.targetMinutes === "number" ? t.targetMinutes : 45,
    targetDate,
    estimatedSprints,
  };
}

// ─── Self-Healing Sprint Calculation Engine ──────────────────────────────────
export function computeEffectiveSprints(dailyTasks = [], sprintHistory = {}, manualAdjustments = {}) {
  const taskSprintMap = {};
  for (const task of dailyTasks) {
    if (task.status === "done") {
      let dateKey = null;
      if (task.completedAt) {
        dateKey = task.completedAt.slice(0, 10);
      } else if (task.targetDate) {
        dateKey = task.targetDate;
      } else if (task.createdAt) {
        dateKey = task.createdAt.slice(0, 10);
      }

      if (dateKey) {
        const sprints =
          typeof task.estimatedSprints === "number" && task.estimatedSprints > 0
            ? task.estimatedSprints
            : 1;
        taskSprintMap[dateKey] = (taskSprintMap[dateKey] || 0) + sprints;
      }
    }
  }

  const allDates = new Set([
    ...Object.keys(sprintHistory || {}),
    ...Object.keys(taskSprintMap),
    ...Object.keys(manualAdjustments || {}),
  ]);

  const effective = {};
  for (const date of allDates) {
    const rawHistory = sprintHistory?.[date] || 0;
    const taskSp = taskSprintMap[date] || 0;
    const adj = manualAdjustments?.[date] || 0;
    effective[date] = Math.max(0, Math.max(rawHistory, taskSp) + adj);
  }

  return effective;
}

// Default state if Firestore document doesn't exist yet
const DEFAULT_STATE = {
  currentMode: "early_exit",
  timerState: {
    timeLeft: 2700, // 45 minutes in seconds
    isRunning: false,
    isPausedForErrand: false,
    currentContextNote: "",
  },
  // Legacy single-tracker (kept for backwards compat, now superseded by internships.alpha)
  internshipTracker: {
    taskName: "Week 1 Deliverable",
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    isDocsDone: false,
    isBuildDone: false,
    isGitPushed: false,
    isProofSubmitted: false,
  },
  brainDumpNotes: "",
  dailyTasks: [], // Array<Task>
  sprintHistory: {}, // { [dateKey: string]: number }
  manualAdjustments: {}, // { [dateKey: string]: number }

  // ── V4.0 Schema Additions ──────────────────────────────────────────────────
  // Simple life/admin chore checklist (no timers, no categories)
  lifeTasks: [], // Array<{ id, text, isDone, createdAt }>

  // Commute learning queue
  commuteQueue: [], // Array<{ id, title, url, rideType: 'morning' | 'return', isDone, createdAt }>

  // Dual internship tracking engine
  internships: {
    // Alpha: 7-10 day deliverable cycle
    alpha: {
      taskName: "Week 1 Deliverable",
      deadlineDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      isDocsDone: false,
      isBuildDone: false,
      isGitPushed: false,
      isProofSubmitted: false,
      notes: [],
    },
    // Beta: Daily 10 PM deadline
    beta: {
      taskName: "",
      isSubmittedToday: false,
      lastResetDate: "", // YYYY-MM-DD
    },
    alphaHistory: [], // Array of completed alpha cycles
    betaHistory: [], // Array of logged daily beta submissions
  },

  // Active portfolio projects + milestones
  activeProjects: [], // Array<{ id, title, techStack[], repoLink, liveDemoUrl, resourceLinks[], status, milestones[{id,text,isDone}] }>

  // Deep-tech startup R&D
  startupRD: {
    researchNotes: "",
    milestones: [
      { id: "rd_1", text: "Low-overhead GPU kernel context switch profiling", priority: "Kernel/OS", isDone: true },
      { id: "rd_2", text: "Custom shared-memory ring buffer IPC benchmarks", priority: "IPC/Memory", isDone: false },
      { id: "rd_3", text: "Benchmarking microkernel scheduler against Linux CFS", priority: "Benchmarks", isDone: false },
    ],
    agenda: [
      { id: "ag_1", text: "Review compute latency benchmarks with co-founder", isDone: false },
      { id: "ag_2", text: "Finalize architecture RFC for memory-mapped model cache", isDone: false },
    ],
    lastSavedTimestamp: "",
  },

  // Academics (B.Tech & Certifications)
  academics: {
    subjects: [
      { id: "sub_1", name: "Operating Systems & Kernels", labChecklist: [{ id: "l1", text: "IPC Pipes lab viva", isDone: true }] },
      { id: "sub_2", name: "Data Structures & Algorithms", labChecklist: [{ id: "l2", text: "Graph traversal implementation", isDone: false }] },
      { id: "sub_3", name: "Computer Networks & Sockets", labChecklist: [{ id: "l3", text: "TCP handshake packet trace", isDone: false }] },
      { id: "sub_4", name: "Database Management Systems", labChecklist: [{ id: "l4", text: "SQL indexing & execution plan", isDone: true }] },
    ],
    exams: [
      { id: "ex_1", title: "Unit Test 1: Operating Systems", subject: "Operating Systems & Kernels", dateString: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0], syllabusUnits: [{ id: "u1", text: "Process Scheduling & IPC", isDone: true }, { id: "u2", text: "Memory Management & Paging", isDone: false }] },
      { id: "ex_2", title: "DSA Practical Lab Evaluation", subject: "Data Structures & Algorithms", dateString: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0], syllabusUnits: [{ id: "u3", text: "Graph Traversals (BFS/DFS)", isDone: true }, { id: "u4", text: "Dynamic Programming Knapsack", isDone: false }] },
    ],
    certifications: [
      { id: "cert_1", name: "AWS Solutions Architect Associate", provider: "AWS", targetDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], progress: 65, modules: "13/20 Modules Complete" },
      { id: "cert_2", name: "HashiCorp Terraform Associate", provider: "HashiCorp", targetDate: new Date(Date.now() + 75 * 86400000).toISOString().split("T")[0], progress: 40, modules: "4/10 Modules Complete" },
      { id: "cert_3", name: "Certified Kubernetes Administrator (CKA)", provider: "CNCF", targetDate: new Date(Date.now() + 110 * 86400000).toISOString().split("T")[0], progress: 25, modules: "3/12 Practice Labs Done" },
    ],
  },

  // Operations OS state
  globalState: {
    isExamModeActive: false,
  },
  captainsLog: {}, // { "YYYY-MM-DD": { text: string, timestamp: string } }
  dailyDiary: {}, // { "YYYY-MM-DD": { narrative: string, wins: string, intentions: string, mood: string, updatedAt: string } }
  eodStatus: {
    lastCompletedDate: "", // "YYYY-MM-DD"
  },
  brainDump: [], // Array<string> quick capture notes
};

// Deep sanitizer to ensure Firestore never encounters undefined values
export function sanitizeForFirestore(val) {
  if (val === undefined) return null;
  if (val === null || typeof val !== "object") return val;
  if (Array.isArray(val)) {
    return val.filter((item) => item !== undefined).map(sanitizeForFirestore);
  }
  const clean = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirestore(v);
    }
  }
  return clean;
}

// Normalizes any raw, partial, or legacy backup state into a complete, bulletproof schema
export function normalizeFullState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };

  // Handle wrapped backup envelopes (e.g., { data: ... }, { state: ... }, { dashboardState: ... })
  let remote = raw;
  if (remote["users/my_dashboard_state"] && typeof remote["users/my_dashboard_state"] === "object") {
    remote = remote["users/my_dashboard_state"];
  } else if (remote.dashboardState && typeof remote.dashboardState === "object") {
    remote = remote.dashboardState;
  } else if (remote.data && typeof remote.data === "object" && !Array.isArray(remote.data)) {
    remote = remote.data;
  } else if (remote.state && typeof remote.state === "object" && !Array.isArray(remote.state)) {
    remote = remote.state;
  }

  // 1. Tasks
  const normalizedTasks = Array.isArray(remote.dailyTasks)
    ? remote.dailyTasks.map(normalizeTask)
    : [];

  // 2. Active Projects
  const normalizedProjects = Array.isArray(remote.activeProjects)
    ? remote.activeProjects.map((p, idx) => ({
        id: p.id || `proj_${idx + 1}`,
        title: p.title || "Untitled Project",
        techStack: Array.isArray(p.techStack) ? p.techStack : [],
        repoLink: p.repoLink || "",
        liveDemoUrl: p.liveDemoUrl || "",
        resourceLinks: Array.isArray(p.resourceLinks) ? p.resourceLinks : [],
        status: p.status || "active",
        milestones: Array.isArray(p.milestones) ? p.milestones : [],
      }))
    : [];

  // 3. Academics
  const rawAcademics = remote.academics || {};
  const subjects = Array.isArray(rawAcademics.subjects)
    ? rawAcademics.subjects.map((s, idx) => ({
        id: s.id || `sub_${idx + 1}`,
        name: s.name || `Subject ${idx + 1}`,
        labChecklist: Array.isArray(s.labChecklist) ? s.labChecklist : [],
      }))
    : DEFAULT_STATE.academics.subjects;

  const exams = Array.isArray(rawAcademics.exams)
    ? rawAcademics.exams.map((e, idx) => ({
        id: e.id || `ex_${idx + 1}`,
        title: e.title || `Exam ${idx + 1}`,
        subject: e.subject || "",
        dateString: e.dateString || "",
        syllabusUnits: Array.isArray(e.syllabusUnits) ? e.syllabusUnits : [],
      }))
    : DEFAULT_STATE.academics.exams;

  const certifications = Array.isArray(rawAcademics.certifications)
    ? rawAcademics.certifications.map((c, idx) => {
        const score = typeof c.readinessScore === "number"
          ? c.readinessScore
          : typeof c.progress === "number"
          ? c.progress
          : 50;

        let modules = [];
        if (Array.isArray(c.modules) && c.modules.length > 0) {
          modules = c.modules.map((m, mIdx) => ({
            id: m.id || `mod_${c.id || idx}_${mIdx}`,
            text: m.text || `Module ${mIdx + 1}`,
            isDone: Boolean(m.isDone),
          }));
        } else {
          const modSummary = typeof c.modules === "string" ? c.modules : "Core Architecture & Specs";
          modules = [
            { id: `mod_${c.id || idx}_1`, text: `Domain 1: ${modSummary}`, isDone: score >= 50 },
            { id: `mod_${c.id || idx}_2`, text: "Domain 2: Practice Labs & Mock Exams", isDone: score >= 80 },
          ];
        }

        return {
          id: c.id || `cert_${idx + 1}`,
          name: c.name || "Certification",
          provider: c.provider || "Cloud",
          targetDate: c.targetDate || new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
          readinessScore: score,
          progress: score,
          modules,
        };
      })
    : DEFAULT_STATE.academics.certifications;

  // 4. Captain's Log standardizing
  const captainsLog = {};
  if (remote.captainsLog && typeof remote.captainsLog === "object") {
    for (const [dateKey, entry] of Object.entries(remote.captainsLog)) {
      if (typeof entry === "string") {
        captainsLog[dateKey] = { text: entry, timestamp: dateKey };
      } else if (entry && typeof entry === "object") {
        captainsLog[dateKey] = {
          text: entry.text || "",
          timestamp: entry.timestamp || dateKey,
        };
      }
    }
  }

  // 5. Daily Diary standardizing
  const dailyDiary = {};
  if (remote.dailyDiary && typeof remote.dailyDiary === "object") {
    for (const [dateKey, entry] of Object.entries(remote.dailyDiary)) {
      if (entry && typeof entry === "object") {
        dailyDiary[dateKey] = {
          narrative: entry.narrative || "",
          wins: entry.wins || "",
          intentions: entry.intentions || "",
          mood: entry.mood || "⚡ High Focus",
          updatedAt: entry.updatedAt || new Date().toISOString(),
        };
      }
    }
  }

  // 6. Sprint History & Manual Adjustments
  const sprintHistory = {};
  if (remote.sprintHistory && typeof remote.sprintHistory === "object") {
    for (const [k, v] of Object.entries(remote.sprintHistory)) {
      if (typeof v === "number" && !isNaN(v)) sprintHistory[k] = v;
    }
  }

  const manualAdjustments = {};
  if (remote.manualAdjustments && typeof remote.manualAdjustments === "object") {
    for (const [k, v] of Object.entries(remote.manualAdjustments)) {
      if (typeof v === "number" && !isNaN(v)) manualAdjustments[k] = v;
    }
  }

  return {
    ...DEFAULT_STATE,
    ...remote,
    dailyTasks: normalizedTasks,
    timerState: { ...DEFAULT_STATE.timerState, ...(remote.timerState || {}) },
    internshipTracker: { ...DEFAULT_STATE.internshipTracker, ...(remote.internshipTracker || {}) },
    sprintHistory,
    manualAdjustments,
    lifeTasks: Array.isArray(remote.lifeTasks) ? remote.lifeTasks : [],
    commuteQueue: Array.isArray(remote.commuteQueue) ? remote.commuteQueue : [],
    internships: {
      alpha: {
        ...DEFAULT_STATE.internships.alpha,
        ...(remote.internships?.alpha || {}),
        notes: Array.isArray(remote.internships?.alpha?.notes) ? remote.internships.alpha.notes : [],
      },
      beta: {
        ...DEFAULT_STATE.internships.beta,
        ...(remote.internships?.beta || {}),
      },
      alphaHistory: Array.isArray(remote.internships?.alphaHistory)
        ? remote.internships.alphaHistory
        : Array.isArray(remote.internships?.alphaArchive)
        ? remote.internships.alphaArchive
        : [],
      betaHistory: Array.isArray(remote.internships?.betaHistory)
        ? remote.internships.betaHistory
        : [],
    },
    activeProjects: normalizedProjects,
    startupRD: {
      ...DEFAULT_STATE.startupRD,
      ...(remote.startupRD || {}),
      milestones: Array.isArray(remote.startupRD?.milestones)
        ? remote.startupRD.milestones
        : DEFAULT_STATE.startupRD.milestones,
      agenda: Array.isArray(remote.startupRD?.agenda)
        ? remote.startupRD.agenda
        : DEFAULT_STATE.startupRD.agenda,
    },
    academics: {
      subjects,
      exams,
      certifications,
    },
    globalState: {
      ...DEFAULT_STATE.globalState,
      ...(remote.globalState || {}),
    },
    captainsLog,
    dailyDiary,
    eodStatus: {
      ...DEFAULT_STATE.eodStatus,
      ...(remote.eodStatus || {}),
    },
    brainDump: Array.isArray(remote.brainDump) ? remote.brainDump : [],
    brainDumpNotes: typeof remote.brainDumpNotes === "string" ? remote.brainDumpNotes : "",
    currentMode: remote.currentMode || DEFAULT_STATE.currentMode,
  };
}

export function useFirestore() {
  const [data, setData] = useState(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const docRef = doc(db, "users", "my_dashboard_state");
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const remote = docSnap.data();
            const normalized = normalizeFullState(remote);
            setData(normalized);
          } else {
            // Initialize document with defaults
            setDoc(docRef, DEFAULT_STATE).catch(() => {});
            setData(DEFAULT_STATE);
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn("Firestore unavailable, running local state fallback:", error.message);
          setIsFirebaseConfigured(false);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.warn("Firebase initialization error, running local state:", error.message);
      setIsFirebaseConfigured(false);
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Update arbitrary state fields (supports nested dot-notation like "timerState.timeLeft")
  const updateData = useCallback(
    async (updates) => {
      // Optimistic local state update
      setData((prev) => expandDotKeys(updates, prev));

      if (!isFirebaseConfigured) return;

      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        await updateDoc(docRef, updates);
      } catch (error) {
        try {
          const docRef = doc(db, "users", "my_dashboard_state");
          await setDoc(docRef, updates, { merge: true });
        } catch (e) {
          console.warn("Could not sync to Firestore:", e.message);
        }
      }
    },
    [isFirebaseConfigured]
  );

  // ── Log Completed Sprint (called when timer hits 00:00) ───────────────────
  const logCompletedSprint = useCallback(async () => {
    const todayKey = getLocalDateKey();

    setData((prev) => {
      const currentCount = prev.sprintHistory?.[todayKey] || 0;
      return {
        ...prev,
        sprintHistory: {
          ...prev.sprintHistory,
          [todayKey]: currentCount + 1,
        },
      };
    });

    if (!isFirebaseConfigured) return;

    try {
      const docRef = doc(db, "users", "my_dashboard_state");
      await updateDoc(docRef, {
        [`sprintHistory.${todayKey}`]: increment(1),
      });
    } catch (error) {
      console.warn("Could not sync completed sprint to Firestore:", error.message);
    }
  }, [isFirebaseConfigured]);

  // ── V6.0 Centralized Complete Task & Log Sprint Pipeline ──────────────────
  // Mathematically synchronizes dailyTasks, active task slot, and sprintHistory[today]
  const completeTaskAndLogSprint = useCallback(
    async (taskId, customSprints = null) => {
      const todayKey = getLocalDateKey();
      const nowIso = new Date().toISOString();
      let sprintIncrement = 1;

      setData((prev) => {
        const currentTasks = Array.isArray(prev.dailyTasks) ? prev.dailyTasks : [];
        const target = currentTasks.find((t) => t.id === taskId);
        if (target) {
          sprintIncrement = customSprints !== null
            ? customSprints
            : (typeof target.estimatedSprints === "number" && target.estimatedSprints > 0
                ? target.estimatedSprints
                : 1);
        }

        const currentSprintCount = prev.sprintHistory?.[todayKey] || 0;
        const updatedTasks = currentTasks.map((t) =>
          t.id === taskId
            ? { ...t, status: "done", completedAt: nowIso }
            : t
        );

        return {
          ...prev,
          dailyTasks: updatedTasks,
          sprintHistory: {
            ...prev.sprintHistory,
            [todayKey]: currentSprintCount + sprintIncrement,
          },
        };
      });

      if (!isFirebaseConfigured) return;

      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
        const target = currentTasks.find((t) => t.id === taskId);
        const finalIncrement = customSprints !== null
          ? customSprints
          : (target && typeof target.estimatedSprints === "number" && target.estimatedSprints > 0
              ? target.estimatedSprints
              : 1);

        const updatedTasks = currentTasks.map((t) =>
          t.id === taskId
            ? { ...t, status: "done", completedAt: nowIso }
            : t
        );

        await updateDoc(docRef, {
          dailyTasks: updatedTasks,
          [`sprintHistory.${todayKey}`]: increment(finalIncrement),
        });
      } catch (error) {
        console.warn("Could not sync completeTaskAndLogSprint to Firestore:", error.message);
      }
    },
    [isFirebaseConfigured, data.dailyTasks]
  );

  // ── V6.0 Manual Work / Retroactive Day Logger ──────────────────────────────
  const logManualWork = useCallback(
    async ({ text, category = "general", sprintCount = 1, timeSlot = "Morning/Campus" }) => {
      const todayKey = getLocalDateKey();
      const nowIso = new Date().toISOString();
      const count = Number(sprintCount) || 1;

      const newTask = {
        id: `manual_${Date.now()}_${category}`,
        text: `[${timeSlot}] ${text}`,
        category,
        status: "done",
        targetDate: todayKey,
        estimatedSprints: count,
        createdAt: nowIso,
        completedAt: nowIso,
        targetMinutes: count * 45,
      };

      setData((prev) => {
        const currentCount = prev.sprintHistory?.[todayKey] || 0;
        return {
          ...prev,
          dailyTasks: [...(prev.dailyTasks || []), newTask],
          sprintHistory: {
            ...prev.sprintHistory,
            [todayKey]: currentCount + count,
          },
        };
      });

      if (!isFirebaseConfigured) return;

      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        await updateDoc(docRef, {
          dailyTasks: [...(data.dailyTasks || []), newTask],
          [`sprintHistory.${todayKey}`]: increment(count),
        });
      } catch (error) {
        console.warn("Could not sync manual work to Firestore:", error.message);
      }
    },
    [isFirebaseConfigured, data.dailyTasks]
  );

  // ── V6.0/V7.0 Manual Heatmap Adjuster (+1 / -1) ───────────────────────────
  const adjustSprintCount = useCallback(
    async (delta, dateKey = getLocalDateKey()) => {
      setData((prev) => {
        const currentAdj = prev.manualAdjustments?.[dateKey] || 0;
        const newAdj = currentAdj + delta;
        const currentRaw = prev.sprintHistory?.[dateKey] || 0;
        return {
          ...prev,
          manualAdjustments: {
            ...prev.manualAdjustments,
            [dateKey]: newAdj,
          },
          sprintHistory: {
            ...prev.sprintHistory,
            [dateKey]: Math.max(0, currentRaw + delta),
          },
        };
      });

      if (!isFirebaseConfigured) return;

      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        await updateDoc(docRef, {
          [`manualAdjustments.${dateKey}`]: increment(delta),
          [`sprintHistory.${dateKey}`]: increment(delta),
        });
      } catch (error) {
        console.warn("Could not sync sprint count adjustment to Firestore:", error.message);
      }
    },
    [isFirebaseConfigured]
  );

  // ── Self-Healing Effective Sprints Engine ─────────────────────────────────
  const effectiveSprints = useMemo(() => {
    return computeEffectiveSprints(data.dailyTasks, data.sprintHistory, data.manualAdjustments);
  }, [data.dailyTasks, data.sprintHistory, data.manualAdjustments]);

  const getEffectiveSprintsForDate = useCallback(
    (dateKey = getLocalDateKey()) => {
      return effectiveSprints[dateKey] || 0;
    },
    [effectiveSprints]
  );

  // ── Unified Beta 10 PM Submission Engine ─────────────────────────────────
  const isBetaSubmittedToday = useMemo(() => {
    const today = getLocalDateKey();
    const beta = data.internships?.beta || {};
    const betaHistory = Array.isArray(data.internships?.betaHistory) ? data.internships.betaHistory : [];
    const dailyTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];

    const fromBetaState = Boolean(
      (beta.lastSubmittedDate === today) ||
      (beta.isSubmittedToday && (beta.lastResetDate === today || !beta.lastResetDate))
    );
    const fromHistory = betaHistory.some((h) => h.date === today || h.dateKey === today);
    const fromTasks = dailyTasks.some(
      (t) =>
        t.status === "done" &&
        (t.completedAt?.startsWith(today) || t.targetDate === today || !t.targetDate) &&
        (t.text?.toLowerCase().includes("beta") || t.text?.toLowerCase().includes("daily submission"))
    );

    return fromBetaState || fromHistory || fromTasks;
  }, [data.internships?.beta, data.internships?.betaHistory, data.dailyTasks]);

  const submitBetaSubmission = useCallback(
    async (taskName = "", proofLink = "") => {
      const today = getLocalDateKey();
      const nowIso = new Date().toISOString();
      const newLog = {
        id: `beta_${Date.now()}`,
        date: today,
        dateKey: today,
        taskTitle: taskName.trim() || "Daily Beta Submission",
        proofLink: proofLink.trim(),
        submittedAtTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setData((prev) => {
        const currentBeta = prev.internships?.beta || {};
        const currentHistory = Array.isArray(prev.internships?.betaHistory)
          ? prev.internships.betaHistory
          : [];
        const currentTasks = Array.isArray(prev.dailyTasks) ? prev.dailyTasks : [];

        const filteredHistory = currentHistory.filter((h) => h.date !== today && h.dateKey !== today);
        let hasBetaTask = false;
        const updatedTasks = currentTasks.map((t) => {
          if (
            (t.targetDate === today || t.completedAt?.startsWith(today) || !t.targetDate) &&
            (t.text?.toLowerCase().includes("beta") || t.text?.toLowerCase().includes("daily submission"))
          ) {
            hasBetaTask = true;
            return {
              ...t,
              status: "done",
              completedAt: t.completedAt || nowIso,
            };
          }
          return t;
        });

        if (!hasBetaTask) {
          const autoTask = {
            id: `task_${Date.now()}_beta_auto`,
            text: `[Beta 10 PM] ${taskName.trim() || "Daily Submission Complete"}`,
            category: "internship",
            status: "done",
            targetDate: today,
            estimatedSprints: 1,
            createdAt: nowIso,
            completedAt: nowIso,
            targetMinutes: 45,
          };
          updatedTasks.unshift(autoTask);
        }

        const sprintCount = prev.sprintHistory?.[today] || 0;

        return {
          ...prev,
          dailyTasks: updatedTasks,
          sprintHistory: {
            ...prev.sprintHistory,
            [today]: hasBetaTask ? sprintCount : sprintCount + 1,
          },
          internships: {
            ...prev.internships,
            beta: {
              ...currentBeta,
              taskName: taskName.trim() || currentBeta.taskName || "",
              proofLink: proofLink.trim() || currentBeta.proofLink || "",
              isSubmittedToday: true,
              lastSubmittedDate: today,
              lastResetDate: today,
            },
            betaHistory: [newLog, ...filteredHistory],
          },
        };
      });

      if (!isFirebaseConfigured) return;
      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
        let hasBetaTask = false;
        const updatedTasks = currentTasks.map((t) => {
          if (
            (t.targetDate === today || t.completedAt?.startsWith(today) || !t.targetDate) &&
            (t.text?.toLowerCase().includes("beta") || t.text?.toLowerCase().includes("daily submission"))
          ) {
            hasBetaTask = true;
            return {
              ...t,
              status: "done",
              completedAt: t.completedAt || nowIso,
            };
          }
          return t;
        });

        const currentHistory = Array.isArray(data.internships?.betaHistory)
          ? data.internships.betaHistory
          : [];
        const filteredHistory = currentHistory.filter((h) => h.date !== today && h.dateKey !== today);

        if (!hasBetaTask) {
          const autoTask = {
            id: `task_${Date.now()}_beta_auto`,
            text: `[Beta 10 PM] ${taskName.trim() || "Daily Submission Complete"}`,
            category: "internship",
            status: "done",
            targetDate: today,
            estimatedSprints: 1,
            createdAt: nowIso,
            completedAt: nowIso,
            targetMinutes: 45,
          };
          updatedTasks.unshift(autoTask);
        }

        const updates = {
          dailyTasks: updatedTasks,
          "internships.beta.isSubmittedToday": true,
          "internships.beta.lastSubmittedDate": today,
          "internships.beta.lastResetDate": today,
          "internships.betaHistory": [newLog, ...filteredHistory],
        };
        if (taskName.trim()) updates["internships.beta.taskName"] = taskName.trim();
        if (proofLink.trim()) updates["internships.beta.proofLink"] = proofLink.trim();
        if (!hasBetaTask) {
          updates[`sprintHistory.${today}`] = increment(1);
        }
        await updateDoc(docRef, updates);
      } catch (err) {
        console.warn("Could not sync submitBetaSubmission to Firestore:", err.message);
      }
    },
    [isFirebaseConfigured, data]
  );

  const undoBetaSubmission = useCallback(
    async () => {
      const today = getLocalDateKey();
      setData((prev) => {
        const currentBeta = prev.internships?.beta || {};
        const currentHistory = Array.isArray(prev.internships?.betaHistory)
          ? prev.internships.betaHistory
          : [];
        const currentTasks = Array.isArray(prev.dailyTasks) ? prev.dailyTasks : [];

        const updatedHistory = currentHistory.filter((h) => h.date !== today && h.dateKey !== today);
        const updatedTasks = currentTasks.map((t) => {
          if (
            (t.targetDate === today || t.completedAt?.startsWith(today)) &&
            t.text?.toLowerCase().includes("beta")
          ) {
            return { ...t, status: "today", completedAt: null };
          }
          return t;
        });

        return {
          ...prev,
          dailyTasks: updatedTasks,
          internships: {
            ...prev.internships,
            beta: {
              ...currentBeta,
              isSubmittedToday: false,
              lastSubmittedDate: "",
            },
            betaHistory: updatedHistory,
          },
        };
      });

      if (!isFirebaseConfigured) return;
      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        const currentBeta = data.internships?.beta || {};
        const currentHistory = Array.isArray(data.internships?.betaHistory)
          ? data.internships.betaHistory
          : [];
        const currentTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];

        const updatedHistory = currentHistory.filter((h) => h.date !== today && h.dateKey !== today);
        const updatedTasks = currentTasks.map((t) => {
          if (
            (t.targetDate === today || t.completedAt?.startsWith(today)) &&
            t.text?.toLowerCase().includes("beta")
          ) {
            return { ...t, status: "today", completedAt: null };
          }
          return t;
        });

        await updateDoc(docRef, {
          dailyTasks: updatedTasks,
          "internships.beta.isSubmittedToday": false,
          "internships.beta.lastSubmittedDate": "",
          "internships.betaHistory": updatedHistory,
        });
      } catch (err) {
        console.warn("Could not sync undoBetaSubmission to Firestore:", err.message);
      }
    },
    [isFirebaseConfigured, data]
  );

  // ── Full JSON Backup Restore ──────────────────────────────────────────────
  const restoreFullBackup = useCallback(
    async (backupData) => {
      if (!backupData || typeof backupData !== "object") {
        throw new Error("Invalid backup format: file must contain a valid JSON object");
      }

      const normalized = normalizeFullState(backupData);
      const cleanForFirestore = sanitizeForFirestore(normalized);

      // Immediately update local state so UI updates instantly
      setData(cleanForFirestore);

      // Persist to Firestore single-document sync
      if (isFirebaseConfigured) {
        try {
          const docRef = doc(db, "users", "my_dashboard_state");
          await setDoc(docRef, cleanForFirestore);
        } catch (err) {
          console.error("Firestore setDoc failed during backup restore:", err);
          throw new Error("Local state restored, but Firebase cloud sync failed: " + err.message);
        }
      }

      return cleanForFirestore;
    },
    [isFirebaseConfigured]
  );

  // ── Daily Diary & Captain's Log Unified Saver ──────────────────────────────
  const saveDiaryEntry = useCallback(
    async (dateKey, entry) => {
      if (!dateKey) return;
      const formattedEntry = {
        narrative: entry?.narrative || "",
        wins: entry?.wins || "",
        intentions: entry?.intentions || "",
        mood: entry?.mood || "⚡ High Focus",
        updatedAt: new Date().toISOString(),
      };

      const logTextParts = [];
      if (formattedEntry.mood) logTextParts.push(`[ENERGY/MOOD]: ${formattedEntry.mood}`);
      if (formattedEntry.narrative?.trim()) logTextParts.push(`// NARRATIVE & LIFE NOTES:\n${formattedEntry.narrative.trim()}`);
      if (formattedEntry.wins?.trim()) logTextParts.push(`// KEY TECHNICAL WINS:\n${formattedEntry.wins.trim()}`);
      if (formattedEntry.intentions?.trim()) logTextParts.push(`// TOMORROW'S INTENTIONS:\n${formattedEntry.intentions.trim()}`);
      const captainsLogText = logTextParts.join("\n\n");
      const timestamp = new Date().toISOString();

      setData((prev) => ({
        ...prev,
        dailyDiary: {
          ...(prev.dailyDiary || {}),
          [dateKey]: formattedEntry,
        },
        captainsLog: {
          ...(prev.captainsLog || {}),
          [dateKey]: {
            text: captainsLogText,
            timestamp,
          },
        },
      }));

      if (!isFirebaseConfigured) return;
      try {
        const docRef = doc(db, "users", "my_dashboard_state");
        await updateDoc(docRef, {
          [`dailyDiary.${dateKey}`]: formattedEntry,
          [`captainsLog.${dateKey}`]: {
            text: captainsLogText,
            timestamp,
          },
        });
      } catch (err) {
        console.warn("Could not sync dailyDiary and captainsLog entry to Firestore:", err.message);
      }
    },
    [isFirebaseConfigured]
  );

  return {
    data,
    updateData,
    logCompletedSprint,
    completeTaskAndLogSprint,
    logManualWork,
    adjustSprintCount,
    effectiveSprints,
    getEffectiveSprintsForDate,
    restoreFullBackup,
    isBetaSubmittedToday,
    submitBetaSubmission,
    undoBetaSubmission,
    saveDiaryEntry,
    isLoading,
    isFirebaseConfigured,
  };
}
