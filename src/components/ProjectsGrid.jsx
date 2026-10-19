import { useState } from "react";
import {
  Plus, Trash2, ExternalLink, CheckCircle2, Circle, ChevronDown, ChevronUp,
  GitBranch, Tag, Pause, Play, FolderGit2, BookOpen, Link as LinkIcon, Code2,
  Sparkles, Check, ArrowRight, Layers
} from "lucide-react";
import { twMerge } from "tailwind-merge";

// ─── Tech tag color map ────────────────────────────────────────────────────────
const TAG_COLORS = [
  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "bg-sky-500/15 text-sky-300 border-sky-500/30",
];
function tagColor(str) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

// ─── 1-Click Starter Blueprint Templates ───────────────────────────────────────
const BLUEPRINT_TEMPLATES = [
  {
    id: "blueprint_eks",
    title: "Production EKS/K8s + Terraform GitOps Pipeline",
    techStack: ["Kubernetes", "Terraform", "AWS", "ArgoCD", "Prometheus"],
    repoLink: "https://github.com/my-org/eks-gitops-infra",
    liveDemoUrl: "https://argocd.production.internal",
    status: "Building",
    resourceLinks: [
      "terraform init && terraform apply -target=module.eks",
      "kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server",
      "https://aws.github.io/aws-eks-best-practices/"
    ],
    milestones: [
      { id: "ms_eks_1", text: "Multi-AZ VPC & Subnet tier provisioning with Terraform", isDone: true },
      { id: "ms_eks_2", text: "EKS Cluster + Managed Node Groups with IAM OIDC roles", isDone: true },
      { id: "ms_eks_3", text: "Install ArgoCD + Configure ApplicationSets for GitOps sync", isDone: false },
      { id: "ms_eks_4", text: "Prometheus + Grafana cluster telemetry & alert rules", isDone: false },
    ],
  },
  {
    id: "blueprint_cicd",
    title: "Zero-Downtime AWS CI/CD with GitHub Actions & Docker",
    techStack: ["AWS", "Docker", "GitHub Actions", "ECS", "Terraform"],
    repoLink: "https://github.com/my-org/aws-ecs-zerodowntime-cicd",
    liveDemoUrl: "https://api.cloudnative.dev",
    status: "Building",
    resourceLinks: [
      "docker buildx build --platform linux/amd64 -t app:v1 .",
      "aws ecs update-service --cluster prod --service api --force-new-deployment",
      "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html"
    ],
    milestones: [
      { id: "ms_cicd_1", text: "Docker multi-stage build optimization (< 50MB alpine image)", isDone: true },
      { id: "ms_cicd_2", text: "GitHub Actions workflow for lint, unit tests & ECR push", isDone: false },
      { id: "ms_cicd_3", text: "AWS ECS Fargate blue/green deployment via CodeDeploy", isDone: false },
      { id: "ms_cicd_4", text: "Application Load Balancer health check & rollback trigger", isDone: false },
    ],
  },
  {
    id: "blueprint_ebpf",
    title: "Linux eBPF / Kernel Telemetry Agent",
    techStack: ["Linux", "C/Rust", "eBPF", "Grafana", "DevOps"],
    repoLink: "https://github.com/my-org/ebpf-kernel-telemetry",
    liveDemoUrl: "https://telemetry.kernel.internal",
    status: "Testing",
    resourceLinks: [
      "bpftool prog load bpf_program.o /sys/fs/bpf/prog_net",
      "sudo bpftrace -e 'kprobe:sys_enter_connect { printf(\"%d %s\\n\", pid, comm); }'",
      "https://ebpf.io/what-is-ebpf/"
    ],
    milestones: [
      { id: "ms_bpf_1", text: "Kernel probe attachment to sys_enter_execve & socket connect", isDone: true },
      { id: "ms_bpf_2", text: "Userspace telemetry forwarder in Go/Rust with ring buffer", isDone: false },
      { id: "ms_bpf_3", text: "Export container network latency metrics to Prometheus", isDone: false },
    ],
  },
];

