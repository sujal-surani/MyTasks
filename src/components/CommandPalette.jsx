import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  FolderKanban,
  GraduationCap,
  Briefcase,
  Play,
  Square,
  Clock,
  Plus,
  Moon,
  ShieldAlert,
  Zap,
  X,
  Download,
  Upload,
  FileText
} from "lucide-react";

export default function CommandPalette({
  isOpen,
  onClose,
  timerState,
  onUpdateTimer,
  onToggleMode,
  currentMode,
  onOpenManualWork,
  onOpenEOD,
  onExportBackup,
  onTriggerImport,
  onExportMarkdown,
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "nav-dash",
      label: "Go to Dashboard",
      category: "Navigation",
      icon: LayoutDashboard,
      shortcut: "G D",
      run: () => navigate("/"),
    },
    {
      id: "nav-tasks",
      label: "Go to Task Master",
      category: "Navigation",
      icon: CheckSquare,
      shortcut: "G T",
      run: () => navigate("/tasks"),
    },
    {
      id: "nav-internships",
      label: "Go to Internships Command",
      category: "Navigation",
      icon: Briefcase,
      shortcut: "G I",
      run: () => navigate("/internships"),
    },
    {
      id: "nav-projects",
      label: "Go to Projects & Startup",
      category: "Navigation",
      icon: FolderKanban,
      shortcut: "G P",
      run: () => navigate("/projects"),
    },
    {
      id: "nav-academics",
      label: "Go to B.Tech Sem 3 & Certs",
      category: "Navigation",
      icon: GraduationCap,
      shortcut: "G B",
      run: () => navigate("/academics"),
    },
    {
      id: "nav-analytics",
      label: "Go to Analytics & Logs",
      category: "Navigation",
      icon: BarChart2,
      shortcut: "G A",
      run: () => navigate("/analytics"),
    },
    {
      id: "timer-toggle",
      label: timerState?.isRunning ? "Pause Sprint Timer" : "Start 45m Sprint Timer",
      category: "Execution",
      icon: timerState?.isRunning ? Square : Play,
      shortcut: "Space",
      run: () =>
        onUpdateTimer({
          "timerState.isRunning": !timerState?.isRunning,
          "timerState.isPausedForErrand": false,
        }),
    },
    {
      id: "log-work",
      label: "Log Completed Work (Retroactive)",
      category: "Execution",
      icon: Clock,
      shortcut: "L",
      run: () => onOpenManualWork(),
    },
    {
      id: "eod-ritual",
      label: "Initiate Nightly EOD Protocol",
      category: "Execution",
      icon: Moon,
      shortcut: "E",
      run: () => onOpenEOD(),
    },
    {
      id: "toggle-mode",
      label: `Switch Mode (Currently ${currentMode === "early_exit" ? "2:15 PM Early Exit" : "5:00 PM Full Stretch"})`,
      category: "Protocol",
      icon: Zap,
      shortcut: "M",
      run: () =>
        onToggleMode(currentMode === "early_exit" ? "full_stretch" : "early_exit"),
    },
    {
      id: "export-backup",
      label: "Export Full JSON Backup",
      category: "Data & Safety",
      icon: Download,
      shortcut: "Ctrl+S",
      run: () => onExportBackup && onExportBackup(),
    },
    {
      id: "import-backup",
      label: "Import JSON Backup",
      category: "Data & Safety",
      icon: Upload,
      shortcut: "Ctrl+O",
      run: () => onTriggerImport && onTriggerImport(),
    },
    {
      id: "export-markdown",
      label: "Export Weekly Summary as Markdown to Clipboard",
      category: "Data & Safety",
      icon: FileText,
      shortcut: "Ctrl+M",
      run: () => onExportMarkdown && onExportMarkdown(),
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action) => {
    action.run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-xl bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
        style={{
          boxShadow: "0 0 50px rgba(6,182,212,0.2), 0 25px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search size={18} className="text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search pages, or backup state… (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono text-center py-8">
              No matching commands
            </p>
          ) : (
            filtered.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/70 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/30 transition-colors">
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-slate-200 group-hover:text-white font-bold">
                        {action.label}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {action.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                    {action.shortcut}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Command palette footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Navigate with click or shortcuts</span>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
}
