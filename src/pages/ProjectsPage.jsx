import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useToast } from "../context/ToastContext";
import ProjectsGrid from "../components/ProjectsGrid";
import {
  FolderKanban, Cpu, Plus, Play, Trash2, CheckCircle2, Circle,
  Terminal, Sparkles, Check, Clock, Copy, Save
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLocalDateKey } from "../hooks/useFirestore";

const PRIORITY_TAGS = ["Kernel/OS", "GPU/CUDA", "IPC/Memory", "Benchmarks"];

const PRIORITY_COLORS = {
  "Kernel/OS": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "GPU/CUDA": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "IPC/Memory": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Benchmarks": "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const STARTER_PROJECTS = [
  {
    id: "proj_aws_cicd",
    title: "Automated AWS + Terraform CI/CD Infrastructure",
    techStack: ["AWS", "Terraform", "GitHub Actions", "Docker"],
    repoLink: "https://github.com/my-org/aws-terraform-cicd",
    liveDemoUrl: "https://api.cloudnative.dev",
    status: "Building",
    resourceLinks: [
      "terraform init && terraform apply -target=module.ecs_cluster",
      "docker buildx build --platform linux/amd64 -t app:v1 .",
      "aws ecs update-service --cluster prod --service api --force-new-deployment"
    ],
    milestones: [
      { id: "ms_aws_1", text: "VPC & ECS Fargate infrastructure provisioning with Terraform", isDone: true },
      { id: "ms_aws_2", text: "Multi-stage Dockerfile packaging & ECR image scanning", isDone: true },
      { id: "ms_aws_3", text: "Automated GitHub Actions workflow for linting, test & deploy", isDone: false },
      { id: "ms_aws_4", text: "Application Load Balancer health check & automated rollback", isDone: false },
    ],
  },
  {
    id: "proj_k8s_prom",
    title: "K8s Microservices & Prometheus Observability Stack",
    techStack: ["Kubernetes", "Prometheus", "Grafana", "Helm"],
    repoLink: "https://github.com/my-org/k8s-prometheus-telemetry",
    liveDemoUrl: "https://grafana.internal.k8s",
    status: "Building",
    resourceLinks: [
      "helm repo add prometheus-community https://prometheus-community.github.io/helm-charts",
      "helm install prometheus prometheus-community/kube-prometheus-stack",
      "kubectl get pods -n monitoring"
    ],
    milestones: [
      { id: "ms_k8s_1", text: "Deploy K8s microservices manifests & Ingress Controller", isDone: true },
      { id: "ms_k8s_2", text: "Setup Kube-Prometheus-Stack operator & Grafana dashboards", isDone: true },
      { id: "ms_k8s_3", text: "Configure custom ServiceMonitors & AlertManager rules", isDone: false },
      { id: "ms_k8s_4", text: "Stress testing & SLA latency SLO benchmarking", isDone: false },
    ],
  },
];

export default function ProjectsPage() {
  const { data, updateData } = useFirestoreContext();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("portfolio"); // "portfolio" | "startup"
  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [newMilestonePriority, setNewMilestonePriority] = useState("Kernel/OS");
  const [newAgendaText, setNewAgendaText] = useState("");
  const [queuedMilestones, setQueuedMilestones] = useState({});
  const navigate = useNavigate();

  const todayKey = getLocalDateKey();

  // Auto-seed 2 realistic starter projects if activeProjects is empty
  useEffect(() => {
    if (!Array.isArray(data.activeProjects) || data.activeProjects.length === 0) {
      updateData({ activeProjects: STARTER_PROJECTS });
    }
  }, [data.activeProjects, updateData]);

  const effectiveProjects = Array.isArray(data.activeProjects) && data.activeProjects.length > 0
    ? data.activeProjects
    : STARTER_PROJECTS;

  const startupState = data.startupRD || {
    researchNotes: "",
    milestones: [],
    agenda: [],
    lastSavedTimestamp: "",
  };

  const handleProjectsUpdate = useCallback(
    (projects) => updateData({ activeProjects: projects }),
    [updateData]
  );

  const handleStartStartupSprint = () => {
    const newTask = {
      id: `task_${Date.now()}_startup`,
      text: "Deep-Tech Startup R&D: Architecture & Kernel Deep Flow",
      category: "startup",
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
    showToast("⚡ Startup R&D 45m sprint launched!", "success");
    navigate("/");
  };

  const handlePushSubtaskToToday = (text) => {
    const newTask = {
      id: `task_${Date.now()}_project`,
      text,
      category: "devops",
      status: "today",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    updateData({
      dailyTasks: [...(data.dailyTasks || []), newTask],
    });
    showToast(`✓ Queued "${text.slice(0, 24)}" for Today!`, "success");
  };

  // Milestone CRUD
  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) return;
    const newMs = {
      id: `ms_${Date.now()}`,
      text: newMilestoneText.trim(),
      priority: newMilestonePriority,
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    const current = Array.isArray(startupState.milestones) ? startupState.milestones : [];
    updateData({ "startupRD.milestones": [...current, newMs] });
    setNewMilestoneText("");
    showToast("✓ Architecture milestone added", "success");
  };

  const handleToggleMilestone = (id) => {
    const current = Array.isArray(startupState.milestones) ? startupState.milestones : [];
    const updated = current.map((m) => (m.id === id ? { ...m, isDone: !m.isDone } : m));
    updateData({ "startupRD.milestones": updated });
  };

  const handleDeleteMilestone = (id) => {
    const current = Array.isArray(startupState.milestones) ? startupState.milestones : [];
    updateData({ "startupRD.milestones": current.filter((m) => m.id !== id) });
    showToast("Milestone deleted", "info");
  };

  const handleQueueMilestoneForToday = (m) => {
    const newTask = {
      id: `task_${Date.now()}_${m.id}`,
      text: `[${m.priority}] ${m.text}`,
      category: "startup",
      status: "today",
      targetDate: todayKey,
      estimatedSprints: 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      targetMinutes: 45,
    };
    const current = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
    updateData({ dailyTasks: [...current, newTask] });
    setQueuedMilestones((prev) => ({ ...prev, [m.id]: true }));
    showToast("✓ Queued for Today's schedule!", "success");
  };

  // Agenda CRUD
  const handleAddAgenda = (e) => {
    e.preventDefault();
    if (!newAgendaText.trim()) return;
    const item = { id: `agenda_${Date.now()}`, text: newAgendaText.trim(), isDone: false };
    const current = Array.isArray(startupState.agenda) ? startupState.agenda : [];
    updateData({ "startupRD.agenda": [...current, item] });
    setNewAgendaText("");
    showToast("✓ Agenda topic added", "success");
  };

  const handleToggleAgenda = (id) => {
    const current = Array.isArray(startupState.agenda) ? startupState.agenda : [];
    updateData({
      "startupRD.agenda": current.map((a) => (a.id === id ? { ...a, isDone: !a.isDone } : a)),
    });
  };

  const handleDeleteAgenda = (id) => {
    const current = Array.isArray(startupState.agenda) ? startupState.agenda : [];
    updateData({ "startupRD.agenda": current.filter((a) => a.id !== id) });
  };

  // Scratchpad
  const handleScratchpadChange = (e) => {
    const text = e.target.value;
    updateData({
      "startupRD.researchNotes": text,
      "startupRD.lastSavedTimestamp": new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const handleCopyScratchpad = () => {
    if (!startupState.researchNotes) return;
    navigator.clipboard.writeText(startupState.researchNotes);
    showToast("📋 Scratchpad notes copied to clipboard!", "success");
  };

  const milestonesList = Array.isArray(startupState.milestones) ? startupState.milestones : [];
  const agendaList = Array.isArray(startupState.agenda) ? startupState.agenda : [];

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto md:overflow-hidden select-text md:select-none">
      {/* ── Top Tab Switcher ── */}
      <div className="h-9 shrink-0 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={twMerge(
              "px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all",
              activeTab === "portfolio"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <FolderKanban size={13} />
            <span>Cloud & DevOps Portfolio</span>
          </button>
          <button
            onClick={() => setActiveTab("startup")}
            className={twMerge(
              "px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all",
              activeTab === "startup"
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Cpu size={13} />
            <span>Deep-Tech Startup R&D</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-500">
          {activeTab === "portfolio" ? "IaC Blueprints & Portfolio Tracking" : "Kernel, GPU & Co-founder Sync Hub"}
        </span>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "portfolio" ? (
        <ProjectsGrid
          activeProjects={effectiveProjects}
          onUpdate={handleProjectsUpdate}
          onPushToToday={handlePushSubtaskToToday}
        />
      ) : (
        /* ── Deep-Tech Startup R&D View (Zero-Scroll 12-col grid) ── */
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto md:overflow-hidden">
          {/* Top Banner (Compact) */}
          <div className="shrink-0 py-1.5 px-3 bg-gradient-to-r from-violet-950/40 via-slate-900 to-slate-900 border border-violet-500/30 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-violet-500/20 text-violet-300">
                <Cpu size={13} />
              </div>
              <span className="text-xs font-bold font-mono text-white">
                Deep-Tech Startup R&D (Kernel, GPU & High-Throughput IPC)
              </span>
            </div>

            <button
              onClick={handleStartStartupSprint}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-mono font-bold shadow-sm transition-all"
            >
              <Play size={10} fill="currentColor" />
              <span>Start Startup Sprint</span>
            </button>
          </div>

          {/* 12-Column Split: 6 cols Milestones | 6 cols Agenda + Scratchpad */}
          <div className="flex flex-col md:grid md:grid-cols-12 gap-3 flex-1 min-h-0 md:overflow-hidden">
            {/* Left 6 cols: Architecture & Kernel Milestones */}
            <div className="col-span-12 md:col-span-6 flex flex-col p-3 shrink-0 md:min-h-0 min-h-[360px] md:h-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-sm">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                  Architecture & Kernel Milestones ({milestonesList.length})
                </span>
                <span className="text-[9px] font-mono text-violet-400">
                  {milestonesList.filter((m) => m.isDone).length} completed
                </span>
              </div>

              {/* Add Milestone Form */}
              <form onSubmit={handleAddMilestone} className="flex gap-1.5 py-2 border-b border-slate-800 shrink-0">
                <input
                  type="text"
                  value={newMilestoneText}
                  onChange={(e) => setNewMilestoneText(e.target.value)}
                  placeholder="New milestone (e.g., CUDA zero-copy ring buffer)…"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-violet-500/60 rounded px-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                />
                <select
                  value={newMilestonePriority}
                  onChange={(e) => setNewMilestonePriority(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-mono rounded px-1.5 py-1 focus:outline-none"
                >
                  {PRIORITY_TAGS.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!newMilestoneText.trim()}
                  className="px-2.5 py-1 rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-30 text-slate-950 font-bold text-xs"
                >
                  <Plus size={12} />
                </button>
              </form>

              {/* Scrollable Milestone List */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar">
                {milestonesList.length === 0 ? (
                  <div className="text-center py-10 text-[11px] font-mono text-slate-500">
                    No architecture milestones recorded yet.
                  </div>
                ) : (
                  milestonesList.map((m) => {
                    const isQueued = queuedMilestones[m.id];
                    return (
                      <div
                        key={m.id}
                        className={twMerge(
                          "p-2 rounded-lg border text-xs font-mono transition-all flex items-center justify-between gap-2",
                          m.isDone ? "bg-slate-950/40 border-slate-900 opacity-60" : "bg-slate-950/70 border-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => handleToggleMilestone(m.id)}
                            className="shrink-0 text-slate-600 hover:text-emerald-400"
                          >
                            {m.isDone ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Circle size={13} />}
                          </button>
                          <span className={twMerge("text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0", PRIORITY_COLORS[m.priority] || "bg-slate-800 text-slate-300 border-slate-700")}>
                            {m.priority}
                          </span>
                          <span className={twMerge("truncate", m.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                            {m.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!m.isDone && (
                            <button
                              onClick={() => handleQueueMilestoneForToday(m)}
                              disabled={isQueued}
                              className={twMerge(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold transition-all",
                                isQueued
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                              )}
                            >
                              {isQueued ? "✓ Queued" : "-> Today"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-1 text-slate-600 hover:text-red-400"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 6 cols: Top half Co-founder Sync Agenda, Bottom half Scratchpad */}
            <div className="col-span-12 md:col-span-6 flex flex-col gap-2.5 shrink-0 md:min-h-0 md:h-full">
              {/* Top half: Co-Founder Sync Agenda */}
              <div className="flex-1 min-h-[220px] md:min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
                  <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                    Co-Founder Sync Agenda ({agendaList.length})
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">Weekly Alignment</span>
                </div>

                <form onSubmit={handleAddAgenda} className="flex gap-1 py-1.5 border-b border-slate-800 shrink-0">
                  <input
                    type="text"
                    value={newAgendaText}
                    onChange={(e) => setNewAgendaText(e.target.value)}
                    placeholder="Agenda item (e.g. AWS Credits, Pitch Deck)…"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-violet-500/60 rounded px-2 py-0.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newAgendaText.trim()}
                    className="p-1 rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-30 text-slate-950"
                  >
                    <Plus size={11} />
                  </button>
                </form>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pt-1.5 pr-1 custom-scrollbar">
                  {agendaList.length === 0 ? (
                    <div className="text-center py-4 text-[10px] font-mono text-slate-500">
                      No agenda topics added for next sync.
                    </div>
                  ) : (
                    agendaList.map((item) => (
                      <div
                        key={item.id}
                        className={twMerge(
                          "flex items-center justify-between p-1.5 rounded border text-[11px] font-mono",
                          item.isDone ? "bg-slate-950/30 border-slate-900 opacity-60" : "bg-slate-950/70 border-slate-800"
                        )}
                      >
                        <button
                          onClick={() => handleToggleAgenda(item.id)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                        >
                          {item.isDone ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" /> : <Circle size={12} className="text-slate-600 shrink-0" />}
                          <span className={twMerge("truncate", item.isDone ? "line-through text-slate-500" : "text-slate-200")}>
                            {item.text}
                          </span>
                        </button>
                        <button onClick={() => handleDeleteAgenda(item.id)} className="p-0.5 text-slate-600 hover:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom half: Research Scratchpad */}
              <div className="flex-1 min-h-[220px] md:min-h-0 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
                      Kernel / GPU Research Scratchpad
                    </span>
                    {startupState.lastSavedTimestamp && (
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                        saved {startupState.lastSavedTimestamp}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleCopyScratchpad}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-mono"
                  >
                    <Copy size={9} />
                    <span>Copy</span>
                  </button>
                </div>

                <textarea
                  value={startupState.researchNotes || ""}
                  onChange={handleScratchpadChange}
                  placeholder="Drop kernel trace notes, benchmarks, CUDA pointers, architecture thoughts here…"
                  className="flex-1 min-h-0 w-full bg-slate-950 border border-slate-800 focus:border-violet-500/60 rounded p-2 text-xs font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar mt-1.5"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
