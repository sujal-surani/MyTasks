import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestoreContext } from "../context/FirestoreContext";
import { useToast } from "../context/ToastContext";
import SprintActivity from "../components/SprintActivity";
import PillarHealth from "../components/PillarHealth";
import {
  BookOpen, Calendar, Save, Check, Sparkles, PenLine,
  Download, Upload, FileText, Zap, ShieldAlert, Edit2, Trash2
} from "lucide-react";
import { getLocalDateKey } from "../hooks/useFirestore";
import { exportJsonBackup, importJsonBackup, exportWeeklyMarkdown } from "../utils/exportUtils";

function renderMarkdownReflection(rawText) {
  if (!rawText) return null;
  const lines = rawText.split("\n");
  return (
    <div className="space-y-1 mt-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return (
            <div key={idx} className="text-[11px] font-mono font-bold text-amber-300 pt-1">
              {trimmed.replace("### ", "")}
            </div>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-[10px] font-mono text-slate-300 pl-1">
              <span className="text-amber-400 shrink-0">•</span>
              <span className="leading-snug">{trimmed.replace("- ", "")}</span>
            </div>
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-0.5" />;
        }
        return (
          <p key={idx} className="text-[10px] font-mono text-slate-400 leading-snug">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, updateData, adjustSprintCount, effectiveSprints, restoreFullBackup } = useFirestoreContext();
  const { showToast } = useToast();

  const dailyTasks = useMemo(() => data.dailyTasks || [], [data.dailyTasks]);
  const captainsLog = useMemo(() => data.captainsLog || {}, [data.captainsLog]);

  const todayKey = getLocalDateKey();
  const fileInputRef = useRef(null);

  // Date selection for Captain's Log Editor
  const [selectedLogDate, setSelectedLogDate] = useState(todayKey);
  const existingEntry = captainsLog[selectedLogDate];
  const initialText = typeof existingEntry === "string" ? existingEntry : existingEntry?.text || "";

  const [logText, setLogText] = useState(initialText);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const entry = captainsLog[selectedLogDate];
    const text = typeof entry === "string" ? entry : entry?.text || "";
    setLogText(text);
  }, [selectedLogDate, captainsLog]);

  const handleSaveLog = () => {
    if (!logText.trim()) return;
    updateData({
      [`captainsLog.${selectedLogDate}`]: {
        text: logText.trim(),
        timestamp: new Date().toISOString(),
      },
    });
    setIsSaved(true);
    showToast(`✓ Reflection saved for ${selectedLogDate}!`, "success");
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleInsertTemplate = () => {
    const template = `### 🚀 Big Wins & Output\n- \n\n### 🛑 Friction & Blockers\n- \n\n### 🎯 Strategy for Tomorrow\n- `;
    setLogText((prev) => (prev ? `${prev}\n\n${template}` : template));
    showToast("Template inserted", "info");
  };

  // Sort logs descending
  const sortedLogs = useMemo(() => {
    return Object.entries(captainsLog)
      .map(([dateKey, entry]) => ({
        dateKey,
        text: typeof entry === "string" ? entry : entry?.text || "",
        timestamp: entry?.timestamp || dateKey,
      }))
      .filter((item) => item.text && item.text.trim().length > 0)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [captainsLog]);

  const handleLoadLog = (dateKey, text) => {
    setSelectedLogDate(dateKey);
    setLogText(text);
    showToast(`Loaded reflection for ${dateKey} into editor`, "info");
  };

  const handleDeleteLog = (dateKey) => {
    const updated = { ...captainsLog };
    delete updated[dateKey];
    updateData({ captainsLog: updated });
    if (selectedLogDate === dateKey) {
      setLogText("");
    }
    showToast(`Deleted reflection for ${dateKey}`, "info");
  };

  // Backup handlers
  const handleExportBackup = () => {
    exportJsonBackup(data);
    showToast("📥 Backup JSON downloaded", "success");
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("⏳ Restoring state & syncing...", "info");
      await importJsonBackup(file, async (parsed) => {
        await restoreFullBackup(parsed);
      });
      showToast("✓ Full state successfully restored & synced!", "success");
    } catch (err) {
      console.error("Backup restoration error:", err);
      showToast("Failed to restore backup: " + err.message, "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportMarkdown = async () => {
    try {
      await exportWeeklyMarkdown(data, effectiveSprints);
      showToast("📋 Weekly summary copied in Markdown!", "success");
    } catch (err) {
      showToast("Failed to copy markdown: " + err.message, "error");
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 md:grid-rows-2 gap-3 overflow-y-auto md:overflow-hidden select-text md:select-none">
      {/* ── TOP-LEFT (col-span-6, row-span-1): Sprint Activity Heatmap ── */}
      <div className="col-span-12 md:col-span-6 md:row-span-1 shrink-0 md:min-h-0 min-h-[320px] md:h-full flex flex-col">
        <SprintActivity
          sprintHistory={effectiveSprints}
          onAdjustCount={(delta) => adjustSprintCount(todayKey, delta)}
        />
      </div>

      {/* ── TOP-RIGHT (col-span-6, row-span-1): 7-Day Pillar Health ── */}
      <div className="col-span-12 md:col-span-6 md:row-span-1 shrink-0 md:min-h-0 min-h-[300px] md:h-full flex flex-col">
        <PillarHealth dailyTasks={dailyTasks} />
      </div>

      {/* ── BOTTOM-LEFT (col-span-6, row-span-1): Captain's Log Live Daily Editor ── */}
      <div className="col-span-12 md:col-span-6 md:row-span-1 shrink-0 md:min-h-0 min-h-[320px] md:h-full flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/10 text-amber-400">
              <PenLine size={13} />
            </div>
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
              Captain's Log • Daily Reflection
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedLogDate}
              onChange={(e) => setSelectedLogDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none"
            />
            <button
              onClick={handleInsertTemplate}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-[10px] font-mono text-amber-300 transition-all"
            >
              + Template
            </button>
            <button
              onClick={handleSaveLog}
              className="px-2.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-mono font-bold transition-all flex items-center gap-1"
            >
              {isSaved ? <Check size={11} /> : <Save size={11} />}
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>

        {/* Textarea automatically fills exact remaining quadrant height */}
        <textarea
          value={logText}
          onChange={(e) => setLogText(e.target.value)}
          placeholder="Reflect on today's engineering sprint velocity, obstacles overcome, and architecture learnings…"
          className="flex-1 min-h-[140px] md:min-h-0 w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg p-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none custom-scrollbar mt-2 leading-relaxed"
        />
      </div>

      {/* ── BOTTOM-RIGHT (col-span-6, row-span-1): Historical Archive & Backup Controls ── */}
      <div className="col-span-12 md:col-span-6 md:row-span-1 shrink-0 md:min-h-0 min-h-[320px] md:h-full flex flex-col justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-cyan-400" />
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300">
              Historical Reflections ({sortedLogs.length})
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">Chronological Archive</span>
        </div>

        {/* Scrollable list of past logs */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-1.5 pr-1 custom-scrollbar">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-8 text-[11px] font-mono text-slate-500">
              No daily reflections logged yet. Write one on the left!
            </div>
          ) : (
            sortedLogs.map(({ dateKey, text }) => {
              const sprintCount = effectiveSprints[dateKey] || 0;
              return (
                <div
                  key={dateKey}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70 text-xs font-mono flex flex-col gap-1.5 transition-all hover:border-slate-700"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{dateKey}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold">
                        ⚡ {sprintCount} Sprints ({sprintCount * 45}m)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoadLog(dateKey, text)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-[9px] font-mono flex items-center gap-1 transition-all"
                        title="Load into Editor"
                      >
                        <Edit2 size={9} />
                        <span>Load into Editor</span>
                      </button>
                      <button
                        onClick={() => handleDeleteLog(dateKey)}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-900 transition-all"
                        title="Delete entry"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Formatted Markdown Content */}
                  <div>
                    {renderMarkdownReflection(text)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Docked Data Safety Bar */}
        <div className="shrink-0 pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={handleExportBackup}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
          >
            <Download size={11} />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleTriggerImport}
            className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
          >
            <Upload size={11} />
            <span>Import JSON</span>
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex-1 py-1 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
          >
            <FileText size={11} />
            <span>Copy Markdown</span>
          </button>
        </div>
      </div>
    </div>
  );
}
