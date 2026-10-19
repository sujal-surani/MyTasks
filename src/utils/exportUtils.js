import { getLocalDateKey, sanitizeForFirestore } from "../hooks/useFirestore";

// ─── Export Full Firestore State as JSON Backup ──────────────────────────────
export function exportJsonBackup(data) {
  const todayKey = getLocalDateKey();
  const filename = `cmdcenter-backup-${todayKey}.json`;
  const cleanData = sanitizeForFirestore(data);
  const jsonStr = JSON.stringify(cleanData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import JSON Backup ───────────────────────────────────────────────────────
export function importJsonBackup(file, onRestore) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected"));
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let text = e.target.result;
        if (!text || !text.trim()) {
          throw new Error("The selected file is empty");
        }
        // Strip BOM if present
        if (text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }
        let parsed = JSON.parse(text);
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch (_) {}
        }
        if (!parsed || typeof parsed !== "object") {
          throw new Error("File content is not a valid JSON object");
        }
        if (typeof onRestore === "function") {
          await onRestore(parsed);
        }
        resolve(parsed);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Malformed JSON backup file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read backup file"));
    reader.readAsText(file);
  });
}

// ─── Export Weekly Summary as Markdown to Clipboard ──────────────────────────
export async function exportWeeklyMarkdown(data, effectiveSprints = {}) {
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  // Collect last 7 days
  const last7Days = [];
  let totalWeeklySprints = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getLocalDateKey(d);
    const count = effectiveSprints[key] || 0;
    totalWeeklySprints += count;
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    last7Days.push({ key, dayName, count });
  }

  // Completed tasks in the last 7 days
  const dailyTasks = Array.isArray(data.dailyTasks) ? data.dailyTasks : [];
  const completedTasks = dailyTasks.filter((t) => t.status === "done");

  // Alpha deliverables
  const alphaArchive = Array.isArray(data.internships?.alphaHistory)
    ? data.internships.alphaHistory
    : Array.isArray(data.internships?.alphaArchive)
    ? data.internships.alphaArchive
    : [];

  // Beta submissions
  const betaHistory = Array.isArray(data.internships?.betaHistory)
    ? data.internships.betaHistory
    : [];

  // Captain's Logs for the last 7 days
  const captainsLog = data.captainsLog || {};

  let md = `# ⚡ CmdCenter Weekly Engineering Summary\n`;
  md += `**Generated:** ${todayKey} | **Total Sprints:** ${totalWeeklySprints} (${totalWeeklySprints * 45} mins / ${(totalWeeklySprints * 0.75).toFixed(1)} hrs)\n\n`;

  md += `## 📊 Daily Sprint Velocity\n`;
  md += `| Day | Date | Sprints | Focus Time |\n`;
  md += `| :--- | :--- | :---: | :---: |\n`;
  last7Days.forEach(({ dayName, key, count }) => {
    md += `| ${dayName} | ${key} | **${count}** | ${count * 45}m |\n`;
  });
  md += `\n`;

  md += `## 🚀 Completed Tasks & Milestones (${completedTasks.length})\n`;
  if (completedTasks.length === 0) {
    md += `*No tasks marked completed this week.*\n\n`;
  } else {
    completedTasks.slice(0, 20).forEach((t) => {
      const cat = t.category ? `[${t.category.toUpperCase()}]` : "[GENERAL]";
      const date = t.completedAt ? t.completedAt.slice(0, 10) : t.targetDate || "";
      md += `- [x] **${cat}** ${t.text} (${date})\n`;
    });
    if (completedTasks.length > 20) {
      md += `- *...and ${completedTasks.length - 20} more completed tasks*\n`;
    }
    md += `\n`;
  }

  md += `## 💼 Dual Internships Status\n`;
  md += `### Alpha Track (7-10 Day Cycle)\n`;
  md += `- **Active Deliverable:** ${data.internships?.alpha?.taskName || "None"}\n`;
  md += `- **Archived Cycles:** ${alphaArchive.length} completed\n`;
  if (alphaArchive.length > 0) {
    alphaArchive.slice(0, 5).forEach((a) => {
      md += `  - ✓ ${a.taskName || a.title || "Deliverable"} (${a.completedDate?.slice(0, 10) || a.completedAt?.slice(0, 10) || ""})\n`;
    });
  }
  md += `\n### Beta Track (Daily 10 PM Hard Stop)\n`;
  md += `- **Today's Status:** ${data.internships?.beta?.isSubmittedToday ? "✓ Submitted" : "Pending"}\n`;
  md += `- **Recent Submissions Logged:** ${betaHistory.length}\n\n`;

  md += `## 📝 Captain's Log Reflections\n`;
  let hasLogs = false;
  last7Days.forEach(({ key }) => {
    const entry = captainsLog[key];
    const text = typeof entry === "string" ? entry : entry?.text;
    if (text && text.trim()) {
      hasLogs = true;
      md += `### 📅 ${key}\n> ${text.trim().replace(/\n/g, "\n> ")}\n\n`;
    }
  });
  if (!hasLogs) {
    md += `*No log reflections recorded this week.*\n\n`;
  }

  md += `---\n*Generated from Personal Command Center OS (v7.0)*\n`;

  await navigator.clipboard.writeText(md);
  return md;
}