// ─── Single Project Card V7 ───────────────────────────────────────────────────
function ProjectCard({ project, onUpdate, onDelete, onPushToToday }) {
  const [expanded, setExpanded] = useState(true);
  const [newMilestone, setNewMilestone] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newResource, setNewResource] = useState("");
  const [queuedMilestones, setQueuedMilestones] = useState({});

  const doneMilestones = (project.milestones || []).filter((m) => m.isDone).length;
  const totalMilestones = (project.milestones || []).length;
  const resourceLinks = Array.isArray(project.resourceLinks) ? project.resourceLinks : [];

  const addMilestone = (e) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    onUpdate({
      ...project,
      milestones: [
        ...(project.milestones || []),
        { id: `ms_${Date.now()}`, text: newMilestone.trim(), isDone: false },
      ],
    });
    setNewMilestone("");
  };

  const toggleMilestone = (id) => {
    onUpdate({
      ...project,
      milestones: project.milestones.map((m) =>
        m.id === id ? { ...m, isDone: !m.isDone } : m
      ),
    });
  };

  const deleteMilestone = (id) => {
    onUpdate({ ...project, milestones: project.milestones.filter((m) => m.id !== id) });
  };

  const handlePushMilestone = (m) => {
    if (onPushToToday) {
      onPushToToday(`[${project.title}] ${m.text}`);
      setQueuedMilestones((prev) => ({ ...prev, [m.id]: true }));
      setTimeout(() => {
        setQueuedMilestones((prev) => ({ ...prev, [m.id]: false }));
      }, 3000);
    }
  };

  const addTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim();
    if (!tag || (project.techStack || []).includes(tag)) return;
    onUpdate({ ...project, techStack: [...(project.techStack || []), tag] });
    setNewTag("");
  };

  const removeTag = (tag) => {
    onUpdate({ ...project, techStack: (project.techStack || []).filter((t) => t !== tag) });
  };

  const cycleStatus = () => {
    const statuses = ["Building", "Testing", "Deployed", "Paused"];
    const currentIndex = statuses.indexOf(project.status || "Building");
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onUpdate({ ...project, status: nextStatus });
  };

  const addResource = (e) => {
    e.preventDefault();
    if (!newResource.trim()) return;
    onUpdate({
      ...project,
      resourceLinks: [...resourceLinks, newResource.trim()],
    });
    setNewResource("");
  };

  const removeResource = (index) => {
    onUpdate({
      ...project,
      resourceLinks: resourceLinks.filter((_, i) => i !== index),
    });
  };

  const statusColor = {
    Building: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    Testing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Deployed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Paused: "bg-slate-700/50 text-slate-400 border-slate-600/30",
  }[project.status || "Building"] || "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";

  return (
    <div
      className={twMerge(
        "bg-slate-800/60 backdrop-blur-md border rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 transition-all duration-300",
        project.status === "Paused"
          ? "border-slate-700/40 opacity-75"
          : "border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.08)]"
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex-shrink-0 text-cyan-400">
            <FolderGit2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white font-mono truncate">{project.title}</h4>
              <button
                onClick={cycleStatus}
                title="Click to cycle status: Building → Testing → Deployed → Paused"
                className={twMerge("text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all hover:scale-105", statusColor)}
              >
                {project.status || "Building"}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {project.repoLink && (
                <a
                  href={project.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors font-mono truncate max-w-[160px]"
                >
                  <GitBranch size={10} />
                  <span>Repo</span>
                  <ExternalLink size={9} />
                </a>
              )}
              {project.liveDemoUrl && (
                <a
                  href={project.liveDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors font-mono truncate max-w-[160px]"
                >
                  <LinkIcon size={10} />
                  <span>Live / Arch Diagram</span>
                  <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onDelete}
            title="Delete project"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all hover:scale-110"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse card" : "Expand milestones & resources"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Tech stack tags */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {(project.techStack || []).map((tag) => (
          <button
            key={tag}
            onClick={() => removeTag(tag)}
            title="Click to remove tag"
            className={twMerge(
              "flex items-center gap-0.5 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all hover:opacity-60 hover:line-through",
              tagColor(tag)
            )}
          >
            {tag}
          </button>
        ))}
        <form onSubmit={addTag} className="flex items-center gap-1">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="+ tag"
            className="w-14 bg-transparent text-[9px] font-mono text-slate-500 placeholder-slate-700 focus:outline-none focus:text-slate-300 border-b border-slate-700 focus:border-slate-500 px-0.5"
          />
        </form>
      </div>

      {/* Milestone progress bar */}
      {totalMilestones > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Milestones Progress</span>
            <span className={doneMilestones === totalMilestones ? "text-emerald-400 font-bold" : "text-cyan-300 font-bold"}>
              {doneMilestones}/{totalMilestones} ({Math.round((doneMilestones / totalMilestones) * 100)}%)
            </span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/40">
            <div
              className={twMerge(
                "h-full rounded-full transition-all duration-500",
                doneMilestones === totalMilestones
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                  : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
              )}
              style={{ width: `${(doneMilestones / totalMilestones) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Resource Vault summary preview */}
      {resourceLinks.length > 0 && !expanded && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <BookOpen size={11} className="text-violet-400 shrink-0" />
          <span>{resourceLinks.length} Vault Command/Snippet{resourceLinks.length > 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Expanded: Milestones with Push-to-Sprint + Resource Vault */}
      {expanded && (
        <div className="flex flex-col gap-4 pt-3 border-t border-slate-700/40">
          {/* Section 1: Milestones */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Interactive Milestones</span>
              <span className="text-slate-500 text-[9px] font-normal">Push directly to Today's Queue</span>
            </span>

            {(project.milestones || []).length === 0 ? (
              <p className="text-[10px] text-slate-600 font-mono text-center py-2 border border-dashed border-slate-800 rounded-lg">
                No milestones yet · Add one below
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {project.milestones.map((m) => {
                  const isQueued = Boolean(queuedMilestones[m.id]);
                  return (
                    <div
                      key={m.id}
                      className="group flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/40 hover:border-slate-600 transition-colors"
                    >
                      <button
                        onClick={() => toggleMilestone(m.id)}
                        className="flex-shrink-0 hover:scale-110 transition-transform"
                      >
                        {m.isDone ? (
                          <CheckCircle2 size={14} className="text-emerald-400" />
                        ) : (
                          <Circle size={14} className="text-slate-600 hover:text-cyan-400 transition-colors" />
                        )}
                      </button>

                      <p
                        className={twMerge(
                          "flex-1 text-xs font-mono leading-tight",
                          m.isDone ? "line-through text-slate-600" : "text-slate-200"
                        )}
                      >
                        {m.text}
                      </p>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePushMilestone(m)}
                          className={twMerge(
                            "px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all",
                            isQueued
                              ? "bg-emerald-500/25 border border-emerald-500/50 text-emerald-300"
                              : "bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:scale-105 active:scale-95"
                          )}
                        >
                          {isQueued ? <Check size={10} /> : <Play size={9} fill="currentColor" />}
                          <span>{isQueued ? "✓ Queued" : "▶ Push to Today"}</span>
                        </button>

                        <button
                          onClick={() => deleteMilestone(m.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={addMilestone} className="flex gap-2 mt-1">
              <input
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                placeholder="Add milestone/task…"
                className="flex-1 bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
              <button
                type="submit"
                disabled={!newMilestone.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={3} />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Section 2: Resource & Command Vault */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1">
                <BookOpen size={11} className="text-violet-400" /> Resource & Command Vault
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                CLI commands, Terraform/Docker snippets
              </span>
            </div>

            {resourceLinks.length === 0 ? (
              <p className="text-[10px] text-slate-600 font-mono py-1.5 text-center border border-dashed border-slate-800 rounded-lg">
                No commands or documentation saved yet
              </p>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {resourceLinks.map((res, rIdx) => {
                  const isUrl = res.startsWith("http://") || res.startsWith("https://");
                  return (
                    <div
                      key={rIdx}
                      className="group flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/70 border border-slate-700/50 text-[11px] font-mono"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isUrl ? (
                          <LinkIcon size={11} className="text-cyan-400 shrink-0" />
                        ) : (
                          <Code2 size={11} className="text-amber-400 shrink-0" />
                        )}
                        {isUrl ? (
                          <a
                            href={res}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-300 hover:underline truncate"
                          >
                            {res}
                          </a>
                        ) : (
                          <code className="text-slate-300 truncate select-all">{res}</code>
                        )}
                      </div>
                      <button
                        onClick={() => removeResource(rIdx)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={addResource} className="flex gap-2 mt-1">
              <input
                value={newResource}
                onChange={(e) => setNewResource(e.target.value)}
                placeholder="CLI snippet, Terraform command, or URL…"
                className="flex-1 bg-slate-900/60 border border-violet-500/30 text-slate-200 placeholder-slate-600 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500/60 font-mono"
              />
              <button
                type="submit"
                disabled={!newResource.trim()}
                className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Project Modal ─────────────────────────────────────────────────────────
function NewProjectModal({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  const addTag = (e) => {
    e.preventDefault();
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: `proj_${Date.now()}`,
      title: title.trim(),
      techStack: tags,
      repoLink: repoLink.trim(),
      liveDemoUrl: liveDemoUrl.trim(),
      resourceLinks: [],
      status: "Building",
      milestones: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-slate-800/95 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-sm font-black font-mono text-white mb-4 flex items-center gap-2">
          <FolderGit2 size={16} className="text-cyan-400" />
          Create New Portfolio Project
        </h2>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 block">Title *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Multi-Region Terraform EKS..."
              className="w-full bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 block flex items-center gap-1">
              <GitBranch size={10} /> GitHub URL
            </label>
            <input
              value={repoLink}
              onChange={(e) => setRepoLink(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 block flex items-center gap-1">
              <LinkIcon size={10} /> Live Demo / Architecture Diagram URL
            </label>
            <input
              value={liveDemoUrl}
              onChange={(e) => setLiveDemoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 block">Tech Stack Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Kubernetes, Terraform, AWS…"
                className="flex-1 bg-slate-900/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-xl text-xs font-mono transition-all hover:scale-105"
              >
                + Tag
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Projects Grid V7 with Blueprint Template Loader ──────────────────────────
export default function ProjectsGrid({ activeProjects = [], onUpdate, onPushToToday }) {
  const [showModal, setShowModal] = useState(false);
  const [showBlueprintMenu, setShowBlueprintMenu] = useState(false);

  const addProject = (proj) => {
    onUpdate([...activeProjects, proj]);
    setShowModal(false);
  };

  const loadBlueprint = (template) => {
    const newProj = {
      ...template,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    onUpdate([newProj, ...activeProjects]);
    setShowBlueprintMenu(false);
  };

  const updateProject = (updated) => {
    onUpdate(activeProjects.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deleteProject = (id) => {
    onUpdate(activeProjects.filter((p) => p.id !== id));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-visible md:overflow-hidden pb-6 md:pb-0">
      {/* Header with Blueprint Dropdown & New Project */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <h2 className="text-xs font-black font-mono uppercase tracking-widest text-slate-300 truncate">
            Active Portfolio & R&D
          </h2>
          {activeProjects.length > 0 && (
            <span className="text-[10px] font-mono text-slate-500">
              ({activeProjects.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 relative w-full sm:w-auto justify-between sm:justify-end">
          {/* Load Blueprint Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBlueprintMenu((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-violet-300 hover:text-white
                         bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 px-2.5 py-1 rounded-lg
                         transition-all duration-200 hover:scale-102 active:scale-98 shadow-sm"
            >
              <Sparkles size={11} className="text-violet-400" />
              <span>⚡ Load Blueprint</span>
              <ChevronDown size={11} />
            </button>

            {showBlueprintMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-violet-500/40 rounded-xl shadow-2xl z-40 p-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  1-Click DevOps Blueprints
                </span>
                {BLUEPRINT_TEMPLATES.map((bp) => (
                  <button
                    key={bp.id}
                    onClick={() => loadBlueprint(bp)}
                    className="text-left p-2 rounded-lg hover:bg-slate-800 text-xs font-mono text-slate-200 hover:text-cyan-300 border border-transparent hover:border-slate-700 transition-all flex flex-col gap-0.5"
                  >
                    <span className="font-bold">{bp.title}</span>
                    <span className="text-[9px] text-slate-500 truncate">{bp.techStack.join(" · ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300
                       bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg
                       transition-all duration-200 hover:scale-102 active:scale-98"
          >
            <Plus size={11} strokeWidth={2.5} />
            New Project
          </button>
        </div>
      </div>

      {/* Project grid - internally scrollable */}
      {activeProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 gap-3">
          <FolderGit2 size={28} className="text-slate-600" />
          <p className="text-xs text-slate-400 font-mono text-center">
            No projects in active portfolio yet.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => loadBlueprint(BLUEPRINT_TEMPLATES[0])}
              className="text-xs font-mono font-bold text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 px-3 py-1.5 rounded-lg transition-all"
            >
              ⚡ Load EKS/K8s Blueprint
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 px-3 py-1.5 rounded-lg transition-all"
            >
              + Create Custom Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          {activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onUpdate={updateProject}
              onDelete={() => deleteProject(p.id)}
              onPushToToday={onPushToToday}
            />
          ))}
        </div>
      )}

      {showModal && <NewProjectModal onSave={addProject} onCancel={() => setShowModal(false)} />}
    </div>
  );
}
