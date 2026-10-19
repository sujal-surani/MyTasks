import { useMemo } from "react";
import { getLocalDateKey } from "../hooks/useFirestore";
import { twMerge } from "tailwind-merge";
import { AlertTriangle } from "lucide-react";

const PILLARS = [
  { key: "devops",     label: "DevOps",     target: 4, color: "bg-cyan-400",   track: "bg-cyan-950",   glow: "shadow-[0_0_8px_rgba(34,211,238,0.4)]"  },
  { key: "startup",    label: "Startup",    target: 4, color: "bg-violet-400", track: "bg-violet-950", glow: "shadow-[0_0_8px_rgba(167,139,250,0.4)]" },
  { key: "internship", label: "Internship", target: 4, color: "bg-emerald-400",track: "bg-emerald-950",glow: "shadow-[0_0_8px_rgba(52,211,153,0.4)]"  },
  { key: "btech",      label: "B.Tech",     target: 3, color: "bg-amber-400",  track: "bg-amber-950",  glow: "shadow-[0_0_8px_rgba(251,191,36,0.4)]"  },
  { key: "general",    label: "General",    target: 3, color: "bg-slate-400",  track: "bg-slate-800",  glow: ""                                       },
];

export default function PillarHealth({ dailyTasks = [] }) {
  const pillarStats = useMemo(() => {
    const last7 = new Set(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return getLocalDateKey(d);
      })
    );

    const recentDone = dailyTasks.filter((t) => {
      if (t.status !== "done") return false;
      if (!t.completedAt) return false;
      return last7.has(getLocalDateKey(new Date(t.completedAt)));
    });

    return PILLARS.map(({ key, ...rest }) => {
      const tasks = recentDone.filter((t) => t.category === key);
      const sessions = tasks.length;
      const minutes = tasks.reduce((sum, t) => sum + (t.targetMinutes || 45), 0);
      return { key, sessions, minutes, ...rest };
    });
  }, [dailyTasks]);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-col justify-between h-full min-h-0 select-none shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            7-Day Pillar Health
          </span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">Rolling 7-Day Velocity</span>
      </div>

      {/* 5 Pillar Rows */}
      <div className="flex flex-col justify-around flex-1 py-1 gap-1">
        {pillarStats.map(({ key, label, target, color, track, sessions, minutes }) => {
          const pct = Math.min(100, Math.round((sessions / target) * 100));
          const isWarn = sessions === 0;
          const isMax = pct >= 100;

          return (
            <div key={key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className={twMerge("w-1.5 h-1.5 rounded-full", color)} />
                  <span className="font-bold text-slate-300">{label}</span>
                  {isWarn && (
                    <span className="text-[8px] text-amber-400 flex items-center gap-0.5">
                      <AlertTriangle size={8} /> 0 sessions
                    </span>
                  )}
                  {isMax && (
                    <span className="text-[8px] text-emerald-400 font-bold">✓ Target Hit</span>
                  )}
                </div>
                <span className="text-slate-400 text-[9px]">
                  {sessions}/{target} ({minutes}m)
                </span>
              </div>

              <div className={twMerge("h-1.5 w-full rounded-full overflow-hidden", track)}>
                <div
                  className={twMerge("h-full rounded-full transition-all duration-500", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-800 shrink-0 flex items-center justify-between">
        <span>Balance all 5 engineering pillars</span>
        <span className="text-violet-400 font-bold">18 Total Weekly Target</span>
      </div>
    </div>
  );
}
