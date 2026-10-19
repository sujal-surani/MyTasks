import { useState, useEffect, useRef } from "react";

// ─── Local Timer Hook ──────────────────────────────────────────────────────────
// Runs the sprint countdown locally to prevent writing to Firestore every second.
// Syncs to Firestore every SYNC_INTERVAL ticks (≈10 s) and on stop/finish.
const SYNC_INTERVAL = 10;

export function useLocalTimer(remoteTimerState = {}, updateData) {
  const [localTimeLeft, setLocalTimeLeft] = useState(remoteTimerState?.timeLeft ?? 2700);
  const tickCount = useRef(0);
  const intervalRef = useRef(null);

  // Sync when remote timer state changes (e.g., another device changes the timer)
  useEffect(() => {
    if (typeof remoteTimerState?.timeLeft === "number") {
      setLocalTimeLeft(remoteTimerState.timeLeft);
    }
  }, [remoteTimerState?.timeLeft]);

  // Start / stop local interval based on remote running flags
  useEffect(() => {
    const active = Boolean(
      remoteTimerState?.isRunning && !remoteTimerState?.isPausedForErrand
    );

    if (active) {
      tickCount.current = 0;
      intervalRef.current = setInterval(() => {
        setLocalTimeLeft((prev) => {
          const next = Math.max(0, prev - 1);
          tickCount.current += 1;

          const finished = next === 0;
          const shouldSync = finished || tickCount.current % SYNC_INTERVAL === 0;

          if (shouldSync) {
            updateData({
              "timerState.timeLeft": next,
              ...(finished ? { "timerState.isRunning": false } : {}),
            });
            tickCount.current = 0;
          }

          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [remoteTimerState?.isRunning, remoteTimerState?.isPausedForErrand, updateData]);

  return localTimeLeft;
}
