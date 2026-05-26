"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, CheckCircle, Cpu } from "lucide-react";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "@/components/ui/primitives";

const API = "http://localhost:4000/api/v1";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("Invalid reset link."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setError(data.error || "Reset failed. The link may have expired.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative">
      <NeuralPulse size="sm" className="absolute top-6 right-6 opacity-80" label="LOCK STATE" />

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            className="text-center py-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Password updated</h2>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">Redirecting you to the authentication gate…</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
                  Cryptographic Key
                </p>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
                Set Password
              </h1>
              <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-sans">
                Establish new security clearance values for your profile.
              </p>
            </div>

            {/* Error overlay */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-start gap-2.5 bg-red-950/30 border border-red-900/40 text-red-400 p-3.5 rounded-xl mb-6 text-xs font-mono"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!token ? (
              <div className="text-center py-4">
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed font-sans">
                  The recovery key provided is invalid or has reached its expiration TTL threshold.
                </p>
                <Link href="/forgot-password" className="block">
                  <InteractiveButton variant="glow" className="w-full py-3 rounded-xl border border-zinc-800 text-zinc-300 text-xs">
                    Request New Key →
                  </InteractiveButton>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                    New Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 pr-10 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 font-mono transition-colors"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <InteractiveButton type="submit" disabled={isLoading} className="w-full py-3 bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs">
                  {isLoading ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-950 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    "Deploy New Password"
                  )}
                </InteractiveButton>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SpatialPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030303]">
      {/* Background radial glow */}
      <AmbientGlow size="lg" color="mixed" opacity={0.65} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <Suspense
          fallback={
            <SpatialPanel glow className="p-8 border-zinc-800 bg-zinc-950/40 text-center">
              <div className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-300 rounded-full mx-auto mb-4 animate-spin" />
              <p className="text-zinc-500 text-sm">Validating recovery key integrity…</p>
            </SpatialPanel>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
