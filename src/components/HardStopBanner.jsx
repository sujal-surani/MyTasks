import { useState, useEffect } from "react";
import { GitBranch, Phone, Clock } from "lucide-react";
import { twMerge } from "tailwind-merge";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatClock(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${pad(h12)}:${pad(m)}:${pad(s)} ${ampm}`;
}

function getCountdownTo2355(now) {
  const target = new Date(now);
  target.setHours(23, 55, 0, 0);
  if (now >= target) {
    // Past 11:55 PM
    return null;
  }
  const diff = Math.floor((target - now) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return { h, m, s, diff };
}

export default function HardStopBanner() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = getCountdownTo2355(now);
  const isPast = countdown === null;
  const isUrgent = countdown && countdown.diff <= 30 * 60; // last 30 min
  const isCritical = countdown && countdown.diff <= 10 * 60; // last 10 min

  return (
    <footer
      className={twMerge(
        "sticky bottom-0 z-20 w-full transition-all duration-500",
        "border-t",
        isCritical
          ? "bg-red-950/90 border-red-500/60 shadow-red-500/20 shadow-lg"
          : isUrgent
          ? "bg-amber-950/90 border-amber-500/50"
          : "bg-slate-900/95 border-slate-700/50",
        "backdrop-blur-md"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left: Main message */}
        <div className="flex items-center gap-3">
          <div
            className={twMerge(
              "p-1.5 rounded-lg",
              isCritical ? "bg-red-500/20" : isUrgent ? "bg-amber-500/20" : "bg-slate-800"
            )}
          >
            <GitBranch
              size={15}
              className={isCritical ? "text-red-400" : isUrgent ? "text-amber-400" : "text-slate-400"}
            />
          </div>
          <div>
            <p
              className={twMerge(
                "text-xs font-bold uppercase tracking-widest",
                isCritical ? "text-red-400 animate-pulse" : isUrgent ? "text-amber-400" : "text-slate-400"
              )}
            >
              {isPast ? "🌙 Code Freeze — Rest Now" : "11:55 PM Hard Stop"}
            </p>
            <p className="text-xs text-slate-500 hidden sm:block">
              Push to Git · Close laptop ·{" "}
              <span className="text-pink-400 inline-flex items-center gap-1">
                <Phone size={10} /> 12 AM GF Call
              </span>
            </p>
          </div>
        </div>

        {/* Right: Clock + Countdown */}
        <div className="flex items-center gap-4">
          {/* Countdown */}
          {!isPast && countdown && (
            <div className="flex items-center gap-1.5">
              <Clock
                size={13}
                className={isCritical ? "text-red-400 animate-pulse" : isUrgent ? "text-amber-400" : "text-slate-500"}
              />
              <span
                className={twMerge(
                  "font-mono font-bold text-sm",
                  isCritical ? "text-red-300" : isUrgent ? "text-amber-300" : "text-slate-300"
                )}
              >
                {countdown.h > 0 ? `${pad(countdown.h)}h ` : ""}
                {pad(countdown.m)}m {pad(countdown.s)}s
              </span>
              <span className="text-xs text-slate-600">to freeze</span>
            </div>
          )}

          {/* Live clock */}
          <div className="font-mono font-bold text-base text-white bg-slate-800/70 px-3 py-1.5 rounded-lg border border-slate-700/50">
            {formatClock(now)}
          </div>
        </div>
      </div>

      {/* Critical warning bar */}
      {isCritical && (
        <div className="bg-red-500/10 border-t border-red-500/20 text-center py-1">
          <p className="text-xs text-red-300 font-bold animate-pulse">
            ⚠️ {isPast ? "Past code freeze!" : "Code freeze imminent — wrap up NOW!"}
          </p>
        </div>
      )}
    </footer>
  );
}
