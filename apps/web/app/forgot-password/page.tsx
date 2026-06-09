"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle, Cpu } from "lucide-react";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "@/components/ui/primitives";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030303]">
      {/* Ambient backplate */}
      <AmbientGlow size="lg" color="mixed" opacity={0.6} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        {/* Back Link */}
        <Link href="/login">
          <motion.div
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 cursor-pointer font-mono"
            whileHover={{ x: -2 }}
            transition={{ duration: 0.15 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </motion.div>
        </Link>

        {/* Spatial Card */}
        <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative">
          
          <NeuralPulse size="sm" className="absolute top-6 right-6 opacity-80" label="SECURE" />

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                className="text-center py-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Check your email</h2>
                <p className="text-zinc-400 text-sm leading-relaxed font-sans">
                  If an account exists for <span className="text-zinc-200 font-semibold">{email}</span>, we've dispatched a recovery link. It remains valid for 1 hour.
                </p>
                <p className="text-xs text-zinc-600 mt-6 font-sans">
                  Check your spam folders if the alert does not arrive shortly.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
                      Security Terminal
                    </p>
                  </div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
                    Reset Password
                  </h1>
                  <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-sans">
                    Request an atomic recovery link to restore session clearance.
                  </p>
                </div>

                {/* Form Errors */}
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

                {/* Recovery Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 font-mono transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <InteractiveButton type="submit" disabled={isLoading} className="w-full py-3 bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs">
                    {isLoading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-950 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      "Send Recovery Link"
                    )}
                  </InteractiveButton>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </SpatialPanel>
      </motion.div>
    </div>
  );
}
