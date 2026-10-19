import { useState } from "react";
import { Lock, Eye, EyeOff, Zap } from "lucide-react";
import { twMerge } from "tailwind-merge";

const CORRECT_PIN = "1234"; // Change this to your preferred PIN
const TOKEN_KEY = "cmd_center_auth_v1";

export function checkAuth() {
  return localStorage.getItem(TOKEN_KEY) === "authenticated";
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}

export default function PinGate({ onAuthenticated }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 100);
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const verifyPin = (enteredPin) => {
    if (enteredPin === CORRECT_PIN) {
      localStorage.setItem(TOKEN_KEY, "authenticated");
      onAuthenticated();
    } else {
      setShake(true);
      setError("Incorrect PIN. Try again.");
      setPin("");
      setTimeout(() => setShake(false), 600);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div
        className={twMerge(
          "relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-black/50",
          shake && "animate-shake"
        )}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl mb-4">
            <Zap size={28} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dots display */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={twMerge(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                i < pin.length
                  ? "bg-cyan-400 border-cyan-400 scale-110"
                  : "bg-transparent border-slate-600"
              )}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-center text-red-400 text-sm mb-4 font-medium">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit, i) => {
            if (digit === "") return <div key={i} />;

            const isBackspace = digit === "⌫";
            return (
              <button
                key={i}
                onClick={() => (isBackspace ? handleBackspace() : handleDigit(digit))}
                className={twMerge(
                  "h-14 rounded-2xl text-lg font-bold transition-all duration-150",
                  "active:scale-95 hover:scale-[1.03]",
                  isBackspace
                    ? "bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-white"
                    : "bg-slate-700/40 text-white hover:bg-slate-600/60 active:bg-cyan-500/20 border border-slate-600/30 hover:border-slate-500"
                )}
              >
                {digit}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Lock size={10} className="inline mr-1" />
          Personal Command Center — PIN protected
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
