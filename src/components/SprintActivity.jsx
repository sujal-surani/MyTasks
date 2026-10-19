import { useMemo } from "react";
import { getLocalDateKey } from "../hooks/useFirestore";
import { twMerge } from "tailwind-merge";
import { Activity, Flame, Calendar, Zap, CheckCircle2 } from "lucide-react";

function getCellColor(count) {
  if (!count || count === 0) return "bg-slate-900/60 border-slate-800 text-transparent";
  if (count === 1) return "bg-emerald-950/80 border-emerald-800/80 text-emerald-300";
  if (count === 2) return "bg-emerald-800/90 border-emerald-600/80 text-emerald-100 shadow-[0_0_6px_rgba(52,211,153,0.3)]";
  return "bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(52,211,153,0.5)]";
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS = 12; // 84 days rolling view

export default function SprintActivity({ sprintHistory = {}, onAdjustCount }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getLocalDateKey(today);
  const todayCount = sprintHistory[todayKey] || 0;

  const { weeks, stats } = useMemo(() => {
    const now = new Date();
    const todayDayOfWeek = now.getDay();

    const currentWeekSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayDayOfWeek);
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(startDate.getDate() - (WEEKS - 1) * 7);

    const weeksGrid = [];
    let prevMonth = -1;

    for (let w = 0; w < WEEKS; w++) {
      const days = [];
      let weekMonthLabel = "";

      for (let d = 0; d < 7; d++) {
        const curDate = new Date(startDate);
        curDate.setDate(startDate.getDate() + (w * 7 + d));
        const key = getLocalDateKey(curDate);
        const isFuture = curDate > now && key !== todayKey;
        const count = isFuture ? 0 : (sprintHistory[key] || 0);

        const m = curDate.getMonth();
        if (m !== prevMonth) {
          prevMonth = m;
          if (!weekMonthLabel) {
            weekMonthLabel = curDate.toLocaleDateString("en-US", { month: "short" });
          }
        }

        days.push({
          key,
          date: curDate,
          dayOfWeek: d,
          count,
          isFuture,
          isToday: key === todayKey,
        });
      }

      weeksGrid.push({
        monthLabel: weekMonthLabel,
        days,
      });
    }

    const totalSprints = Object.values(sprintHistory).reduce((a, b) => a + (Number(b) || 0), 0);
    const activeDays = Object.values(sprintHistory).filter((v) => Number(v) > 0).length;

    let streak = 0;
    const checkDate = new Date(now);
    const nowKey = getLocalDateKey(checkDate);
    if ((sprintHistory[nowKey] || 0) === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const k = getLocalDateKey(checkDate);
      if ((sprintHistory[k] || 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { weeks: weeksGrid, stats: { totalSprints, activeDays, streak } };
  }, [sprintHistory, todayKey]);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-col justify-between h-full min-h-0 select-none shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            Sprint Activity (12-Week Heatmap)
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          84-Day Rolling Window
        </span>
      </div>

      {/* Main 65% / 35% Split Container */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch gap-3 py-1.5 overflow-y-auto md:overflow-hidden">
        {/* Left 65%: 12-Week Heatmap Grid */}
        <div className="w-full md:w-[65%] min-w-0 flex flex-col justify-between pr-0 md:pr-3 border-b md:border-b-0 md:border-r border-slate-800/80 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
          <div className="flex items-center justify-center my-auto">
            <div className="flex gap-1.5">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-1 justify-around mr-1 pt-4">
                {DAY_LABELS.filter((_, i) => i % 2 === 0).map((d) => (
                  <span key={d} className="text-[8px] text-slate-600 font-mono w-4 leading-none">
                    {d}
                  </span>
                ))}
              </div>

              {/* 12 Weeks columns */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  <span className="text-[8px] text-slate-500 font-mono font-bold h-3 leading-3 truncate max-w-[26px]">
                    {week.monthLabel || ""}
                  </span>

                  {week.days.map(({ key, count, isFuture, isToday }) => {
                    if (isFuture) {
                      return (
                        <div
                          key={key}
                          className="w-5 h-5 rounded-[3px] border border-slate-800/40 bg-slate-900/20 opacity-30"
                        />
                      );
                    }

                    return (
                      <div
                        key={key}
                        title={
                          count > 0
                            ? `[${key}]: ${count} Sprint${count === 1 ? "" : "s"} completed (${count * 45} mins)`
                            : `[${key}]: 0 Sprints completed (0 mins)`
                        }
                        className={twMerge(
                          "w-5 h-5 rounded-[3px] border transition-all cursor-pointer hover:scale-115 hover:z-10 flex items-center justify-center text-[9px] font-mono",
                          getCellColor(count),
                          isToday ? "ring-1 ring-cyan-400" : ""
                        )}
                      >
                        {count > 0 ? count : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 shrink-0">
            <span>Grid: 1 Cell = 1 Day</span>
            <div className="flex items-center gap-1">
              <span>0</span>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-900/60 border border-slate-800" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-950/80 border border-emerald-800/80" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800/90 border border-emerald-600/80" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 border border-emerald-400" />
              <span>3+</span>
            </div>
          </div>
        </div>

        {/* Right 35%: Velocity & Streak Breakdown (4 Stacked Stat Tiles) */}
        <div className="w-full md:w-[35%] min-w-0 flex flex-col justify-between pl-0 md:pl-1 pt-2 md:pt-0">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Velocity Breakdown
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-around py-1 gap-1.5">
            {/* Tile 1: Total Sprints */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono text-slate-500 uppercase block">Total Output</span>
                <span className="text-xs font-mono font-bold text-white">{stats.totalSprints} Sprints</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {stats.totalSprints * 45}m
              </span>
            </div>

            {/* Tile 2: Active Consistency */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono text-slate-500 uppercase block">Consistency</span>
                <span className="text-xs font-mono font-bold text-cyan-300">{stats.activeDays} / 84 Days</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 font-bold">
                {Math.round((stats.activeDays / 84) * 100)}%
              </span>
            </div>

            {/* Tile 3: Current Streak */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono text-slate-500 uppercase block">Sprint Streak</span>
                <span className="text-xs font-mono font-bold text-amber-300">{stats.streak} Days Running</span>
              </div>
              <Flame size={13} className="text-amber-400 animate-pulse" />
            </div>

            {/* Tile 4: Today's Session + Adjuster */}
            <div className="p-1.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono text-slate-400 uppercase block">Today's Total</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{todayCount} Sprints</span>
              </div>
              {onAdjustCount && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAdjustCount(-1)}
                    disabled={todayCount <= 0}
                    className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 font-mono text-xs font-bold flex items-center justify-center transition-all"
                    title="Subtract 1 sprint from today"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustCount(1)}
                    className="w-5 h-5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center transition-all"
                    title="Add 1 sprint to today"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
