import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, Zap, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toast: showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((t) => {
          let borderCls = "border-cyan-500/40 bg-slate-900/95 text-cyan-200";
          let Icon = Zap;
          if (t.type === "success") {
            borderCls = "border-emerald-500/40 bg-slate-900/95 text-emerald-200";
            Icon = CheckCircle2;
          } else if (t.type === "error" || t.type === "warning") {
            borderCls = "border-amber-500/40 bg-slate-900/95 text-amber-200";
            Icon = AlertCircle;
          } else if (t.type === "info") {
            borderCls = "border-cyan-500/40 bg-slate-900/95 text-cyan-200";
            Icon = Info;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-xl backdrop-blur-md text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${borderCls}`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1 font-medium">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log("[Toast]", msg), toast: (msg) => console.log("[Toast]", msg) };
  }
  return context;
}
