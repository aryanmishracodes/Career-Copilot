"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle, Cpu } from "lucide-react";
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

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const strength = password ? passwordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        if (data.requiresVerification) {
          setRegistered(true);
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Post-registration verification prompt ──
  if (registered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#030303]">
        <AmbientGlow size="lg" color="mixed" opacity={0.55} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        >
          <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] text-center">
            <motion.div
              className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900 flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 28 }}
            >
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-3">Check your email</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-sans">
              We sent a verification link to <span className="text-zinc-200 font-semibold">{email}</span>.<br />
              Click the link to activate your account.
            </p>
            
            <div className="text-xs text-zinc-500 mb-8 leading-relaxed font-sans">
              Didn't receive it? Check your spam folder, or{" "}
              <button
                onClick={async () => {
                  const token = localStorage.getItem("token");
                  if (!token) return;
                  await fetch(`${API}/auth/resend-verification`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                }}
                className="text-zinc-300 hover:text-white transition-colors underline underline-offset-4"
              >
                resend the email
              </button>
            </div>
            
            <InteractiveButton variant="glow" onClick={() => router.push("/dashboard")} className="w-full py-3 rounded-xl font-semibold border border-zinc-800 text-zinc-300 text-xs">
              Continue to dashboard →
            </InteractiveButton>
          </SpatialPanel>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-[#030303]">
      {/* Background Backplates */}
      <AmbientGlow size="lg" color="mixed" opacity={0.65} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <AmbientGlow size="md" color="indigo" opacity={0.2} className="-bottom-12 -left-12" />

      {/* Main Centered Spatial Panel */}
      <motion.div
        className="w-full max-w-md relative z-10 group"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <SpatialPanel glow className="p-8 md:p-10 border-zinc-800/80 bg-zinc-950/40 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative">
          
          {/* Neural Heartbeat AI Pulse */}
          <NeuralPulse size="sm" className="absolute top-6 right-6 opacity-80" label="AI READY" />

          {/* Form Brand Header */}
          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-0.5 font-mono">
                Career Copilot OS
              </p>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
              Create Account
            </h1>
            <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-sans">
              Initialize a free intelligence profile to analyze your resume and match vacanies.
            </p>
          </div>

          {/* Errors overlay */}
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
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">or sign up with email</span>
            <div className="flex-1 h-[1px] bg-zinc-800/50" />
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                Full Name
              </label>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 font-mono transition-colors"
                placeholder="Alex Chen"
              />
            </div>

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
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                Password
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
              
              {/* Password strength bar */}
              {strength && (
                <motion.div
                  className="mt-2.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                          i <= strength.score ? strength.color : "bg-zinc-800/80"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                    strength.label === "Strong" ? "text-emerald-400" :
                    strength.label === "Good" ? "text-blue-400" :
                    strength.label === "Fair" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {strength.label} Strength
                  </p>
                </motion.div>
              )}
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
                    <span>Initialize Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </InteractiveButton>
            </div>
          </form>

          {/* Footer Account creation */}
          <p className="mt-8 text-center text-xs text-zinc-600 font-sans">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors font-medium underline underline-offset-4">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-[9px] text-zinc-700 leading-relaxed font-sans">
            By initializing an account, you accept our <span className="text-zinc-600">Terms of Service</span> and <span className="text-zinc-600">Privacy Policy</span>.
          </p>
        </SpatialPanel>
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
