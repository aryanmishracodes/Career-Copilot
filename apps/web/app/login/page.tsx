"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, ArrowRight, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SpatialPanel, InteractiveButton, AmbientGlow, NeuralPulse } from "@/components/ui/primitives";

const API = "http://localhost:4000/api/v1";

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function getGoogleOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/auth/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function getGithubOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
    redirect_uri: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/auth/oauth/github/callback`,
    scope: "user:email",
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const oauthErrorMsg = oauthError === "oauth_failed"
    ? "OAuth sign-in failed. Please try again."
    : oauthError === "no_email"
    ? "Could not retrieve your email from GitHub. Please use email sign-in."
    : null;

  return (
    <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative">
      {/* Active Neural AI Heartbeat Pulse */}
      <NeuralPulse size="sm" className="absolute top-6 right-6 opacity-80" label="AI ACTIVE" />

      {/* Form Brand Header */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono">
            Career Copilot OS
          </p>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
          Sign In
        </h1>
        <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-sans">
          Deploy your credentials to access the next-generation career intelligence platform.
        </p>
      </div>

      {/* Errors overlay */}
      <AnimatePresence mode="wait">
        {(oauthErrorMsg || error) && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="flex items-start gap-2.5 bg-red-950/30 border border-red-900/40 text-red-400 p-3.5 rounded-xl mb-6 text-xs font-mono"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{oauthErrorMsg || error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OAuth options */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <a href={getGoogleOAuthUrl()} className="block">
          <InteractiveButton variant="glow" type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800/60 bg-zinc-950/50 text-zinc-300 hover:text-white hover:border-zinc-700 font-sans transition-all text-xs">
            <GoogleIcon />
            <span>Google</span>
          </InteractiveButton>
        </a>
        <a href={getGithubOAuthUrl()} className="block">
          <InteractiveButton variant="glow" type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800/60 bg-zinc-950/50 text-zinc-300 hover:text-white hover:border-zinc-700 font-sans transition-all text-xs">
            <GitHubIcon />
            <span>GitHub</span>
          </InteractiveButton>
        </a>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="flex-1 h-[1px] bg-zinc-800/50" />
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">or sign in with email</span>
        <div className="flex-1 h-[1px] bg-zinc-800/50" />
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
            Email Address
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">
              Password
            </label>
            <Link href="/forgot-password" className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest font-mono">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 pr-10 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 font-mono transition-colors"
              placeholder="••••••••"
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

        {/* Submit */}
        <div className="pt-2">
          <InteractiveButton type="submit" disabled={isLoading} className="w-full py-3 bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs">
            {isLoading ? (
              <motion.div
                className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-950 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                <span>Deploy Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </InteractiveButton>
        </div>
      </form>

      {/* Footer Account creation */}
      <p className="mt-8 text-center text-xs text-zinc-600 font-sans">
        Don't have an account?{" "}
        <Link href="/register" className="text-zinc-400 hover:text-zinc-200 transition-colors font-medium underline underline-offset-4">
          Create account
        </Link>
      </p>
    </SpatialPanel>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-[#030303]">
      {/* Background Backplates */}
      <AmbientGlow size="lg" color="mixed" opacity={0.65} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <AmbientGlow size="md" color="violet" opacity={0.25} className="-top-12 -right-12" />

      {/* Centered Panel wrapped in Suspense */}
      <motion.div
        className="w-full max-w-md relative z-10 group"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <Suspense
          fallback={
            <SpatialPanel glow className="p-8 border-zinc-800 bg-zinc-950/40 text-center">
              <div className="w-10 h-10 border-2 border-zinc-700 border-t-zinc-300 rounded-full mx-auto mb-4 animate-spin" />
              <p className="text-zinc-500 text-sm">Deploying active credentials handler…</p>
            </SpatialPanel>
          }
        >
          <LoginForm />
        </Suspense>
      </motion.div>

      {/* ── Center Bottom Feature row (micro-spatial layout) ── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl w-full mt-10 relative z-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        {[
          { label: "ATS Score Analysis", desc: "6-dimension screening report" },
          { label: "Recruiter Simulation", desc: "Shortlist probability feedback" },
          { label: "Live Market Matching", desc: "AI skill-ranked vacancies" },
          { label: "Adaptive Mock Interviews", desc: "Resume-calibrated responses" },
        ].map((item, i) => (
          <SpatialPanel key={item.label} glow className="p-3 text-center bg-zinc-950/20 border-zinc-900/60 rounded-xl relative overflow-hidden group">
            <p className="text-[10px] font-bold text-zinc-300 font-display leading-tight truncate">{item.label}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5 leading-snug">{item.desc}</p>
          </SpatialPanel>
        ))}
      </motion.div>
    </div>
  );
}
