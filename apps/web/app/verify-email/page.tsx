"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "@/components/ui/primitives";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1`;

function VerifyEmailForm() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    fetch(`${API}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          login(data.token, data.user);
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  return (
    <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] text-center relative">
      {status === "loading" && (
        <div className="py-4">
          <NeuralPulse size="md" className="justify-center mb-6" />
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Cpu className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
            <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
              Integrity Audit
            </p>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Verifying Email</h2>
          <p className="text-zinc-400 text-sm font-sans leading-relaxed">
            Running cryptographic handshake routines. Just a moment…
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="py-4">
          <motion.div
            className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900 flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </motion.div>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase font-mono">
              Verification Success
            </p>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Email Verified</h2>
          <p className="text-zinc-400 text-sm font-sans leading-relaxed">
            Cryptographic signatures matched. Taking you to your dashboard…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-900 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Cpu className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] font-bold tracking-widest text-red-500 uppercase font-mono">
              Handshake Failed
            </p>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Verification Failed</h2>
          <p className="text-zinc-400 text-sm mb-8 font-sans leading-relaxed">{message}</p>
          <Link href="/login" className="block">
            <InteractiveButton variant="glow" className="w-full py-3 rounded-xl border border-zinc-800 text-zinc-300 text-xs">
              Back to sign in →
            </InteractiveButton>
          </Link>
        </div>
      )}
    </SpatialPanel>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030303]">
      {/* Background glow backplate */}
      <AmbientGlow size="lg" color="mixed" opacity={0.6} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

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
              <p className="text-zinc-500 text-sm">Initializing cryptographic handshake audits…</p>
            </SpatialPanel>
          }
        >
          <VerifyEmailForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
